import app from '../hono/hono';
import accountTransferService from '../service/account-transfer-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.post('/transfer/create', async (c) => {
    const userId = userContext.getUserId(c);
    await accountTransferService.create(c, await c.req.json(), userId);
    return c.json(result.ok());
});

app.put('/transfer/accept', async (c) => {
    const userId = userContext.getUserId(c);
    await accountTransferService.accept(c, (await c.req.json()).transferId, userId);
    return c.json(result.ok());
});

app.put('/transfer/reject', async (c) => {
    const userId = userContext.getUserId(c);
    await accountTransferService.reject(c, (await c.req.json()).transferId, userId);
    return c.json(result.ok());
});

app.get('/transfer/pending', async (c) => {
    const userId = userContext.getUserId(c);
    const data = await accountTransferService.pendingList(c, userId);
    return c.json(result.ok(data));
});

app.get('/transfer/sent', async (c) => {
    const userId = userContext.getUserId(c);
    const data = await accountTransferService.sentList(c, userId);
    return c.json(result.ok(data));
});

app.get('/transfer/received-history', async (c) => {
    const userId = userContext.getUserId(c);
    const data = await accountTransferService.receivedHistoryList(c, userId);
    return c.json(result.ok(data));
});
