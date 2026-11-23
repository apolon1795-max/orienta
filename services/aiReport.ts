type ReportItem = { title: string; details: string[] };
export type ReportBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'ordered'; start: number; items: ReportItem[] };

const storedHeadings = new Set(['На что можно опереться', 'Направления для пробы', 'Следующий шаг']);
const heading = (line: string) => {
  const clean = line.trim();
  const marked = clean.match(/^#{1,6}\s+(.+?)\s*#*$/)?.[1] ?? clean.match(/^\*\*(.+)\*\*$/)?.[1];
  if (marked) return marked;
  return storedHeadings.has(clean.replace(/:$/, '')) ? clean.replace(/:$/, '') : null;
};
const bullet = (line: string) => line.trim().match(/^[•*-]\s+(.+)$/)?.[1];
const numbered = (line: string) => line.trim().match(/^(\d{1,4})[.)]\s+(.+)$/);

export function aiReportBlocks(text: string): ReportBlock[] {
  const lines = text.split(/\r\n?|\n/).map(line => line.trim());
  const blocks: ReportBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) { i++; continue; }
    // A standalone strong line can be a heading, but list items take precedence.
    const title = heading(line);
    if (title) { blocks.push({ kind: 'heading', text: title }); i++; continue; }
    if (bullet(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const item = bullet(lines[i]);
        if (!item) break;
        items.push(item); i++;
      }
      blocks.push({ kind: 'bullets', items });
      continue;
    }
    const first = numbered(line);
    if (first) {
      const start = Number(first[1]);
      const items: ReportItem[] = [];
      while (i < lines.length) {
        const item = numbered(lines[i]);
        if (!item || Number(item[1]) !== start + items.length) break;
        i++;
        const details: string[] = [];
        while (i < lines.length && lines[i] && !heading(lines[i]) && !bullet(lines[i]) && !numbered(lines[i])) {
          details.push(lines[i]); i++;
        }
        items.push({ title: item[2], details });
        while (i < lines.length && !lines[i]) i++;
      }
      blocks.push({ kind: 'ordered', start, items });
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i] && !heading(lines[i]) && !bullet(lines[i]) && !numbered(lines[i])) {
      paragraph.push(lines[i]); i++;
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
  }
  return blocks;
}
