import hljs from 'highlight.js';

export function enhanceCodeBlocks(container: HTMLElement) {
  const pres = container.querySelectorAll('pre');
  pres.forEach(pre => {
    // If it's already enhanced, skip
    if (pre.parentElement?.classList.contains('code-block')) return;

    const codeEl = pre.querySelector('code');
    if (!codeEl) return;

    // 1. Identify the language
    const classList = Array.from(codeEl.classList);
    let lang = 'plaintext';
    for (const cls of classList) {
      if (cls.startsWith('language-')) {
        lang = cls.replace('language-', '');
        break;
      }
    }

    // 2. Highlighting using highlight.js
    try {
      hljs.highlightElement(codeEl);
    } catch (e) {
      console.error('Highlight failed:', e);
    }

    // 3. Transform the structure:
    // Create code-block wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block my-5';

    // Create header
    const header = document.createElement('div');
    header.className = 'code-block-header';

    const langBadge = document.createElement('span');
    langBadge.className = 'text-[10px] font-bold tracking-widest text-gray-500 uppercase font-mono';
    langBadge.textContent = lang === 'plaintext' ? 'code' : lang;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#3a3a3a] text-gray-300 text-[11px] hover:bg-[#4a4a4a] transition-colors duration-200';
    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="1.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg> 复制';
    
    copyBtn.onclick = async () => {
      const codeText = codeEl.textContent || '';
      await navigator.clipboard.writeText(codeText);
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg> 已复制';
      copyBtn.classList.add('bg-emerald-600/30', 'text-emerald-400');
      setTimeout(() => {
        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="1.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg> 复制';
        copyBtn.classList.remove('bg-emerald-600/30', 'text-emerald-400');
      }, 2000);
    };

    header.appendChild(langBadge);
    header.appendChild(copyBtn);

    // Apply classes to pre and code elements
    pre.className = '!mt-0 !mb-0 !bg-transparent overflow-x-auto p-4';
    codeEl.className = `${codeEl.className} text-sm leading-relaxed block font-mono`;
    codeEl.style.color = '#e0e0e0';

    // Insert wrapper into DOM where pre was, and place header + pre inside
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}
