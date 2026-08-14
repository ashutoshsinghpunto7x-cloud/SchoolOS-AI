import { Fragment, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Trash2 } from 'lucide-react';
import type { ContentBlock, ListBlockItem, BlockConfidence } from '@schoolos/types';

// Renders (and, when `onChange` is passed, edits) one page's structured
// blocks. Read-only mode is used for QuestionSourceDetailPage; editable mode
// is used in the chapter-capture review workspace. Keeping one component for
// both avoids duplicating the block-type switch twice.

function ConfidenceBadge({ confidence }: { confidence?: BlockConfidence }) {
  if (!confidence || confidence === 'high') return null;
  const isLow = confidence === 'low';
  return (
    <span
      className={`inline-block text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ml-2 align-middle ${
        isLow ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      }`}
    >
      {isLow ? 'Low confidence' : 'Review recommended'}
    </span>
  );
}

function InlineText({ text }: { text: string }) {
  // Markdown-lite: **bold** / *italic* only — see flattenBlocksToText on the server for the matching format.
  const parts = useMemo(() => text.split(/(\*\*.+?\*\*|\*.+?\*)/g), [text]);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function EditableText({
  value, onChange, className, multiline,
}: { value: string; onChange: (v: string) => void; className?: string; multiline?: boolean }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={multiline ? 3 : undefined}
      className={`w-full bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-white/10 focus:border-blue-300 dark:focus:border-blue-500/50 rounded-md px-1.5 py-1 outline-none resize-none ${className ?? ''}`}
    />
  );
}

function renderListItems(items: ListBlockItem[], ordered: boolean, depth = 0): JSX.Element {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
      {items.map((item, i) => (
        <li key={i}>
          <InlineText text={item.text} />
          {item.items && item.items.length > 0 && renderListItems(item.items, ordered, depth + 1)}
        </li>
      ))}
    </Tag>
  );
}

function Equation({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try { return katex.renderToString(latex, { throwOnError: false, displayMode: true }); }
    catch { return null; }
  }, [latex]);
  if (!html) return <code className="text-sm text-gray-500">{latex}</code>;
  return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange?: (blocks: ContentBlock[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const editable = !!onChange;

  function updateBlock(index: number, updated: ContentBlock) {
    if (!onChange) return;
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  }

  function deleteBlock(index: number) {
    if (!onChange) return;
    onChange(blocks.filter((_, i) => i !== index));
  }

  if (blocks.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-white/30 italic">No content on this page.</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <div key={i} className="group relative">
          {editable && (
            <button
              type="button" onClick={() => deleteBlock(i)}
              className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center z-10"
              aria-label="Delete block"
            ><Trash2 className="w-3.5 h-3.5" /></button>
          )}

          {block.type === 'heading' && (
            editable ? (
              <EditableText
                value={block.text}
                onChange={(v) => updateBlock(i, { ...block, text: v })}
                className={block.level === 1 ? 'text-xl font-bold' : block.level === 2 ? 'text-lg font-semibold' : 'text-base font-semibold'}
              />
            ) : (
              <div className={block.level === 1 ? 'text-xl font-bold' : block.level === 2 ? 'text-lg font-semibold' : 'text-base font-semibold'}>
                <InlineText text={block.text} /><ConfidenceBadge confidence={block.confidence} />
              </div>
            )
          )}

          {block.type === 'paragraph' && (
            editable ? (
              <EditableText multiline value={block.text} onChange={(v) => updateBlock(i, { ...block, text: v })} className="text-sm leading-relaxed" />
            ) : (
              <p className="text-sm leading-relaxed text-gray-700 dark:text-white/70">
                <InlineText text={block.text} /><ConfidenceBadge confidence={block.confidence} />
              </p>
            )
          )}

          {block.type === 'list' && (
            <div className="text-sm text-gray-700 dark:text-white/70">
              {renderListItems(block.items, block.ordered)}
              <ConfidenceBadge confidence={block.confidence} />
            </div>
          )}

          {block.type === 'table' && (
            <div className="overflow-x-auto">
              {block.caption && <p className="text-xs text-gray-500 mb-1"><InlineText text={block.caption} /></p>}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    {block.headers.map((h, hi) => (
                      <th key={hi} className="border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-1.5 text-left font-semibold">
                        {editable ? (
                          <EditableText value={h} onChange={(v) => {
                            const headers = [...block.headers]; headers[hi] = v;
                            updateBlock(i, { ...block, headers });
                          }} />
                        ) : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-gray-200 dark:border-white/10 px-2 py-1.5">
                          {editable ? (
                            <EditableText value={cell} onChange={(v) => {
                              const rows = block.rows.map((r) => [...r]); rows[ri][ci] = v;
                              updateBlock(i, { ...block, rows });
                            }} />
                          ) : <InlineText text={cell} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <ConfidenceBadge confidence={block.confidence} />
            </div>
          )}

          {block.type === 'equation' && (
            <div>
              {editable ? (
                <EditableText value={block.latex} onChange={(v) => updateBlock(i, { ...block, latex: v })} className="font-mono text-sm" />
              ) : (
                <Equation latex={block.latex} />
              )}
              <ConfidenceBadge confidence={block.confidence} />
            </div>
          )}

          {block.type === 'figure' && (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-white/15 px-3 py-2 text-sm text-gray-600 dark:text-white/60">
              <span className="font-semibold">[Figure{block.figureNumber ? ` ${block.figureNumber}` : ''}]</span>
              {block.caption && <span> — <InlineText text={block.caption} /></span>}
              {block.labels && block.labels.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">Labels: {block.labels.join(', ')}</div>
              )}
              <ConfidenceBadge confidence={block.confidence} />
            </div>
          )}

          {(block.type === 'note' || block.type === 'quote') && (
            <blockquote className="border-l-2 border-blue-300 dark:border-blue-500/40 pl-3 text-sm italic text-gray-600 dark:text-white/60">
              {editable ? (
                <EditableText multiline value={block.text} onChange={(v) => updateBlock(i, { ...block, text: v })} />
              ) : (
                <><InlineText text={block.text} /><ConfidenceBadge confidence={block.confidence} /></>
              )}
            </blockquote>
          )}
        </div>
      ))}
    </div>
  );
}
