import s3Service from './s3-service';
import settingService from './setting-service';
import kvObjService from './kv-obj-service';
import { safeObjectMetadata, safeObjectHeaders } from '../utils/object-policy';
import locations from './object-location-service';
import {hasS3Config,storageKey} from './storage-config-service';

const r2Service = {

	async storageType(c) {

		const setting = await settingService.query(c);
		const { bucket, endpoint, s3AccessKey, s3SecretKey } = setting;
		if(setting.attachmentStorage&&setting.attachmentStorage!=='auto'){
			if(setting.attachmentStorage==='R2'&&!c.env.r2)throw new Error('R2 storage is not bound');
			if(setting.attachmentStorage==='S3'&&!hasS3Config(setting))throw new Error('S3 storage is not configured');
			return setting.attachmentStorage;
		}

		if (!!(bucket && endpoint && s3AccessKey && s3SecretKey)) {
			return 'S3';
		}

		if (c.env.r2) {
			return 'R2';
		}

		return 'KV';
	},

	async putObj(c, key, content, metadata) {
		// Persist safe types/dispositions even when objects are accessed through a storage domain.
		metadata = safeObjectMetadata(content, key, metadata);

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
			const physicalKey=storageKey(await settingService.query(c),key);
			await s3Service.putObj(c, physicalKey, content, metadata);
			await locations.record(c,key,'S3',physicalKey);
		}else{
			await locations.record(c,key,storageType,key);
		}

	},

	/**
	 * 按当前实际存储类型读取对象，读不到返回 null
	 * 之前这里固定读 KV，R2/S3 存储下会返回空内容，导致图片和附件变成 0 字节
	 */
	async getObj(c, key) {
		const candidates=await this.candidates(c,key),seen=new Set();
		for(const {backend,physicalKey} of candidates){
			const id=backend+':'+physicalKey;if(seen.has(id))continue;seen.add(id);
			const obj=await this.read(c,backend,physicalKey);if(obj)return obj;
		}
		return null;
	},
	async candidates(c,key){
		const stored=await locations.list(c,key),setting=await settingService.query(c),active=await this.storageType(c);
		return this.candidateList(c,key,stored,setting,active);
	},
	candidateList(c,key,stored,setting,active){
		const candidates=[...stored];
		// Untracked historical objects usually live in the original bound R2 bucket.
		if(c.env.r2)candidates.push({backend:'R2',physicalKey:key});
		candidates.push({backend:active,physicalKey:active==='S3'?storageKey(setting,key):key});
		if(hasS3Config(setting))candidates.push({backend:'S3',physicalKey:storageKey(setting,key)},{backend:'S3',physicalKey:key});
		if(c.env.kv)candidates.push({backend:'KV',physicalKey:key});
		return candidates.filter(item=>item.backend==='R2'?!!c.env.r2:item.backend==='S3'?hasS3Config(setting):item.backend==='KV'&&!!c.env.kv);
	},
	async read(c,backend,key){
		if(backend==='KV')return kvObjService.getObj(c,key);
		if(backend==='S3')return s3Service.getObj(c,key);
		const obj=await c.env.r2.get(key);
		return obj?{buff:await obj.arrayBuffer(),contentType:obj.httpMetadata?.contentType,contentDisposition:obj.httpMetadata?.contentDisposition,cacheControl:obj.httpMetadata?.cacheControl}:null;
	},

	async toObjResp(c, key) {

		const obj = await this.getObj(c, key);

		if (!obj) {
			return new Response('Not Found', { status: 404 });
		}

		// Recheck on every read: historical objects still contain sender-controlled metadata.
		const headers = safeObjectHeaders(obj.buff, key, obj);

		return new Response(obj.buff, { headers });
	},

	async delete(c, key) {
		const grouped={KV:new Set(),R2:new Set(),S3:new Set()},keys=Array.isArray(key)?key:[key];
		if(!keys.length)return;
		const setting=await settingService.query(c),active=await this.storageType(c),stored=await locations.listMany(c,keys),byKey=new Map();
		for(const row of stored){if(!byKey.has(row.logicalKey))byKey.set(row.logicalKey,[]);byKey.get(row.logicalKey).push(row);}
		for(const logicalKey of keys)for(const item of this.candidateList(c,logicalKey,byKey.get(logicalKey)||[],setting,active))grouped[item.backend].add(item.physicalKey);
		if(grouped.KV.size)await kvObjService.deleteObj(c,[...grouped.KV]);
		if(grouped.R2.size)await c.env.r2.delete([...grouped.R2]);
		if(grouped.S3.size)await s3Service.deleteObj(c,[...grouped.S3]);
		await locations.forgetMany(c,keys);
	}

};
export default r2Service;
