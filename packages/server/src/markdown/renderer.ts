import MarkdownIt from 'markdown-it';

// Safe configuration: no raw HTML
const md = new MarkdownIt({
  html: false,        // Disable raw HTML
  linkify: true,      // Auto-link URLs
  typographer: true,  // Smart quotes, dashes
  breaks: true,       // Convert \n to <br>
  highlight: function (str: string, lang: string): string {
    // Escape the code for safe embedding; client-side highlight.js will color it
    const escaped = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code class="language-${lang || 'plaintext'}">${escaped}</code></pre>`;
  },
});

// Basic XSS sanitization (DOMPurify runs on frontend as well)
function sanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '');
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

  let html = md.render(content);
  html = addHeadingIds(html);
  html = sanitize(html);

  const toc = extractTOC(html);
  const wordCount = content.replace(/[#*\->`\[\]()!\s]+/g, ' ').trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const excerpt = frontmatter.excerpt ||
    content.replace(/[#*>\[\]`!\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);

  return {
    html,
    toc,
    title: frontmatter.title || 'Untitled',
    excerpt,
    tags: frontmatter.tags || [],
    coverImage: frontmatter.cover || null,
    date: frontmatter.date || null,
    readingTime,
  };
}
