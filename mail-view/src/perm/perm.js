import {useUserStore} from "@/store/user.js";

export default {
    mounted(el, binding) {
        const userStore = useUserStore();
        const permKeys = userStore.user.permKeys;
        const value = binding.value;

        if (permKeys.includes('*')) {
            return;
        }

        const hasPermission = Array.isArray(value)
            ? value.some(key => permKeys.includes(key))
            : permKeys.includes(value);

        if (!hasPermission) {
            el.parentNode && el.parentNode.removeChild(el);
        }
    }
}

export function hasPerm(permKey) {
    const {permKeys} = useUserStore().user;
    return permKeys.includes('*') || permKeys.includes(permKey);
}


export function permsToRouter(permKeys) {
    const routerList = []
    Object.keys(routers).forEach(perm => {
        if (permKeys.includes(perm) || permKeys.includes('*')) {
            routerList.push(...routers[perm])
        }
    })
    return routerList;
}

const sysSettingSectionModules = import.meta.glob('../views/sys-setting/sections/*.vue')

const sysSettingSections = [
    'website',
    'security',
    'registration',
    'domain',
    'integration',
    'oauth',
    'sub-workers',
    'appearance',
    'language',
    'servers',
    'about'
]

const routers = {
    'transfer:query': [{ path: '/transfer', name: 'transfer', component: () => import('@/views/transfer/index.vue'),
        meta: { title: 'transferPending', name: 'transfer', menu: true } }],
    'email:send': [
        {
            path: '/sent',
            name: 'send',
            component: () => import('@/views/outbox/index.vue'),
            meta: {
                title: 'outbox',
                name: 'send',
                menu: true
            }
        },
        {
            path: '/drafts',
            name: 'draft',
            redirect: '/sent',
            meta: {
                title: 'drafts',
                name: 'draft',
                menu: true
            }
        }
    ],
    'user:query': [{
        path: '/all-users',
        name: 'user',
        component: () => import('@/views/user/index.vue'),
        meta: {
            title: 'allUsers',
            name: 'user',
            menu: true
        }
    }],
    'role:query': [{
        path: '/role',
        name: 'role',
        component: () => import('@/views/role/index.vue'),
        meta: {
            title: 'permissions',
            name: 'role',
            menu: true
        }
    }],
    'setting:query': [{
        path: '/system-setting',
        name: 'sys-setting',
        component: () => import('@/views/sys-setting/index.vue'),
        redirect: '/system-setting/overview',
        meta: {
            title: 'SystemSettings',
            name: 'sys-setting',
            menu: true
        },
        children: [{path:'overview',name:'sys-setting-overview',component:{render:()=>null}}, ...sysSettingSections.map(section => ({
            path: section,
            name: `sys-setting-${section}`,
            component: sysSettingSectionModules[`../views/sys-setting/sections/${section}.vue`],
            beforeEnter: section === 'website' ? to => ['addAccount','multipleEmail'].includes(to.query.find) ? {name:'sys-setting-registration',query:to.query,replace:true} : true : undefined,
            meta: {
                title: 'SystemSettings',
                name: 'sys-setting',
                menu: true
            }
        }))]
    }],
    'reg-key:query': [{
        path: '/invite-code',
        name: 'reg-key',
        component: () => import('@/views/reg-key/index.vue'),
        meta: {
            title: 'inviteCode',
            name: 'reg-key',
            menu: true
        }
    }],
    'all-email:query': [{
        path: '/all-mail',
        name: 'all-email',
        component: () => import('@/views/all-email/index.vue'),
        meta: {
            title: 'allMail',
            name: 'all-email',
            menu: true
        }
    }],
    'analysis:query': [{
        path: '/analysis',
        name: 'analysis',
        component: () => import('@/views/analysis/index.vue'),
        meta: {
            title: 'analytics',
            name: 'analysis',
            menu: true
        }
    }]
}
