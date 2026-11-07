// Merge browser-local drafts with cursor-paginated sent mail without reloading all sent mail.
export function createOutboxFeed({ getSent, getDrafts }) {
 let current;
 return async function page(cursor, size, options) {
  if (!cursor || !current) current = { options: structuredClone(options), sent: [], drafts: null, cursor: 0, done: false, total: 0 };
  const base = current;
  const state = {...base,sent:[...base.sent],drafts:base.drafts ? [...base.drafts] : null};
  const scope = state.options, filters = scope.filters || {};
  const direction = scope.timeSort ? 1 : -1;
  if (!state.drafts) {
   const drafts = (await getDrafts()).filter(d => {
    if (!scope.allReceive && Number(d.accountId) !== Number(scope.accountId)) return false;
    if (filters.hasCode === '1' || filters.hasCode === 1) return false;
    if (filters.startTime && d.createTime < filters.startTime || filters.endTime && d.createTime >= filters.endTime) return false;
    const fields = {subject:[d.subject],sender:[d.name,d.sendEmail],recipient:d.receiveEmail || [],content:[d.content]};
    const values = fields[filters.searchType] || Object.values(fields).flat();
    return !filters.keyword || values.some(value => String(value || '').toLowerCase().includes(filters.keyword.toLowerCase()));
   }).map(d => ({...d, emailId: 'draft:'+d.draftId, isDraft:true, isStar:0, name:(d.receiveEmail || []).join(', '), text:'', type:1}));
   drafts.sort((a,b) => direction * (String(a.createTime).localeCompare(String(b.createTime)) || a.draftId-b.draftId));
   state.drafts = drafts; state.draftTotal = drafts.length;
  }
  const list = [];
  while (list.length < size) {
   if (!state.sent.length && !state.done) {
    const response = await getSent(state.cursor, size, scope);
    state.sent = response.list;
    state.done = response.list.length < size;
    if (response.list.length) state.cursor = response.list.at(-1).emailId;
    if (response.total != null) state.total = response.total;
   }
   const sent = state.sent[0], draft = state.drafts[0];
   if (!sent && !draft) break;
   if (draft && (!sent || direction * String(draft.createTime).localeCompare(String(sent.createTime)) <= 0)) list.push(state.drafts.shift());
   else list.push(state.sent.shift());
  }
  if (current === base) current = state;
  return { list, total:state.total + state.draftTotal };
 };
}
