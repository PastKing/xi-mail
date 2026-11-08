import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useServerStore} from "@/store/server.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n from "@/i18n/index.js";
import {watch} from 'vue';

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    watch(() => [settingStore.settings.title, settingStore.settings.subtitle], ([title, subtitle]) => {
        if (typeof title !== 'string' || !title.trim()) return;
        const suffix = typeof subtitle === 'string' ? subtitle.trim() : '';
        document.title = suffix ? `${title.trim()} - ${suffix}` : title.trim();
    }, {immediate:true, flush:'sync'});
    const userStore = useUserStore();
    const accountStore = useAccountStore();
    const serverStore = useServerStore();

    serverStore.init();

    const token = location.pathname === '/share' ? null : serverStore.getToken();
    if (!settingStore.lang) {
        let lang = navigator.language.split('-')[0]
        lang = lang === 'zh' ? lang : 'en'
        settingStore.lang = lang
    }

    i18n.global.locale.value = settingStore.lang

    if (serverStore.needSetup) {
        removeLoading();
        return;
    }

    let setting = null;

    if (token) {
        const userPromise = loginUserInfo().catch(e => {
            console.error(e);
            return null;
        });

        const [s, user] = await Promise.all([websiteConfig(), userPromise]);
        setting = s;
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;

        if (user) {
            settingStore.domainList = user.domainList || setting.domainList;
            accountStore.currentAccountId = user.account.accountId;
            accountStore.currentAccount = user.account;
            userStore.user = user;

            if (user.lang) {
                settingStore.lang = user.lang;
                i18n.global.locale.value = user.lang;
            }

            const routers = permsToRouter(user.permKeys);
            routers.forEach(routerData => {
                router.addRoute('layout', routerData);
            });
        }

    } else {
        try {
            setting = await websiteConfig();
            settingStore.settings = setting;
            settingStore.domainList = setting.domainList;
        } catch {
            if (!serverStore.isStandalone) {
                serverStore.forceStandalone();
                removeLoading();
                router.replace({ name: 'setup' });
                return;
            }
        }
    }

    removeLoading();
}

function removeLoading() {
    if (window.innerWidth < 1025) {
        document.documentElement.style.setProperty('--loading-hide-transition', 'none')
    }
    const doc = document.getElementById('loading-first');
    doc.classList.add('loading-hide')
    setTimeout(() => {
        doc.remove()
    },1000)
}

