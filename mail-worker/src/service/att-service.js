import orm from '../entity/orm';
import { att } from '../entity/att';
import { and, eq, isNull, inArray, desc } from 'drizzle-orm';
import r2Service from './r2-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { attConst } from '../const/entity-const';
import { parseHTML } from 'linkedom';
import { v4 as uuidv4 } from 'uuid';
import domainUtils from '../utils/domain-uitls';
import settingService from "./setting-service";

const attService = {

	async addAtt(c, attachments) {

		for (let attachment of attachments) {

			let metadate = {
				contentType: attachment.mimeType,
			}

			if (!attachment.contentId) {
				metadate.contentDisposition = `attachment;filename=${attachment.filename}`
			} else {
				metadate.contentDisposition = `inline;filename=${attachment.filename}`
				metadate.cacheControl = `max-age=259200`
			}

			await r2Service.putObj(c, attachment.key, attachment.content, metadate);

		}

		await orm(c).insert(att).values(attachments).run();
	},

	list(c, params, userId) {
		const { emailId } = params;

		return orm(c).select().from(att).where(
			and(
				eq(att.emailId, emailId),
				eq(att.userId, userId),
				eq(att.type, attConst.type.ATT),
				isNull(att.contentId)
			)
		).all();
	},

	async toImageUrlHtml(c, content) {

		const { r2Domain } = await settingService.query(c);

		const { document } = parseHTML(content);

		const images = Array.from(document.querySelectorAll('img'));

		let imageDataList = [];

		for (const img of images) {

			//邮件正文base64图片转cid附件
			const src = img.getAttribute('src');
			if (src && src.startsWith('data:image')) {
				const file = fileUtils.base64ToFile(src);
				const buff = await file.arrayBuffer();
				const cid = uuidv4().replace(/-/g, '');
				const key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(buff) + fileUtils.getExtFileName(file.name);

				img.setAttribute('src', 'cid:' + cid);

				const attData = {};
				attData.key = key;
				attData.filename = file.name;
				attData.mimeType = file.type;
				attData.size = file.size;
				attData.buff = buff;
				attData.content = fileUtils.base64ToDataStr(src);
				attData.contentId = cid;

				imageDataList.push(attData);
			}

			//邮件正文站内图片转cid附件
			const attKey = this.toAttKey(src, r2Domain);

			if (attKey) {

				const cid = uuidv4().replace(/-/g, '')
				img.setAttribute('src', 'cid:' + cid);

				const attData = {};
				attData.key = attKey;
				attData.contentId = cid;
				attData.type = attConst.type.EMBED;
				attData.inSite = true;
				attData.img = img;
				attData.srcBackup = src;
				imageDataList.push(attData);

			}

			const hasInlineWidth = img.hasAttribute('width');
			const style = img.getAttribute('style') || '';
			const hasStyleWidth = /(^|\s)width\s*:\s*[^;]+/.test(style);

			if (!hasInlineWidth && !hasStyleWidth) {
				const newStyle = (style ? style.trim().replace(/;$/, '') + '; ' : '') + 'max-width: 100%;';
				img.setAttribute('style', newStyle);
			}
		}

		//查询已有内嵌url图片信息
		const keys = [...new Set(imageDataList.filter(item => item.inSite).map(item => item.key))];
		const dbImageList  = await this.selectOneByKeys(c, keys);

		//设置给当前附件
		imageDataList.forEach(image => {
			dbImageList.forEach(dbImage => {
				if (image.inSite && (image.key === dbImage.key)) {
					image.filename = dbImage.filename;
					image.mimeType = dbImage.mimeType;
					image.contentType = dbImage.mimeType;
				}
			})
		})

		//站内图片直接从存储里取出真实字节当附件内容，不再让 resend 去远程拉取
		for (const image of imageDataList) {

			if (!image.inSite) {
				continue;
			}

			const obj = await r2Service.getObj(c, image.key);

			if (!obj) {
				continue;
			}

			image.content = fileUtils.arrayBufferToBase64(obj.buff);
			image.size = obj.buff.byteLength ?? obj.buff.length;
			image.mimeType = image.mimeType || obj.contentType;
			image.contentType = image.contentType || obj.contentType;
			image.filename = image.filename || image.key.split('/').pop();
		}

		//取不到内容的站内图片还原成原来的地址，避免正文留下无附件可用的 cid
		imageDataList.forEach(image => {
			if (image.inSite && !image.content) {
				image.img.setAttribute('src', image.srcBackup);
			}
		});

		imageDataList = imageDataList.filter(image => !image.inSite || image.content);

		imageDataList.forEach(image => {
			delete image.inSite;
			delete image.img;
			delete image.srcBackup;
		});

		return { imageDataList, html: document.toString() };
	},

	/**
	 * 站内图片地址转存储 key，非站内地址返回 null
	 * 同时兼容 https://域名/attachments/xxx、/attachments/xxx 和 attachments/xxx 三种写法
	 */
	toAttKey(src, r2Domain) {

		if (!src) {
			return null;
		}

		const ossDomain = domainUtils.toOssDomain(r2Domain);

		if (ossDomain && src.startsWith(ossDomain + '/')) {
			src = src.replace(ossDomain + '/', '');
		}

		if (src.startsWith('/')) {
			src = src.substring(1);
		}

		return src.startsWith(constant.ATTACHMENT_PREFIX) ? src : null;
	},

	async saveSendAtt(c, attList, userId, accountId, emailId) {

		const attDataList = [];

		for (let att of attList) {
			att.buff = fileUtils.base64ToUint8Array(att.content);
			att.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(att.buff) + fileUtils.getExtFileName(att.filename);
			const attData = { userId, accountId, emailId };
			attData.key = att.key;
			attData.size = att.buff.length;
			attData.filename = att.filename;
			attData.mimeType = att.type;
			attData.type = attConst.type.ATT;
			attDataList.push(attData);
		}

		await orm(c).insert(att).values(attDataList).run();

		for (let att of attList) {
			await r2Service.putObj(c, att.key, att.buff, {
				contentType: att.type,
				contentDisposition: `attachment;filename=${att.filename}`
			});
		}

	},

	async saveArticleAtt(c, attDataList, userId, accountId, emailId) {

		for (let attData of attDataList) {
			attData.userId = userId;
			attData.emailId = emailId;
			attData.accountId = accountId;
			attData.type = attConst.type.EMBED;
			delete attData.content;

			if (!attData.buff) {
				continue;
			}
			await r2Service.putObj(c, attData.key, attData.buff, {
				contentType: attData.mimeType,
				cacheControl: `max-age=259200`,
				contentDisposition: `inline;filename=${attData.filename}`
			});
			delete attData.buff;
		}

		await orm(c).insert(att).values(attDataList).run();

	},

	async removeByUserIds(c, userIds) {
		await this.removeAttByField(c, 'user_id', userIds);
	},

	async removeByEmailIds(c, emailIds) {
		await this.removeAttByField(c, 'email_id', emailIds);
	},

	selectByEmailIds(c, emailIds) {
		return orm(c).select().from(att).where(
			and(
				inArray(att.emailId, emailIds),
				eq(att.type, attConst.type.ATT)
			))
			.all();
	},

	async removeAttByField(c, fieldName, fieldValues) {

		const sqlList = [];

		fieldValues.forEach(value => {

			sqlList.push(

				c.env.db.prepare(
					`SELECT a.key, a.att_id
						FROM attachments a
							   JOIN (SELECT key
									 FROM attachments
									 GROUP BY key
									 HAVING COUNT (*) = 1) t
									ON a.key = t.key
						WHERE a.${fieldName} = ?;`
					).bind(value)
			)

			sqlList.push(c.env.db.prepare(`DELETE FROM attachments WHERE ${fieldName} = ?`).bind(value))

		});

		const attListResult = await c.env.db.batch(sqlList);

		const delKeyList = attListResult.flatMap(r => r.results ? r.results.map(row => row.key) : []);

		if (delKeyList.length > 0) {
			await this.batchDelete(c, delKeyList);
		}

	},

	async batchDelete(c, keys) {
		if (!keys.length) return;

		const BATCH_SIZE = 1000;

		for (let i = 0; i < keys.length; i += BATCH_SIZE) {
			const batch = keys.slice(i, i + BATCH_SIZE);
			await r2Service.delete(c, batch);
		}

	},

	async removeByAccountId(c, accountId) {
		await this.removeAttByField(c, "account_id", [accountId])
	},

	selectOneByKeys(c, keys) {
		if (!keys || keys.length === 0) {
			return []
		}
		return orm(c).select().from(att).where(inArray(att.key, keys)).orderBy(desc(att.attId)).groupBy(att.key).all();
	}
};

export default attService;
