import r2Service from '../service/r2-service';
import app from '../hono/hono';
import attachmentAccess, {verifyAttachment} from '../service/attachment-access-service';
import outboundImage from '../service/outbound-image-service';

app.get('/attachment/sent/:token',async c=>{
	const key=await outboundImage.read(c,c.req.param('token'));
	if (!key) return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
	const response=await r2Service.toObjResp(c,key);
	response.headers.set('Cache-Control','no-store');
	return response;
});

app.get('/attachment/view', async c => {
	c.header('Cache-Control','no-store');
	const data=await verifyAttachment(c,c.req.query('access'));
	if (!data || !await attachmentAccess.find(c,data.key,data.userId,data)) return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
	const response=await r2Service.toObjResp(c,data.key);
	response.headers.set('Cache-Control','no-store');
	return response;
});

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	if (!await attachmentAccess.find(c,key,c.get('user').userId)) return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
	const response=await r2Service.toObjResp(c,key);
	response.headers.set('Cache-Control','no-store');
	return response;
});


