import base from '../vite.config.js';

const mocks = {
  '/src/utils/day.js': `export function formatDetailDate(){return '2026-10-17'}`,
  '/src/db/db.js': `export default {value:{draft:{async add(){return 1}},att:{add(){}}}}`,
  '/src/components/tiny-editor/index.vue': `import {defineComponent,h,ref,watch} from 'vue';export default defineComponent({props:['defValue'],emits:['change'],setup(props,{expose,emit}){const content=ref('');watch(()=>props.defValue,v=>content.value=v||'');expose({getContent:()=>content.value,clearEditor:()=>content.value='',focus(){}});return()=>h('textarea',{'aria-label':'测试正文',value:content.value,onInput:e=>{content.value=e.target.value;emit('change',content.value,content.value)}})}});`,
  '/src/router/index.js': `export default {replace(){}}`,
  '/src/request/account.js': `export async function accountList(){return JSON.parse(JSON.stringify(window.senderQA.accounts))};export async function accountSetName(accountId,name){if(window.senderQA.fail)throw new Error('simulated failure');const row=window.senderQA.accounts.find(a=>a.accountId===accountId);row.name=name.replace(/[<>]/g,'').trim()||row.email.split('@')[0];localStorage.setItem('sender-qa-accounts',JSON.stringify(window.senderQA.accounts));return {name:row.name}};export async function accountAdd(){};export async function accountDelete(){};export async function accountSetAllReceive(){};export async function accountSetAsTop(){};export async function accountCancelTop(){}`,
  '/src/request/email.js': `export async function ensureEmailContent(){};export async function emailSend(form){window.senderQA.sent=JSON.parse(JSON.stringify(form));return [{subject:form.subject}]}`,
};

export default env => {
  const config = base(env);
  return {...config, server:{...config.server,host:'127.0.0.1',port:3021,strictPort:true},plugins:[{
    name:'sender-name-preview',enforce:'pre',load(id){const path=id.replaceAll('\\','/');const key=Object.keys(mocks).find(key=>path.endsWith(key));if(key)return key.endsWith('.vue')?'<script>'+mocks[key]+'</script>':mocks[key];},
  },...config.plugins]};
};
