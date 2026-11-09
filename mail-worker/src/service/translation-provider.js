import BizError from '../error/biz-error';

// Edge channel used by translate.js (MIT, xnx3). Only explicit text batches are
// sent here: no DOM scanning, cookies, identifiers or automatic mail translation.
export default {
  async translate(texts, target, source = 'auto') {
    const chunks = []; let chunk = [], length = 0;
    for (const text of texts) {
      if (typeof text !== 'string' || text.length > 12000) throw new BizError('翻译文本过长，请分段处理。', 400);
      if (chunk.length && (length + text.length > 12000 || chunk.length >= 60)) { chunks.push(chunk); chunk=[]; length=0; }
      chunk.push(text); length += text.length;
    }
    if (chunk.length) chunks.push(chunk);
    const translated = [];
    for (const values of chunks) {
      let response, result;
      try {
        const url = new URL('https://edge.microsoft.com/translate/translatetext');
        const params = new URLSearchParams({to:target,isEnterpriseClient:'false'});
        if (source && source !== 'auto') params.set('from',source);
        url.search = params.toString();
        // The Edge channel rejects the Workers default UA with "Client Browser
        // Version not supported". Send a fixed protocol-compatible client version.
        response = await fetch(url, {method:'POST',redirect:'manual',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0 Edg/130.0.0.0'},
          body:JSON.stringify(values),signal:AbortSignal.timeout(20000)});
        if (!response.ok) throw new BizError(`翻译服务请求失败（HTTP ${response.status}），请稍后重试。`,503);
        result = await response.json();
      } catch(error) {
        if(error instanceof BizError)throw error;
        throw new BizError('翻译服务暂时不可用，请稍后重试。', 503);
      }
      if (!Array.isArray(result) || result.length !== values.length || result.some(item => typeof item?.translations?.[0]?.text !== 'string'))
        throw new BizError('翻译服务返回了不完整的结果，请稍后重试。', 503);
      translated.push(...result.map(item => item.translations[0].text));
    }
    return translated;
  },
};
