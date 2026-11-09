import http from '@/axios/index.js';
export const translationConfig = () => http.get('/translation/config');
export const saveTranslationConfig = config => http.post('/translation/save',config);
export const generateLanguage = (language,options={}) => http.post('/translation/generate',{language},{timeout:120000,...options});
export const languagePack = language => http.get('/translation/pack',{params:{language},noMsg:true});
export const translateMail = (emailId,target) => http.post('/email/translate',{emailId,target},{timeout:90000});
export const refreshLanguageCatalog = () => http.post('/translation/catalog/refresh',{});
export const registerLanguage = data => http.post('/translation/register',data);
