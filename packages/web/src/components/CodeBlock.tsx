import { useState, useCallback } from 'react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <div className="code-block my-5">
      <div className="code-block-header">
        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{language || 'code'}</span>
        <button
          onClick={copy}
          className="px-3 py-1 rounded-xl bg-[#3a3a3a] text-gray-300 text-[11px] hover:bg-[#4a4a4a] transition-colors duration-200"
        >
          {copied ? '✓ 已复制' : '📋 复制'}
        </button>
      </div>
      <pre className="!mt-0 !mb-0 !bg-transparent overflow-x-auto">
        <code className={`language-${language || 'plaintext'} text-sm leading-relaxed`} style={{ color: '#e0e0e0' }}>
          {code}
        </code>
      </pre>
    </div>
  );
}
