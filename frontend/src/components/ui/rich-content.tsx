import { useMemo } from 'react';

type RichContentProps = {
  content: string;
  className?: string;
};

const CODE_BLOCK_TOKEN = '__CODE_BLOCK__';

export function RichContent(props: RichContentProps) {
  const html = useMemo(() => renderRichContent(props.content), [props.content]);

  return <div className={props.className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderRichContent(content: string) {
  if (!content.trim()) {
    return '';
  }

  const normalized = content.replace(/\r\n/g, '\n').trim();
  const codeBlocks: Array<{ language: string; code: string }> = [];
  const withPlaceholders = normalized.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, language: string, code: string) => {
    const index = codeBlocks.push({ language: language.trim(), code: code.replace(/\n$/, '') }) - 1;
    return `${CODE_BLOCK_TOKEN}${index}__`;
  });

  const html = blocksToHtml(withPlaceholders, codeBlocks);
  return sanitizeHtml(html);
}

function blocksToHtml(content: string, codeBlocks: Array<{ language: string; code: string }>) {
  const lines = content.split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const codeMatch = line.match(new RegExp(`^${CODE_BLOCK_TOKEN}(\\d+)__$`));
    if (codeMatch) {
      const block = codeBlocks[Number(codeMatch[1])];
      blocks.push(renderCodeBlock(block?.code ?? '', block?.language ?? ''));
      index += 1;
      continue;
    }

    if (/^<([a-zA-Z][\w:-]*)(\s|>)/.test(line)) {
      const htmlLines = [lines[index]];
      index += 1;
      while (index < lines.length && lines[index].trim()) {
        htmlLines.push(lines[index]);
        index += 1;
      }
      blocks.push(htmlLines.join('\n'));
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,6}\s+/, '');
      blocks.push(`<h${level}>${renderInline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(`<blockquote>${quoteLines.map((item) => `<p>${renderInline(item)}</p>`).join('')}</blockquote>`);
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(renderTable(tableLines));
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*+]\s+/, ''));
        index += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push('<hr />');
      index += 1;
      continue;
    }

    const paragraphLines = [lines[index]];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      const nextLine = lines[index].trim();
      if (
        /^#{1,6}\s+/.test(nextLine) ||
        /^>\s?/.test(nextLine) ||
        /^[-*+]\s+/.test(nextLine) ||
        /^\d+\.\s+/.test(nextLine) ||
        /^<([a-zA-Z][\w:-]*)(\s|>)/.test(nextLine) ||
        isTableStart(lines, index) ||
        new RegExp(`^${CODE_BLOCK_TOKEN}(\\d+)__$`).test(nextLine)
      ) {
        break;
      }
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${paragraphLines.map((item) => renderInline(item)).join('<br />')}</p>`);
  }

  return blocks.join('');
}

function renderCodeBlock(code: string, language: string) {
  const escaped = escapeHtml(code);
  const label = language ? `<div class="rich-content__code-lang">${escapeHtml(language)}</div>` : '';
  return `<pre>${label}<code>${escaped}</code></pre>`;
}

function renderTable(lines: string[]) {
  const [headerLine, , ...bodyLines] = lines;
  const headers = splitTableRow(headerLine);
  const body = bodyLines.map((line) => splitTableRow(line));

  return `
    <div class="rich-content__table-wrap">
      <table>
        <thead>
          <tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${body
            .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableStart(lines: string[], index: number) {
  if (index + 1 >= lines.length) {
    return false;
  }
  const header = lines[index].trim();
  const separator = lines[index + 1].trim();
  return header.includes('|') && /^[:|\-\s]+$/.test(separator) && separator.includes('-');
}

function renderInline(value: string) {
  let output = escapeHtml(value);

  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, '<a href="$2">$1</a>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  output = output.replace(/_([^_]+)_/g, '<em>$1</em>');
  output = output.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return output;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHtml(html: string) {
  if (typeof window === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = document.body.firstElementChild;
  if (!root) {
    return html;
  }

  const safeContainer = document.createElement('div');
  Array.from(root.childNodes).forEach((child) => {
    safeContainer.appendChild(sanitizeNode(child, document));
  });

  return safeContainer.innerHTML;
}

function sanitizeNode(node: Node, document: Document): Node {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return document.createDocumentFragment();
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const allowedTags = new Set([
    'a',
    'blockquote',
    'br',
    'code',
    'del',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'li',
    'ol',
    'p',
    'pre',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul'
  ]);

  if (!allowedTags.has(tagName)) {
    const fragment = document.createDocumentFragment();
    Array.from(element.childNodes).forEach((child) => {
      fragment.appendChild(sanitizeNode(child, document));
    });
    return fragment;
  }

  const safeElement = document.createElement(tagName);

  if (tagName === 'a') {
    const href = element.getAttribute('href') ?? '';
    if (/^(https?:\/\/|mailto:|tel:|#)/i.test(href)) {
      safeElement.setAttribute('href', href);
      if (/^https?:\/\//i.test(href)) {
        safeElement.setAttribute('target', '_blank');
        safeElement.setAttribute('rel', 'noreferrer noopener');
      }
    }
  }

  if (element.classList.contains('rich-content__table-wrap')) {
    safeElement.className = 'rich-content__table-wrap';
  }

  if (element.classList.contains('rich-content__code-lang')) {
    safeElement.className = 'rich-content__code-lang';
  }

  Array.from(element.childNodes).forEach((child) => {
    safeElement.appendChild(sanitizeNode(child, document));
  });

  return safeElement;
}
