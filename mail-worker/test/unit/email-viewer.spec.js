import { describe, it, expect } from 'vitest';
import { parseHTML } from 'linkedom';
import emailHtmlTemplate from '../../src/template/email-html';
import emailTextTemplate from '../../src/template/email-text';
import { EMAIL_VIEWER_CSP } from '../../src/template/email-viewer';

describe('Standalone email viewer isolation', () => {
  it.each([
    '<img src=x onerror="parent.__probe=1">',
    '</iframe><script>parent.__probe=1</script><iframe>',
    '" onload="parent.__probe=1"><script>parent.__probe=1</script>',
    '${parent.__probe=1}`</script><script>parent.__probe=1</script>',
    '<meta http-equiv="refresh" content="0;url=javascript:parent.__probe=1"><svg onload="parent.__probe=1"></svg>',
  ])('keeps hostile markup inside a scriptless opaque-origin frame: %s', html => {
    const { document } = parseHTML(emailHtmlTemplate(html, 'https://files.example'));
    const frame = document.querySelector('iframe');
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    expect(document.querySelectorAll('script,img,svg')).toHaveLength(0);
    expect(frame.getAttribute('sandbox').split(' ')).not.toContain('allow-scripts');
    expect(frame.getAttribute('sandbox').split(' ')).not.toContain('allow-same-origin');
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
    const inner = parseHTML(frame.getAttribute('srcdoc')).document;
    expect(inner.querySelector('meta[http-equiv="Content-Security-Policy"]').content).toContain("script-src 'none'");
    expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content).toBe(EMAIL_VIEWER_CSP);
  });
  it('renders plain-text markup as text, including template and attribute delimiters', () => {
    const text = '<img src=x onerror="parent.__probe=1"> & ${danger}`';
    const { document } = parseHTML(emailTextTemplate(text));
    const inner = parseHTML(document.querySelector('iframe').getAttribute('srcdoc')).document;
    expect(inner.querySelector('pre').textContent).toBe(text);
    expect(inner.querySelector('img')).toBeNull();
  });
  it('preserves email tables, styles and attachment images inside the isolated document', () => {
    const { document } = parseHTML(emailHtmlTemplate('<table style="width:600px"><tr><td>Code 123456<img src="{{domain}}file.png"></td></tr></table>', 'https://files.example'));
    const inner = parseHTML(document.querySelector('iframe').getAttribute('srcdoc')).document;
    expect(inner.querySelector('table').getAttribute('style')).toBe('width:600px');
    expect(inner.querySelector('td').textContent).toBe('Code 123456');
    expect(inner.querySelector('img').src).toBe('https://files.example/file.png');
  });
});
