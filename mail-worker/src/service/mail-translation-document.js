import {parseHTML} from 'linkedom';
import BizError from '../error/biz-error';

const SKIP=new Set(['STYLE','SCRIPT','NOSCRIPT','TITLE','SVG','MATH','CODE','PRE']);
const BLOCKED='script,base,meta,link,iframe,frame,frameset,object,embed,form,input,button,textarea,select,option,video,audio,source,svg,math,template';
function split(text) {
  const values=[];let current='';
  for(const char of text){current+=char;if(current.length>=5000){values.push(current);current='';}}
  if(current)values.push(current);return values;
}
export function mailTranslationDocument(mail) {
  let document;
  if(mail.content){
    ({document}=parseHTML(/<html[\s>]/i.test(mail.content)?mail.content:`<!doctype html><html><head></head><body>${mail.content}</body></html>`));
    document.querySelectorAll(BLOCKED).forEach(node=>node.remove());
  }
  const nodes=[];
  function visit(node){
    if(node.nodeType===1&&(SKIP.has(node.tagName)||node.getAttribute('translate')==='no'||node.classList.contains('notranslate')))return;
    if(node.nodeType===3){
      const text=node.data.trim();
      if(text&&/\p{L}/u.test(text)&&!/^(?:https?:\/\/|mailto:)\S+$/i.test(text)&&!/^\S+@\S+\.\S+$/.test(text))nodes.push({node,text,prefix:node.data.match(/^\s*/)[0],suffix:node.data.match(/\s*$/)[0]});
      return;
    }
    for(const child of node.childNodes||[])visit(child);
  }
  if(document?.body)visit(document.body);
  const text=mail.text||'';
  if(!nodes.length){
    if(document?.body&&(document.body.innerText.trim()||document.body.querySelector('img,table')))
      return {texts:[],render:()=>({text:document.body.innerText,html:'<!doctype html>'+document.documentElement.outerHTML})};
    if(text.length>40000)throw new BizError('这封邮件正文过长，暂不支持翻译。',400);
    const texts=split(text);
    return {texts,render:translated=>({text:translated.join('')})};
  }
  if(nodes.length>1500||nodes.reduce((sum,item)=>sum+item.text.length,0)>40000)throw new BizError('这封邮件正文过长，暂不支持翻译。',400);
  const texts=[];
  for(const item of nodes){item.start=texts.length;item.parts=split(item.text);texts.push(...item.parts);}
  return {texts,render(translated){
    if(translated.length!==texts.length)throw new BizError('邮件译文不完整，请重新翻译。',503);
    for(const item of nodes)item.node.data=item.prefix+translated.slice(item.start,item.start+item.parts.length).join('')+item.suffix;
    return {text:document.body.innerText,html:'<!doctype html>'+document.documentElement.outerHTML};
  }};
}
