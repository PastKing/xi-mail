import BizError from '../error/biz-error';
import orm from '../entity/orm';
import accountTransfer from '../entity/account-transfer';
import account from '../entity/account';
import { eq, and, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { t } from '../i18n/i18n';
import userService from './user-service';
import roleService from './role-service';
import permService from './perm-service';

async function canTransfer(c, userId, permission) {
    const user = await userService.selectByIdIncludeDel(c, userId);
    return user && !user.isDel && !user.status && (user.email === c.env.admin
        || (await permService.userPermKeys(c, userId)).includes(permission));
}

async function isPrimaryAccount(c, userId, email) {
    const user = await userService.selectByIdIncludeDel(c, userId);
    return user?.email?.toLowerCase() === email?.toLowerCase();
}

const accountTransferService = {

    async create(c, params, fromUserId) {
        const { accountId, toDisplayId } = params;

        // Validate the account belongs to fromUserId
        const accountRow = await orm(c).select().from(account)
            .where(and(eq(account.accountId, accountId), eq(account.userId, fromUserId)))
            .get();

        if (!accountRow) {
            throw new BizError(t('accountNotFound'));
        }

        if (accountRow.isDel === 1) {
            throw new BizError(t('accountNotFound'));
        }

        if (await isPrimaryAccount(c, fromUserId, accountRow.email)) {
            throw new BizError(t('cannotTransferPrimaryAccount'));
        }

        // Find target user by displayId
        const toUser = await userService.selectByDisplayId(c, toDisplayId);
        if (!toUser) {
            throw new BizError(t('userNotFound'));
        }

        if (toUser.userId === fromUserId) {
            throw new BizError(t('cannotTransferToSelf'));
        }

        if (!await canTransfer(c, toUser.userId, 'transfer:receive')) throw new BizError(t('transferUnavailable'), 403);

        // Check no existing pending transfer for this account
        const existing = await orm(c).select().from(accountTransfer)
            .where(and(
                eq(accountTransfer.accountId, accountId),
                eq(accountTransfer.status, 0)
            )).get();

        if (existing) {
            throw new BizError(t('transferAlreadyPending'));
        }

        await orm(c).insert(accountTransfer).values({
            accountId,
            accountEmail: accountRow.email,
            fromUserId,
            toUserId: toUser.userId,
            status: 0,
        }).run();
    },

    async accept(c, transferId, userId) {
        const transferRow = await orm(c).select().from(accountTransfer)
            .where(and(
                eq(accountTransfer.transferId, transferId),
                eq(accountTransfer.toUserId, userId),
                eq(accountTransfer.status, 0)
            )).get();

        if (!transferRow) {
            throw new BizError(t('transferNotFound'));
        }

        const mailbox = await orm(c).select({ userId: account.userId, isDel: account.isDel, email: account.email })
            .from(account).where(eq(account.accountId, transferRow.accountId)).get();
        if (!mailbox || mailbox.isDel || mailbox.userId !== transferRow.fromUserId || mailbox.email !== transferRow.accountEmail)
            throw new BizError(t('transferUnavailable'), 409);

        if (await isPrimaryAccount(c, transferRow.fromUserId, transferRow.accountEmail)) {
            throw new BizError(t('cannotTransferPrimaryAccount'));
        }

        if (!await canTransfer(c, userId, 'transfer:receive') || !await canTransfer(c, transferRow.fromUserId, 'transfer:send'))
            throw new BizError(t('transferUnavailable'), 403);
        const receiver = await userService.selectByIdIncludeDel(c, userId);
        const role = await roleService.selectById(c, receiver.type);
        const admin = receiver.email === c.env.admin;
        if (!admin && !roleService.hasAvailDomainPerm(role?.availDomain || '', transferRow.accountEmail)) throw new BizError(t('noDomainPermAdd'), 403);
        const quota = admin ? 0 : Math.max(0, Number(role?.accountCount) || 0);
        // A single transaction moves the mailbox, messages and attachment ownership together.
        // The actual ownership write checks quota and pending state atomically.
        const guard = `EXISTS(SELECT 1 FROM account a JOIN account_transfer t ON t.account_id=a.account_id
            WHERE a.account_id=? AND a.user_id=? AND a.is_del=0 AND t.transfer_id=? AND t.status=0)`;
        const results = await c.env.db.batch([
            c.env.db.prepare(`UPDATE account SET user_id=? WHERE account_id=? AND user_id=? AND is_del=0
                AND (?<=0 OR (SELECT COUNT(*) FROM account WHERE user_id=? AND is_del=0)<?)
                AND EXISTS(SELECT 1 FROM account_transfer WHERE transfer_id=? AND status=0)`)
                .bind(userId, transferRow.accountId, transferRow.fromUserId, quota, userId, quota, transferId),
            c.env.db.prepare(`UPDATE email SET user_id=? WHERE account_id=? AND ${guard}`)
                .bind(userId, transferRow.accountId, transferRow.accountId, userId, transferId),
            c.env.db.prepare(`UPDATE attachments SET user_id=? WHERE account_id=? AND ${guard}`)
                .bind(userId, transferRow.accountId, transferRow.accountId, userId, transferId),
            c.env.db.prepare(`UPDATE account_transfer SET status=1 WHERE transfer_id=? AND status=0 AND ${guard}`)
                .bind(transferId, transferRow.accountId, userId, transferId),
        ]);
        if (!results[0].meta?.changes) throw new BizError(t('transferUnavailable'), 409);
    },

    async reject(c, transferId, userId) {
        const transferRow = await orm(c).select().from(accountTransfer)
            .where(and(
                eq(accountTransfer.transferId, transferId),
                eq(accountTransfer.toUserId, userId),
                eq(accountTransfer.status, 0)
            )).get();

        if (!transferRow) {
            throw new BizError(t('transferNotFound'));
        }

        await orm(c).update(accountTransfer)
            .set({ status: 2 })
            .where(eq(accountTransfer.transferId, transferId))
            .run();
    },

    async pendingList(c, userId) {
        return orm(c).select().from(accountTransfer)
            .where(and(
                eq(accountTransfer.toUserId, userId),
                eq(accountTransfer.status, 0)
            ))
            .all();
    },

    async sentList(c, userId) {
        return orm(c).select().from(accountTransfer)
            .where(eq(accountTransfer.fromUserId, userId))
            .orderBy(sql`${accountTransfer.createTime} DESC`)
            .limit(20)
            .all();
    },

    async receivedHistoryList(c, userId) {
        return orm(c).select().from(accountTransfer)
            .where(and(
                eq(accountTransfer.toUserId, userId),
                sql`${accountTransfer.status} != 0`
            ))
            .orderBy(sql`${accountTransfer.createTime} DESC`)
            .limit(30)
            .all();
    },

    async pendingCount(c, userId) {
        const result = await c.env.db.prepare(
            `SELECT COUNT(*) as cnt FROM account_transfer WHERE to_user_id = ? AND status = 0`
        ).bind(userId).first();
        return result?.cnt || 0;
    },
};

export default accountTransferService;
