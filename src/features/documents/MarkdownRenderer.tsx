/**
 * A minimal, XSS-safe markdown renderer.
 * Supports: headings (# ## ###), unordered lists (- / *),
 * ordered lists (1. 2.), bold (**text**), inline code (`code`),
 * fenced code blocks (```), checkbox list items (- [ ] / - [x]),
 * horizontal rules (---), and plain paragraphs.
 *
 * Does NOT use dangerouslySetInnerHTML.
 */

/* eslint-disable react-refresh/only-export-components -- parser helpers are exported for focused security tests */

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  body: string;
  className?: string;
}

// ─── Inline formatting ────────────────────────────────────────────────────────

type Segment =
  | { type: 'text' | 'bold' | 'code'; content: string }
  | { type: 'image'; content: string; alt: string };

/**
 * Same-origin allowlist for image sources: only same-origin API-proxied
 * images or inline raster data URIs are permitted. `data:image/svg+xml` (and
 * any other scriptable/unknown data subtype) is rejected, since an SVG can
 * embed <script> and execute when opened as a top-level document. Anything
 * else (external hosts, `javascript:`, etc.) is also rejected and rendered
 * as plain alt text instead.
 */
export function isSafeImageSrc(src: string): boolean {
  return src.startsWith('/api/') || /^data:image\/(png|jpeg|gif|webp|bmp);/i.test(src);
}

/** Unescape backslash-escaped brackets in markdown alt text for display. */
function unescapeAlt(alt: string): string {
  return alt.replace(/\\([[\]])/g, '$1');
}

export function parseInline(raw: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = raw;

  while (remaining.length > 0) {
    // Image: ![alt](src) — alt is a lazy any-char group so it can contain
    // (escaped) brackets, e.g. real ConnectWise alt text like `\[image\]`.
    // The `\]\(` adjacency anchors on the real closing bracket + paren.
    const imageMatch = remaining.match(/^([\s\S]*?)!\[([\s\S]*?)\]\(([^)\s]+)\)/);
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/s);
    // Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/s);

    let pick: 'image' | 'bold' | 'code' | null = null;
    let bestLen = Infinity;

    if (imageMatch) {
      pick = 'image';
      bestLen = imageMatch[1].length;
    }
    if (boldMatch && boldMatch[1].length < bestLen) {
      pick = 'bold';
      bestLen = boldMatch[1].length;
    }
    if (codeMatch && codeMatch[1].length < bestLen) {
      pick = 'code';
      bestLen = codeMatch[1].length;
    }

    if (pick === 'image' && imageMatch) {
      if (imageMatch[1]) segments.push({ type: 'text', content: imageMatch[1] });
      segments.push({ type: 'image', content: imageMatch[3], alt: unescapeAlt(imageMatch[2]) });
      remaining = remaining.slice(imageMatch[0].length);
    } else if (pick === 'bold' && boldMatch) {
      if (boldMatch[1]) segments.push({ type: 'text', content: boldMatch[1] });
      segments.push({ type: 'bold', content: boldMatch[2] });
      remaining = remaining.slice(boldMatch[0].length);
    } else if (pick === 'code' && codeMatch) {
      if (codeMatch[1]) segments.push({ type: 'text', content: codeMatch[1] });
      segments.push({ type: 'code', content: codeMatch[2] });
      remaining = remaining.slice(codeMatch[0].length);
    } else {
      segments.push({ type: 'text', content: remaining });
      remaining = '';
    }
  }

  return segments;
}

function InlineContent({ text }: { text: string }) {
  const segments = parseInline(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'bold') {
          return <strong key={i} className="font-semibold">{seg.content}</strong>;
        }
        if (seg.type === 'code') {
          return (
            <code
              key={i}
              className="rounded bg-muted px-1 py-0.5 text-xs font-mono"
            >
              {seg.content}
            </code>
          );
        }
        if (seg.type === 'image') {
          if (isSafeImageSrc(seg.content)) {
            // Click-to-zoom (opens the image as a top-level document) is only
            // safe for same-origin proxy URLs. Never do this for `data:`
            // URIs — even an allowlisted raster data URI should just render
            // inline, with no navigation affordance.
            const isProxyUrl = seg.content.startsWith('/api/');
            return (
              <img
                key={i}
                src={seg.content}
                alt={seg.alt}
                loading="lazy"
                className={cn(
                  'max-w-full h-auto rounded border my-2',
                  isProxyUrl && 'cursor-zoom-in'
                )}
                onClick={isProxyUrl ? () => window.open(seg.content, '_blank', 'noopener') : undefined}
              />
            );
          }
          return <React.Fragment key={i}>{seg.alt}</React.Fragment>;
        }
        return <React.Fragment key={i}>{seg.content}</React.Fragment>;
      })}
    </>
  );
}

// ─── Block parsing ────────────────────────────────────────────────────────────

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'ul'; items: Array<{ checked?: boolean; text: string }> }
  | { type: 'ol'; items: string[] }
  | { type: 'code-block'; lang: string; lines: string[] }
  | { type: 'hr' }
  | { type: 'blank' }
  | { type: 'p'; text: string };

function parseBlocks(body: string): Block[] {
  const rawLines = body.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trimEnd();

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trimEnd().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      blocks.push({ type: 'code-block', lang, lines: codeLines });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
      i++;
      continue;
    }

    // Unordered list (- or *)
    if (/^[-*] /.test(trimmed)) {
      const items: Array<{ checked?: boolean; text: string }> = [];
      while (i < rawLines.length && /^[-*] /.test(rawLines[i].trimEnd())) {
        const raw = rawLines[i].trimEnd();
        if (raw.startsWith('- [ ] ') || raw.startsWith('* [ ] ')) {
          items.push({ checked: false, text: raw.slice(6) });
        } else if (raw.startsWith('- [x] ') || raw.startsWith('* [x] ')) {
          items.push({ checked: true, text: raw.slice(6) });
        } else {
          items.push({ text: raw.slice(2) });
        }
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list (1. 2. ...)
    if (/^\d+\. /.test(trimmed)) {
      const items: string[] = [];
      while (i < rawLines.length && /^\d+\. /.test(rawLines[i].trimEnd())) {
        items.push(rawLines[i].trimEnd().replace(/^\d+\. /, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Blank line
    if (trimmed === '') {
      blocks.push({ type: 'blank' });
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'p', text: trimmed });
    i++;
  }

  return blocks;
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function MarkdownRenderer({ body, className }: MarkdownRendererProps) {
  const blocks = parseBlocks(body);

  return (
    <div className={cn('space-y-2 min-w-0 [overflow-wrap:anywhere]', className)}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1 key={idx} className="text-xl font-bold mt-6 mb-2 first:mt-0">
                <InlineContent text={block.text} />
              </h1>
            );
          case 'h2':
            return (
              <h2 key={idx} className="text-base font-semibold mt-5 mb-1.5">
                <InlineContent text={block.text} />
              </h2>
            );
          case 'h3':
            return (
              <h3 key={idx} className="text-sm font-semibold mt-4 mb-1">
                <InlineContent text={block.text} />
              </h3>
            );
          case 'ul':
            return (
              <ul key={idx} className="space-y-1 my-2">
                {block.items.map((item, ii) => (
                  <li key={ii} className="flex items-start gap-2 text-sm">
                    {item.checked !== undefined ? (
                      <input
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
                        aria-label={item.text}
                      />
                    ) : (
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60"
                        aria-hidden="true"
                      />
                    )}
                    <span className="leading-relaxed">
                      <InlineContent text={item.text} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1 my-2">
                {block.items.map((item, ii) => (
                  <li key={ii} className="text-sm leading-relaxed pl-1">
                    <InlineContent text={item} />
                  </li>
                ))}
              </ol>
            );
          case 'code-block':
            return (
              <pre
                key={idx}
                className="rounded-md bg-muted p-4 overflow-x-auto text-xs font-mono my-3"
                aria-label={block.lang ? `Code block: ${block.lang}` : 'Code block'}
              >
                <code>{block.lines.join('\n')}</code>
              </pre>
            );
          case 'hr':
            return <hr key={idx} className="border-border my-4" />;
          case 'blank':
            return <div key={idx} className="h-1" aria-hidden="true" />;
          case 'p':
            return (
              <p key={idx} className="text-sm leading-relaxed">
                <InlineContent text={block.text} />
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
