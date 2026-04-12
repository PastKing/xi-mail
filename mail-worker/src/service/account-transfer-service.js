import BizError from '../error/biz-error';
import orm from '../entity/orm';
import accountTransfer from '../entity/account-transfer';
import account from '../entity/account';
import { eq, and, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { t } from '../i18n/i18n';
import userService from './user-service';

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

        // Find target user by displayId
        const toUser = await userService.selectByDisplayId(c, toDisplayId);
        if (!toUser) {
            throw new BizError(t('userNotFound'));
        }

        if (toUser.userId === fromUserId) {
            throw new BizError(t('cannotTransferToSelf'));
        }

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

        // Update account ownership (emails follow naturally via account_id)
        await orm(c).update(account)
            .set({ userId })
            .where(eq(account.accountId, transferRow.accountId))
            .run();

        // Also update email records' user_id
        await c.env.db.prepare(
            `UPDATE email SET user_id = ? WHERE account_id = ?`
        ).bind(userId, transferRow.accountId).run();

        // Mark as accepted
        await orm(c).update(accountTransfer)
            .set({ status: 1 })
            .where(eq(accountTransfer.transferId, transferId))
            .run();
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
