import {isObjectKey} from '../utils/object-key-policy';
const kvObjService = {

	async putObj(c, key, content, metadata) {
		if(!isObjectKey(key))throw new Error('Invalid file key');
		await c.env.kv.put(key, content, { metadata: metadata });
	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}

		await Promise.all(keys.map( key => c.env.kv.delete(key)));
	},

	async getObj(c, key) {
		if(!isObjectKey(key))return null;

		const obj = await c.env.kv.getWithMetadata(key, { type: 'arrayBuffer' });

		if (!obj || obj.value === null) {
			return null;
		}

		return {
			buff: obj.value,
			contentType: obj.metadata?.contentType,
			contentDisposition: obj.metadata?.contentDisposition,
			cacheControl: obj.metadata?.cacheControl
		};

	}

};

export default kvObjService;
