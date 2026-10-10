import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseRecipientText } from '../src/utils/recipient-utils.js';

test('batch recipients support copied lists without accepting malformed addresses', () => {
  assert.deepEqual(parseRecipientText(
    'a@example.com，b@example.com;c@example.com；d@example.com\ne@example.com\tf@example.com g@example.com'
  ).emails, 'abcdefg'.split('').map(letter => `${letter}@example.com`));
  assert.deepEqual(parseRecipientText(
    'a@example.com 张三 <b@example.com>; "Doe, Jane" <jane@example.com>\nmailto:c@example.com; B@EXAMPLE.COM',
    ['a@example.com']
  ), { emails: ['b@example.com', 'jane@example.com', 'c@example.com'], invalid: [] });
  assert.deepEqual(parseRecipientText('bad@@example.com, a@example.com.invalid!, missing-at, a@example.com'), {
    emails: ['a@example.com'], invalid: ['bad@@example.com', 'a@example.com.invalid!', 'missing-at']
  });
  assert.deepEqual(parseRecipientText(''), { emails: [], invalid: [] });
});

test('actual paste handler adds recipients, preserves invalid input and honours text selection', () => {
  const source = readFileSync(new URL('../src/layout/write/index.vue', import.meta.url), 'utf8');
  const handlers = source.slice(source.indexOf('function addRecipients('), source.indexOf('function clearContent('));
  const form = { receiveEmail: ['existing@example.com'] };
  const warnings = [];
  const paste = new Function('parseRecipientText', 'form', 'ElMessage', 't', 'selectStatus', 'openSelect',
    `${handlers}; return pasteRecipients;`)(parseRecipientText, form, options => warnings.push(options), key => key, false, () => {});
  let prevented = false;
  let synced = false;
  const input = { value: 'old value', selectionStart: 0, selectionEnd: 9,
    dispatchEvent(event) { synced = event.type === 'input' && event.bubbles; } };
  paste({ target: input, clipboardData: { getData: () => 'existing@example.com; new@example.com\nbad@@example.com' },
    preventDefault() { prevented = true; } });
  assert.deepEqual(form.receiveEmail, ['existing@example.com', 'new@example.com']);
  assert.equal(input.value, 'bad@@example.com');
  assert.equal(warnings.length, 1);
  assert.ok(prevented && synced);
  input.value = 'part';
  input.selectionStart = input.selectionEnd = 4;
  paste({ target: input, clipboardData: { getData: () => '@example.com' }, preventDefault() {} });
  assert.deepEqual(form.receiveEmail, ['existing@example.com', 'new@example.com', 'part@example.com']);
  assert.equal(input.value, '');
});
