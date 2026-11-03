import React from 'react'

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Parse lines and blocks
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let tableRows: string[] = []

  const flushTable = (keyPrefix: string) => {
    if (tableRows.length === 0) return null

    const rows = tableRows.map((r) =>
      r
        .split('|')
        .map((cell) => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    )

    tableRows = []
    if (rows.length === 0) return null

    const header = rows[0]
    // Filter out separator row like |---|---|
    const bodyRows = rows.slice(1).filter((r) => !r.every((c) => c.match(/^:?-+:?$/)))

    return (
      <div key={`table-${keyPrefix}`} className="my-4 overflow-x-auto rounded-lg border border-[#d8e2df] shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#0b1724] text-white font-mono">
              {header.map((col, idx) => (
                <th key={idx} className="px-3.5 py-2.5 font-semibold tracking-wide border-b border-[#1e2d3d]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4ece9] bg-white">
            {bodyRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={rIdx % 2 === 0 ? 'bg-white hover:bg-[#f8fbf9]' : 'bg-[#fafdff] hover:bg-[#f0f6f4]'}
              >
                {row.map((cell, cIdx) => {
                  const isNumberLike = cell.includes('$') || cell.includes('%') || !isNaN(Number(cell.replace(/[\$,\.]/g, '')))
                  return (
                    <td
                      key={cIdx}
                      className={`px-3.5 py-2 text-[#243340] ${
                        isNumberLike ? 'font-mono text-right font-medium' : ''
                      }`}
                    >
                      {renderInlineFormatting(cell)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const flushCodeBlock = (keyPrefix: string) => {
    if (!inCodeBlock) return null
    const text = codeBlockContent.join('\n')
    codeBlockContent = []
    inCodeBlock = false
    return (
      <pre
        key={`code-${keyPrefix}`}
        className="my-3 p-3.5 rounded-lg bg-[#0b1724] text-[#86e2b6] font-mono text-xs overflow-x-auto border border-[#1e2e3e]"
      >
        <code>{text}</code>
      </pre>
    )
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block fences
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(flushCodeBlock(`block-${i}`))
      } else {
        if (tableRows.length > 0) {
          elements.push(flushTable(`before-code-${i}`))
        }
        inCodeBlock = true
        codeBlockContent = []
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // Markdown Table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      tableRows.push(line.trim())
      continue
    } else if (tableRows.length > 0) {
      elements.push(flushTable(`tbl-${i}`))
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} className="h-2" />)
      continue
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-lg sm:text-xl font-bold font-display text-[#0b1724] mt-5 mb-2 pb-1.5 border-b border-[#d8e2df] flex items-center gap-2"
        >
          {line.replace('# ', '')}
        </h1>
      )
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base sm:text-lg font-bold font-display text-[#0b1724] mt-4 mb-2 flex items-center gap-2"
        >
          {line.replace('## ', '')}
        </h2>
      )
      continue
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm sm:text-base font-semibold text-[#182b3a] mt-3 mb-1.5"
        >
          {line.replace('### ', '')}
        </h3>
      )
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 pl-3.5 py-1 border-l-3 border-[#2e8564] bg-[#f0f9f5] rounded-r-md text-xs sm:text-sm text-[#234538] italic font-sans"
        >
          {renderInlineFormatting(line.replace(/^>\s*/, ''))}
        </blockquote>
      )
      continue
    }

    // Bullet lists
    if (line.match(/^[-*]\s+/)) {
      const text = line.replace(/^[-*]\s+/, '')
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2.5 my-1 text-xs sm:text-sm text-[#273947]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2e8564] shrink-0 mt-1.5" />
          <div className="flex-1 leading-relaxed">{renderInlineFormatting(text)}</div>
        </div>
      )
      continue
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1 text-xs sm:text-sm text-[#273947]">
          <span className="font-mono text-[11px] font-bold text-[#0b1724] bg-[#e3ecf0] w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1 leading-relaxed">{renderInlineFormatting(numMatch[2])}</div>
        </div>
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-xs sm:text-sm text-[#253744] leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    )
  }

  // Flush trailing elements
  if (tableRows.length > 0) {
    elements.push(flushTable('final-table'))
  }
  if (inCodeBlock) {
    elements.push(flushCodeBlock('final-code'))
  }

  return <div className="space-y-0.5">{elements}</div>
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Parse inline backticks, bold, italic
  const parts: React.ReactNode[] = []
  let cursor = 0

  // Regex to match bold **...** or inline code `...`
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(text.substring(cursor, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[#0b1724]">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="px-1.5 py-0.5 rounded bg-[#ebf0ee] text-[#1c644c] font-mono text-xs font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-[#374c5d]">
          {token.slice(1, -1)}
        </em>
      )
    }
    cursor = regex.lastIndex
  }

  if (cursor < text.length) {
    parts.push(text.substring(cursor))
  }

  return parts.length > 0 ? parts : text
}
