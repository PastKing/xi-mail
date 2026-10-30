import base from '../vite.config.js';

const settings = `
import {ref} from 'vue';
const setting = ref({hasAi:false,aiCode:0,aiModels:[],aiCodeFilter:'',r2Domain:'',storageType:'r2',
tgBotStatus:1,forwardStatus:1,ruleType:0,registerVerify:1,addEmailVerify:1,notice:1});
export function useSysSetting(){return {setting,settingLoading:ref(false),clearS3Loading:ref(false),
onSettingsLoaded:fn=>fn(),change:()=>{},beforeChange:()=>true,editSetting:async()=>true};}
`;
const requests = `
import {ElMessage} from 'element-plus';
const fixture = window.wecomFixture = {config:{enabled:false,hasWebhook:false},saved:[],tests:[],fail:false,delay:0};
export async function wecomQuery(){return {...fixture.config};}
export async function wecomSet(data){
fixture.saved.push({...data});if(fixture.delay)await new Promise(resolve=>setTimeout(resolve,fixture.delay));
if(fixture.fail){ElMessage.error('模拟保存失败');throw new Error('mock failure');}
fixture.config={enabled:data.enabled,hasWebhook:fixture.config.hasWebhook||!!data.webhookUrl};
}
export async function wecomTest(data){
fixture.tests.push({...data});if(fixture.delay)await new Promise(resolve=>setTimeout(resolve,fixture.delay));
if(fixture.fail){ElMessage.error('模拟推送失败');throw new Error('mock failure');}
}
`;

export default env => {
  const config = base(env);
  return { ...config, plugins: [{
    name: 'wecom-preview', enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../use-sys-setting.js' && importer?.includes('/sections/integration.vue')) return '\0wecom-settings';
    },
    load(id) {
      const normalized = id.replaceAll('\\', '/');
      if (id === '\0wecom-settings') return settings;
      if (normalized.endsWith('/src/request/setting.js')) return requests;
      if (normalized.endsWith('/src/store/ui.js')) return 'export function useUiStore(){return {showNotice(){},previewNotice(){}}}';
    },
  }, ...config.plugins] };
};
