import i18next from 'i18next';
import zh from './zh.js'

const resources = {
	zh: {
		translation: zh,
	},
};

i18next.init({
	lng: 'zh',
	fallbackLng: 'zh',
	resources,
});

export const t = (key, values) => i18next.t(key, values)

export default i18next;
