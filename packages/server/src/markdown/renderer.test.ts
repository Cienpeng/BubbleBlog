import { describe, expect, test } from 'bun:test';
import { renderMarkdown } from './renderer';

describe('article markdown rendering', () => {
  test('renders Markdown and common embedded HTML', () => {
    const html = renderMarkdown(`
# 标题

**粗体**

<div class="note"><span style="color: blue; font-weight: 700">正文</span></div>

<table><tr><th>A</th><td>B</td></tr></table>
`).html;

    expect(html).toContain('<h1>标题</h1>');
    expect(html).toContain('<strong>粗体</strong>');
    expect(html).toContain('<div class="note"><span style="color: blue; font-weight: 700">正文</span></div>');
    expect(html).toContain('<table><tr><th>A</th><td>B</td></tr></table>');
  });

  test('normalizes legacy font colors including curly quotes', () => {
    const html = renderMarkdown('<font color=“#ff0000”>Q</font>').html;
    expect(html).toContain('<font color="#ff0000">Q</font>');
  });

  test('removes active content, event handlers, dangerous URLs and CSS', () => {
    const html = renderMarkdown(`
<a href="javascript:alert(1)" onclick="alert(1)">链接</a>
<img src="x" onerror="alert(1)">
<span style="color: red; background-image: url(https://example.com/track)">文字</span>
<script>alert(1)</script>
`).html;

    expect(html).toContain('<a>链接</a>');
    expect(html).toContain('<img src="x">');
    expect(html).toContain('<span style="color: red">文字</span>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('background-image');
    expect(html).not.toContain('alert(1)');
  });

  test('keeps KaTeX structure and positioning styles intact', () => {
    const html = renderMarkdown('$\\frac{x_1^{2}}{y_2}$').html;
    expect(html).toContain('class="katex"');
    expect(html).toContain('<math ');
    expect(html).toContain('<mfrac>');
    expect(html).toContain('<msub>');
    expect(html).toContain('<msubsup>');
    expect(html).toContain('class="vlist"');
    expect(html).toMatch(/style="[^"]*(?:top|height):/);
  });
});
