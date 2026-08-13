const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'audio',
  'b', 'bdi', 'bdo', 'blockquote', 'br',
  'caption', 'center', 'cite', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
  'em', 'figcaption', 'figure', 'font', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr',
  'i', 'img', 'input', 'ins', 'kbd', 'li', 'main', 'mark',
  'nav', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby',
  's', 'samp', 'section', 'small', 'source', 'span', 'strike',
  'strong', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul',
  'var', 'video', 'wbr',
]);

const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript',
  'meta', 'link', 'base', 'form', 'button', 'select', 'textarea', 'option',
]);

const GLOBAL_ATTRIBUTES = new Set([
  'class', 'id', 'title', 'lang', 'dir', 'role', 'style', 'hidden', 'tabindex',
]);

const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  audio: new Set(['src', 'controls', 'loop', 'muted', 'preload']),
  blockquote: new Set(['cite']),
  col: new Set(['span', 'width']),
  colgroup: new Set(['span', 'width']),
  del: new Set(['cite', 'datetime']),
  details: new Set(['open']),
  font: new Set(['color', 'face', 'size']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding']),
  input: new Set(['type', 'checked', 'disabled']),
  ins: new Set(['cite', 'datetime']),
  li: new Set(['value']),
  ol: new Set(['start', 'reversed', 'type']),
  q: new Set(['cite']),
  source: new Set(['src', 'type', 'media']),
  table: new Set(['align', 'border', 'cellpadding', 'cellspacing', 'width']),
  td: new Set(['colspan', 'rowspan', 'headers', 'align', 'valign', 'width', 'height']),
  th: new Set(['colspan', 'rowspan', 'headers', 'scope', 'abbr', 'align', 'valign', 'width', 'height']),
  time: new Set(['datetime']),
  video: new Set(['src', 'controls', 'loop', 'muted', 'poster', 'preload', 'width', 'height']),
};

const SAFE_STYLE_PROPERTIES = new Set([
  'color', 'background-color',
  'font-family', 'font-size', 'font-style', 'font-weight',
  'letter-spacing', 'line-height', 'text-align', 'text-decoration',
  'text-decoration-color', 'text-decoration-line', 'text-indent',
  'text-transform', 'vertical-align', 'white-space', 'word-break', 'word-spacing',
  'display', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-color', 'border-style', 'border-width',
  'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
  'opacity', 'overflow', 'overflow-x', 'overflow-y',
]);

const SAFE_NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'transparent',
]);

function isAllowedAttribute(tag: string, name: string): boolean {
  return GLOBAL_ATTRIBUTES.has(name)
    || TAG_ATTRIBUTES[tag]?.has(name) === true
    || /^aria-[a-z0-9_-]+$/.test(name)
    || /^data-[a-z0-9_-]+$/.test(name);
}

function sanitizeStyle(style: string): string | null {
  const declarations: string[] = [];
  for (const rawDeclaration of style.split(';')) {
    const separator = rawDeclaration.indexOf(':');
    if (separator < 1) continue;

    const property = rawDeclaration.slice(0, separator).trim().toLowerCase();
    const value = rawDeclaration.slice(separator + 1).trim();
    if (!SAFE_STYLE_PROPERTIES.has(property) || !value || value.length > 160) continue;
    if (/[\\<>&]/.test(value)) continue;
    if (/(?:url|expression|javascript|vbscript|@import|behavior|-moz-binding|image-set|var)\s*\(/i.test(value)) continue;

    declarations.push(`${property}: ${value}`);
  }
  return declarations.length > 0 ? declarations.join('; ') : null;
}

function sanitizeColor(value: string): string | null {
  const color = value.trim().replace(/^[“”‘’]+|[“”‘’]+$/g, '').toLowerCase();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(color)) return color;
  if (/^(?:rgb|rgba|hsl|hsla)\([\d\s.,%+-]+\)$/.test(color)) return color;
  return SAFE_NAMED_COLORS.has(color) ? color : null;
}

function sanitizeUrl(value: string, allowDataImage = false): string | null {
  const url = value.trim();
  if (!url || /[\u0000-\u001f\u007f]/.test(url)) return null;
  if (allowDataImage && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(url)) {
    return url;
  }

  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (!scheme) return url;
  return ['http', 'https', 'mailto', 'tel'].includes(scheme) ? url : null;
}

function sanitizeElement(element: HTMLRewriterTypes.Element): void {
  const tag = element.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) {
    if (DROP_WITH_CONTENT.has(tag)) element.remove();
    else element.removeAndKeepContent();
    return;
  }

  if (tag === 'input' && element.getAttribute('type')?.toLowerCase() !== 'checkbox') {
    element.remove();
    return;
  }

  for (const [rawName, rawValue] of Array.from(element.attributes)) {
    const name = rawName.toLowerCase();
    if (name.startsWith('on') || !isAllowedAttribute(tag, name)) {
      element.removeAttribute(rawName);
      continue;
    }

    if (name === 'style') {
      const style = sanitizeStyle(rawValue);
      if (style) element.setAttribute('style', style);
      else element.removeAttribute(rawName);
      continue;
    }

    if (name === 'href' || name === 'cite') {
      const url = sanitizeUrl(rawValue);
      if (url) element.setAttribute(name, url);
      else element.removeAttribute(rawName);
      continue;
    }

    if (name === 'src' || name === 'poster') {
      const url = sanitizeUrl(rawValue, tag === 'img' && name === 'src');
      if (url) element.setAttribute(name, url);
      else element.removeAttribute(rawName);
      continue;
    }

    if (tag === 'font' && name === 'color') {
      const color = sanitizeColor(rawValue);
      if (color) element.setAttribute('color', color);
      else element.removeAttribute(rawName);
    }
  }

  if (tag === 'input') {
    element.setAttribute('type', 'checkbox');
    element.setAttribute('disabled', '');
  }

  if (tag === 'a' && element.getAttribute('target') === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer');
  }
}

export function sanitizeArticleHtml(html: string): string {
  return new HTMLRewriter()
    .on('*', { element: sanitizeElement })
    .onDocument({
      comments(comment) {
        comment.remove();
      },
    })
    .transform(html) as string;
}
