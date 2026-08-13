import MarkdownIt from 'markdown-it';
import katex from '@vscode/markdown-it-katex';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import mark from 'markdown-it-mark';
import { sanitizeArticleHtml } from './sanitize';

// Markdown may contain common inline/block HTML. The final output is sanitized
// with an allowlist before it is inserted into the page DOM.
const md = new MarkdownIt({
  html: true,
  linkify: true,      // Auto-link URLs
  typographer: true,  // Smart quotes, dashes
  breaks: true,       // Convert \n to <br>
  highlight: function (str: string, lang: string): string {
    // Escape the code for safe embedding; client-side highlight.js will color it
    const escaped = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const safeLang = (lang || 'plaintext').toLowerCase().replace(/[^a-z0-9_+-]/g, '').slice(0, 32) || 'plaintext';
    return `<pre><code class="language-${safeLang}">${escaped}</code></pre>`;
  },
});

// Register plugins
md.use(katex)
  .use(taskLists, { label: true })
  .use(footnote)
  .use(mark);

interface RenderEnvironment {
  katexMarker: string;
  trustedKatex: string[];
}

// KaTeX emits a deeply nested, library-owned structure whose inline positioning
// is required for fractions, matrices, superscripts and subscripts. Keep those
// trusted fragments outside the user-authored HTML sanitizer and restore them
// afterwards. KaTeX's own trust option remains disabled by default.
for (const ruleName of ['math_inline', 'math_inline_block', 'math_inline_bare_block', 'math_block']) {
  const originalRule = md.renderer.rules[ruleName];
  if (!originalRule) continue;

  md.renderer.rules[ruleName] = (tokens, idx, options, env: RenderEnvironment, self) => {
    const rendered = originalRule(tokens, idx, options, env, self);
    const fragmentIndex = env.trustedKatex.push(rendered) - 1;
    return `${env.katexMarker}${fragmentIndex}__`;
  };
}

interface Frontmatter {
  title?: string;
  tags?: string[];
  excerpt?: string;
  cover?: string;
  date?: string;
}

function parseFrontmatter(markdown: string): { frontmatter: Frontmatter; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: markdown };
  }

  const yamlBlock = match[1];
  const content = markdown.slice(match[0].length);
  const frontmatter: Frontmatter = {};

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();

    // Parse YAML array: tags: ["a", "b"]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value);
      } catch {}
    } else {
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');
    }

    switch (key) {
      case 'title': frontmatter.title = value as string; break;
      case 'tags':
        if (Array.isArray(value)) {
          frontmatter.tags = value;
        } else if (typeof value === 'string') {
          // Try JSON parse for ["a", "b"] style
          if (value.startsWith('[') && value.endsWith(']')) {
            try {
              const parsed = JSON.parse(value);
              frontmatter.tags = Array.isArray(parsed) ? parsed : [value];
            } catch {
              // Fallback: split by comma
              frontmatter.tags = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
            }
          } else {
            // Simple comma-separated
            frontmatter.tags = value.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        break;
      case 'excerpt': frontmatter.excerpt = value as string; break;
      case 'cover': frontmatter.cover = value as string; break;
      case 'date': frontmatter.date = value as string; break;
    }
  }

  return { frontmatter, content };
}

interface TOCItem {
  id: string;
  level: number;
  text: string;
}

function extractTOC(html: string): TOCItem[] {
  const headingRegex = /<h([2-4])\s+id="([^"]+)"[^>]*>(.*?)<\/h\1>/gi;
  const toc: TOCItem[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    toc.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]+>/g, ''),
    });
  }
  return toc;
}

// Add IDs to headings for TOC linking
function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(
    /<(h[2-4])>(.*?)<\/\1>/gi,
    (match, tag, text) => {
      let id = text
        .replace(/<[^>]+>/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9一-龥]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'heading';
      const count = seen.get(id) || 0;
      seen.set(id, count + 1);
      if (count > 0) {
        id = `${id}-${count + 1}`;
      }
      return `<${tag} id="${id}">${text}</${tag}>`;
    }
  );
}

export interface RenderedArticle {
  html: string;
  toc: TOCItem[];
  title: string;
  excerpt: string;
  tags: string[];
  coverImage: string | null;
  date: string | null;
  readingTime: number;
}

export function renderMarkdown(markdown: string): RenderedArticle {
  const { frontmatter, content } = parseFrontmatter(markdown);
  const title = typeof frontmatter.title === 'string' ? frontmatter.title.slice(0, 255) : 'Untitled';
  const explicitExcerpt = typeof frontmatter.excerpt === 'string'
    ? frontmatter.excerpt.slice(0, 500)
    : '';
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map(tag => tag.trim().slice(0, 50))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const coverImage = typeof frontmatter.cover === 'string'
    ? frontmatter.cover.slice(0, 255)
    : null;
  const date = typeof frontmatter.date === 'string'
    ? frontmatter.date.slice(0, 50)
    : null;

  const renderEnvironment: RenderEnvironment = {
    katexMarker: `BUBBLE_KATEX_${crypto.randomUUID().replaceAll('-', '')}_`,
    trustedKatex: [],
  };
  let html = sanitizeArticleHtml(md.render(content, renderEnvironment));
  renderEnvironment.trustedKatex.forEach((fragment, index) => {
    html = html.replaceAll(`${renderEnvironment.katexMarker}${index}__`, fragment);
  });
  html = addHeadingIds(html);

  const toc = extractTOC(html);
  const wordCount = content.replace(/[#*\->`\[\]()!\s]+/g, ' ').trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const excerpt = explicitExcerpt ||
    content.replace(/[#*>\[\]`!\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);

  return {
    html,
    toc,
    title,
    excerpt,
    tags,
    coverImage,
    date,
    readingTime,
  };
}
