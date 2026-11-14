import base from '../vite.config.js';

const mocks = {
  '/src/components/tiny-editor/index.vue': `import {defineComponent,h,ref,watch} from 'vue'; export default defineComponent({props:['defValue'],emits:['change','focus'],setup(props,{expose,emit}){const content=ref('');watch(()=>props.defValue,v=>content.value=v||'');expose({getContent:()=>content.value,clearEditor:()=>content.value='',focus:()=>{}});return()=>h('textarea',{'aria-label':'测试正文',style:'width:100%;height:100%;box-sizing:border-box;min-height:0',value:content.value,onInput:e=>{content.value=e.target.value;emit('change',content.value,content.value)}})}});`,
  '/src/store/user.js': `export function useUserStore(){return {user:{email:'sender@first.example',name:'测试发件人',account:{accountId:1}},refreshUserInfo(){}}}`,
  '/src/store/account.js': `export function useAccountStore(){return {currentAccount:{email:'sender@first.example',accountId:1,name:'测试发件人'}}}`,
  '/src/store/email.js': `export function useEmailStore(){return {}}`,
  '/src/store/setting.js': `export function useSettingStore(){return {settings:{r2Domain:''}}}`,
  '/src/store/writer.js': `export function useWriterStore(){return {sendRecipientRecord:[]}}`,
  '/src/store/draft.js': `export function userDraftStore(){return window.ccFixture.drafts}`,
  '/src/store/server.js': `export function useServerStore(){return {}}`,
  '/src/router/index.js': `export default {replace(){}}`,
  '/src/db/db.js': `export default {value:{draft:{async add(data){window.ccFixture.savedDraft=data;return 1}},att:{add(){}}}}`,
  '/src/request/account.js': `export async function accountList(){return [{email:'sender@first.example',accountId:1,name:'测试发件人'}]}`,
  '/src/request/email.js': `export async function ensureEmailContent(){};export async function emailSend(form){window.ccFixture.sent=JSON.parse(JSON.stringify(form));return [{subject:form.subject}]}`,
};

export default env => {
  const config = base(env);
  return {...config, server:{...config.server,host:'127.0.0.1',port:3019},plugins:[{
    name:'cc-writer-preview',enforce:'pre',load(id){const normalized=id.replaceAll('\\','/');const key=Object.keys(mocks).find(path=>normalized.endsWith(path));if(key)return key.endsWith('.vue') ? '<script>'+mocks[key]+'</script>' : mocks[key];},
  },...config.plugins]};
};

