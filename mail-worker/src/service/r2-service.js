import s3Service from './s3-service';
import settingService from './setting-service';
import kvObjService from './kv-obj-service';

const r2Service = {

	async storageType(c) {

		const setting = await settingService.query(c);
		const { bucket, endpoint, s3AccessKey, s3SecretKey } = setting;

		if (!!(bucket && endpoint && s3AccessKey && s3SecretKey)) {
			return 'S3';
		}

		if (c.env.r2) {
			return 'R2';
		}

		return 'KV';
	},

	async putObj(c, key, content, metadata) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.putObj(c, key, content, metadata);
		}

		if (storageType === 'R2') {
			await c.env.r2.put(key, content, {
				httpMetadata: { ...metadata }
			});
		}

		if (storageType === 'S3') {
			await s3Service.putObj(c, key, content, metadata);
		}

	},

	/**
	 * 按当前实际存储类型读取对象，读不到返回 null
	 * 之前这里固定读 KV，R2/S3 存储下会返回空内容，导致图片和附件变成 0 字节
	 */
	async getObj(c, key) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			return await kvObjService.getObj(c, key);
		}

		if (storageType === 'R2') {

			const obj = await c.env.r2.get(key);

			if (!obj) {
				return null;
			}

			return {
				buff: await obj.arrayBuffer(),
				contentType: obj.httpMetadata?.contentType,
				contentDisposition: obj.httpMetadata?.contentDisposition,
				cacheControl: obj.httpMetadata?.cacheControl
			};

		}

		return await s3Service.getObj(c, key);
	},

	async toObjResp(c, key) {

		const obj = await this.getObj(c, key);

		if (!obj) {
			return new Response('Not Found', { status: 404 });
		}

		const headers = { 'Content-Type': obj.contentType || 'application/octet-stream' };

		if (obj.contentDisposition) {
			headers['Content-Disposition'] = obj.contentDisposition;
		}

		if (obj.cacheControl) {
			headers['Cache-Control'] = obj.cacheControl;
		}

		return new Response(obj.buff, { headers });
	},

	async delete(c, key) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.deleteObj(c, key);
		}

		if (storageType === 'R2') {
			await c.env.r2.delete(key);
		}

		if (storageType === 'S3'){
			await s3Service.deleteObj(c, key);
		}

	}

};
export default r2Service;
