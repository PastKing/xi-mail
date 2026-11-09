import { createI18n } from 'vue-i18n';
import zh from './zh.js'
const i18n = createI18n({
    legacy: false,
    locale: 'zh',
    fallbackLocale: 'zh',
    missingWarn: false,
    fallbackWarn: false,
    messages: {
        zh
    },
});

export default i18n;
