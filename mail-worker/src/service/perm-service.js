import orm from '../entity/orm';
import perm from '../entity/perm';
import { eq, ne, and, asc } from 'drizzle-orm';
import rolePerm from '../entity/role-perm';
import user from '../entity/user';
import role from '../entity/role';
import { permConst } from '../const/entity-const';
import { t } from '../i18n/i18n'
import { ensureFeaturePermissions } from './feature-permission-service';

export function orderPermissionGroups(groups) {
	const mail = groups.find(item => item.name === '邮件');
	if (!mail) return groups;
	const linked = ['邮箱转移', '邮箱分享'].flatMap(name => groups.filter(item => item.name === name));
	const ordered = groups.filter(item => !linked.includes(item));
	ordered.splice(ordered.indexOf(mail) + 1, 0, ...linked);
	return ordered;
}

const permService = {
	async tree(c) {
		await ensureFeaturePermissions(c);
		const pList = await orm(c).select().from(perm).where(eq(perm.pid, 0)).orderBy(asc(perm.sort)).all();
		const cList = await orm(c).select().from(perm).where(ne(perm.pid, 0)).orderBy(asc(perm.sort)).all();

		cList.forEach(cItem => {
			cItem.name = t('perms.' + cItem.name)
		})

		const ordered = orderPermissionGroups(pList);
		ordered.forEach(pItem => {
			pItem.name = t('perms.' + pItem.name)
			pItem.children = cList.filter(cItem => cItem.pid === pItem.permId)
		})
		return ordered;
	},

	async userPermKeys(c, userId) {
		await ensureFeaturePermissions(c);
		const userPerms = await orm(c).select({permKey: perm.permKey}).from(user)
			.leftJoin(role, eq(role.roleId,user.type))
			.rightJoin(rolePerm, eq(rolePerm.roleId,role.roleId))
			.leftJoin(perm, eq(rolePerm.permId,perm.permId))
			.where(and(eq(user.userId,userId),eq(perm.type,permConst.type.BUTTON)))
			.all();
		return userPerms.map(perm => perm.permKey);
	}
}

export default permService
