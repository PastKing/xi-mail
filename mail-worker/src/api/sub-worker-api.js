import app from '../hono/hono';
import result from '../model/result';
import orm from '../entity/orm';
import subWorker from '../entity/sub-worker';
import { eq } from 'drizzle-orm';
import settingService from '../service/setting-service';
import { parseDomains } from '../service/sub-worker-service';

async function fetchDomains(url, apiToken) {
	try {
		const res = await fetch(url + '/api/info', {
			headers: { 'x-api-token': apiToken },
			signal: AbortSignal.timeout(10000),
		});
		const data = await res.json();
		if (data?.code === 200) {
			return parseDomains(data.data?.domains);
		}
	} catch {}
	return null;
}

app.get('/sub-worker/list', async (c) => {
	const rows = await orm(c).select().from(subWorker).all();
	const list = rows.map(r => ({
		...r,
		domains: parseDomains(r.domains),
		apiToken: '••••••••',
	}));
	return c.json(result.ok(list));
});

app.post('/sub-worker/add', async (c) => {
	const { name, url, apiToken } = await c.req.json();
	if (!name || !url || !apiToken) {
		return c.json(result.fail('name, url, apiToken are required'));
	}
	const normalized = url.replace(/\/+$/, '');

	const domains = await fetchDomains(normalized, apiToken) || [];

	const row = await orm(c).insert(subWorker).values({
		name,
		url: normalized,
		apiToken,
		domains: JSON.stringify(domains),
	}).returning().get();

	await settingService.refresh(c);
	return c.json(result.ok({ ...row, domains, apiToken: '••••••••' }));
});

app.post('/sub-worker/test', async (c) => {
	const { url, apiToken } = await c.req.json();
	if (!url || !apiToken) {
		return c.json(result.fail('url, apiToken are required'));
	}
	const normalized = url.replace(/\/+$/, '');
	try {
		const res = await fetch(normalized + '/api/info', {
			headers: { 'x-api-token': apiToken },
			signal: AbortSignal.timeout(10000),
		});
		const data = await res.json();
		if (data?.code === 200) {
			return c.json(result.ok(data.data));
		}
		return c.json(result.fail('Server responded with error'));
	} catch (e) {
		return c.json(result.fail('Connection failed: ' + e.message));
	}
});

app.put('/sub-worker/:id', async (c) => {
	const id = parseInt(c.req.param('id'));
	const body = await c.req.json();
	const patch = {};
	if (body.name) patch.name = body.name;
	if (body.url) patch.url = body.url.replace(/\/+$/, '');
	if (body.apiToken) patch.apiToken = body.apiToken;

	// 每次保存都重新读取子 Worker 域名，子 Worker 改了域名后在这里点保存即可同步
	const row = await orm(c).select().from(subWorker).where(eq(subWorker.id, id)).get();
	if (row) {
		const domains = await fetchDomains(patch.url || row.url, patch.apiToken || row.apiToken);
		if (domains) {
			patch.domains = JSON.stringify(domains);
		}
	}

	if (Object.keys(patch).length > 0) {
		await orm(c).update(subWorker).set(patch).where(eq(subWorker.id, id)).run();
	}
	await settingService.refresh(c);
	return c.json(result.ok());
});

app.delete('/sub-worker/:id', async (c) => {
	const id = parseInt(c.req.param('id'));
	await orm(c).delete(subWorker).where(eq(subWorker.id, id)).run();
	await settingService.refresh(c);
	return c.json(result.ok());
});

app.put('/sub-worker/:id/status', async (c) => {
	const id = parseInt(c.req.param('id'));
	const { status } = await c.req.json();
	await orm(c).update(subWorker).set({ status: status ? 1 : 0 }).where(eq(subWorker.id, id)).run();
	await settingService.refresh(c);
	return c.json(result.ok());
});

app.get('/sub-worker/:id/mails', async (c) => {
	const id = parseInt(c.req.param('id'));
	const row = await orm(c).select().from(subWorker).where(eq(subWorker.id, id)).get();
	if (!row || !row.status) {
		return c.json(result.fail('Sub-worker not found or disabled'));
	}

	const qs = new URL(c.req.url).search;
	try {
		const res = await fetch(row.url + '/api/mails' + qs, {
			headers: { 'x-api-token': row.apiToken },
			signal: AbortSignal.timeout(15000),
		});
		const data = await res.json();
		return c.json(result.ok(data?.data || data));
	} catch (e) {
		return c.json(result.fail('Proxy failed: ' + e.message));
	}
});

app.get('/sub-worker/:id/mail/:mailId', async (c) => {
	const id = parseInt(c.req.param('id'));
	const mailId = c.req.param('mailId');
	const row = await orm(c).select().from(subWorker).where(eq(subWorker.id, id)).get();
	if (!row || !row.status) {
		return c.json(result.fail('Sub-worker not found or disabled'));
	}

	try {
		const res = await fetch(row.url + '/api/mail/' + mailId, {
			headers: { 'x-api-token': row.apiToken },
			signal: AbortSignal.timeout(15000),
		});
		const data = await res.json();
		return c.json(result.ok(data?.data || data));
	} catch (e) {
		return c.json(result.fail('Proxy failed: ' + e.message));
	}
});
