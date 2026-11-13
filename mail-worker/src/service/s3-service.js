import { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import settingService from './setting-service';
import domainUtils from '../utils/domain-uitls';
import { settingConst } from '../const/entity-const';
import BizError from '../error/biz-error';
import {normalizeStoragePrefix,validateS3Config,storageKey} from './storage-config-service';
const s3Service = {

	async putObj(c, key, content, metadata) {

		const client = await this.client(c);

		const { bucket } = await settingService.query(c);

		let obj = { Bucket: bucket, Key: key, Body: content,
			CacheControl: metadata.cacheControl
		}

		if (metadata.cacheControl) {
			obj.CacheControl = metadata.cacheControl
		}

		if (metadata.contentDisposition) {
			obj.ContentDisposition = metadata.contentDisposition
		}

		if (metadata.contentType) {
			obj.ContentType = metadata.contentType
		}

		await client.send(new PutObjectCommand(obj))
	},

	async getObj(c, key) {

		const client = await this.client(c);
		const { bucket } = await settingService.query(c);

		try {

			const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

			return {
				buff: await result.Body.transformToByteArray(),
				contentType: result.ContentType,
				contentDisposition: result.ContentDisposition,
				cacheControl: result.CacheControl
			};

		} catch (e) {
			if(e?.name==='NoSuchKey'||(e?.$metadata?.httpStatusCode===404&&e?.name!=='NoSuchBucket'))return null;
			throw e;
		}

	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}
		if(keys.length>1000){for(let i=0;i<keys.length;i+=1000)await this.deleteObj(c,keys.slice(i,i+1000));return;}

		const client = await this.client(c);
		const { bucket } = await settingService.query(c);


		client.middlewareStack.add(
			(next) => async (args) => {

				const body = args.request.body

				// 计算 MD5 校验和并转换为 Base64 编码
				const encoder = new TextEncoder();
				const data = encoder.encode(body);

				// 使用 Web Crypto API 计算 MD5 校验和
				const hashBuffer = await crypto.subtle.digest('MD5', data);
				const hashArray = new Uint8Array(hashBuffer);
				const contentMD5 = btoa(String.fromCharCode.apply(null, hashArray));

				args.request.headers["Content-MD5"] = contentMD5;

				return next(args);
			},
			{ step: "build", name: "inspectRequestMiddleware" }
		);


		const result=await client.send(
			new DeleteObjectsCommand({
				Bucket: bucket,
				Delete: {
					Objects: keys.map(key => ({ Key: key }))
				}
			})
		);
		if(result.Errors?.length)throw new BizError('部分 S3 文件删除失败，请检查删除权限后重试',502);
	},


	async client(c, draft) {
		const { region, endpoint, s3AccessKey, s3SecretKey, forcePathStyle } = draft || await settingService.query(c);
		return new S3Client({
			region: region || 'auto',
			endpoint: domainUtils.toOssDomain(endpoint),
			forcePathStyle: forcePathStyle === settingConst.forcePathStyle.OPEN,
			requestChecksumCalculation:'WHEN_REQUIRED',
			credentials: {
				accessKeyId: s3AccessKey,
				secretAccessKey: s3SecretKey,
			}
		});
	},
	async testConnection(c,draft) {
		if(!draft||typeof draft!=='object'||Array.isArray(draft))throw new BizError('S3 配置格式不正确',400);
		for(const key of ['bucket','endpoint','region','s3Prefix','s3AccessKey','s3SecretKey'])if(draft[key]!==undefined&&typeof draft[key]!=='string')throw new BizError('S3 配置格式不正确',400);
		const current=await settingService.query(c);
		const candidate={bucket:draft.bucket?.trim(),endpoint:draft.endpoint?.trim(),region:draft.region?.trim()||'auto',forcePathStyle:draft.forcePathStyle,
			s3Prefix:normalizeStoragePrefix(draft.s3Prefix||''),s3AccessKey:draft.s3AccessKey?.trim()||current.s3AccessKey,s3SecretKey:draft.s3SecretKey?.trim()||current.s3SecretKey};
		validateS3Config(candidate);
		const client=await this.client(c,candidate),key=storageKey(candidate,'.xi-mail-test/'+crypto.randomUUID());
		const body=new TextEncoder().encode('Xi-Mail storage connectivity test '+crypto.randomUUID());
		const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
		let uploaded=false,deleted=false,stage='写入',failure,versionId;
		try{
			const written=await client.send(new PutObjectCommand({Bucket:candidate.bucket,Key:key,Body:body,ContentType:'application/octet-stream'}),{abortSignal:controller.signal});uploaded=true;versionId=written.VersionId;
			stage='读取';const result=await client.send(new GetObjectCommand({Bucket:candidate.bucket,Key:key,VersionId:versionId}),{abortSignal:controller.signal});
			const received=await result.Body.transformToByteArray();
			if(received.length!==body.length||received.some((value,index)=>value!==body[index]))throw new Error('ContentMismatch');
			stage='删除';await client.send(new DeleteObjectCommand({Bucket:candidate.bucket,Key:key,VersionId:versionId}),{abortSignal:controller.signal});deleted=true;
		}catch(error){failure=error;}
		finally{
			clearTimeout(timer);
			if(!deleted){try{await client.send(new DeleteObjectCommand({Bucket:candidate.bucket,Key:key,VersionId:versionId}),{abortSignal:AbortSignal.timeout(3000)});deleted=true;}catch{}}
			client.destroy?.();
		}
		if(failure){
			const reasons={AccessDenied:'访问被拒绝，请检查桶权限',InvalidAccessKeyId:'Access Key ID 无效',SignatureDoesNotMatch:'签名不匹配，请检查密钥、区域和寻址方式',NoSuchBucket:'存储桶不存在',AbortError:'请求超时',TimeoutError:'请求超时'};
			throw new BizError(`S3 ${stage}测试失败：${reasons[failure.name]||'请检查服务地址、网络和访问配置'}${uploaded&&!deleted?'；测试文件未能清理，请检查删除权限':''}`,502);
		}
		return{write:true,read:true,delete:true};
	},
}

export default s3Service
