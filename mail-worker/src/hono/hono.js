import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result';
import { cors } from 'hono/cors';

app.use('*', cors({
	origin: '*',
	allowHeaders: ['Content-Type', 'Authorization', 'accept-language', 'x-admin-auth'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	credentials: false,
	maxAge: 86400,
}));

app.onError((err, c) => {
	if (err.name === 'BizError') {
		console.log(err.message);
	} else {
		console.error(err);
	}

	if (err.message === `Cannot read properties of undefined (reading 'get')`) {
		return c.json(result.fail('KV数据库未绑定 KV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'put')`) {
		return c.json(result.fail('KV数据库未绑定 KV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
		return c.json(result.fail('D1数据库未绑定 D1 database not bound',502));
	}

	// 只回显业务异常文案，其余（D1/运行时错误等）统一兜底，避免泄露后端细节
	if (err.name === 'BizError') {
		return c.json(result.fail(err.message, err.code));
	}

	return c.json(result.fail('服务异常，请稍后重试 Service error, please try again later', 500));
});

export default app;


