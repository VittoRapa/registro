'use client';

import React from 'react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  if (!content) {
    return <p className="text-slate-400 italic">Nessun contenuto disponibile.</p>;
  }

  // Parse lines into tokens
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div key={`code-${i}`} className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs font-mono text-emerald-400 shadow-inner">
            {codeBlockLang && (
              <div className="mb-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-1">
                {codeBlockLang}
              </div>
            )}
            <pre className="whitespace-pre">{codeBuffer.join('\n')}</pre>
          </div>
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace('```', '');
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Math block ($$ ... $$)
    if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 2) {
      const math = line.trim().slice(2, -2).trim();
      elements.push(
        <div key={`math-${i}`} className="my-4 flex justify-center overflow-x-auto rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-4 font-mono text-sm text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <span>{math}</span>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="mt-6 mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="mt-5 mb-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="mt-4 mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={`quote-${i}`} className="my-3 border-l-4 border-emerald-500 pl-4 py-1 italic text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-r">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-sm text-slate-700 dark:text-slate-300 my-1">
          {renderInline(line.slice(2))}
        </li>
      );
      continue;
    }

    // Divider
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-6 border-slate-200 dark:border-slate-800" />);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      continue;
    }

    // Default Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
        {renderInline(line)}
      </p>
    );
  }

  return <div className={`prose dark:prose-invert max-w-none ${className}`}>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Regex to split by inline codes `...`, inline math $...$, bold **...**, italics *...*
  const parts = text.split(/(`[^`]+`|\$[^$]+\$|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-rose-600 dark:text-rose-400">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return (
        <span key={index} className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
          {part.slice(1, -1)}
        </span>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
