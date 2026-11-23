/** In-browser, vector-text A4 export. Text stays on this device. */
export interface ProfilePdfModel {
  hero: string;
  archetype?: string;
  sections: ReadonlyArray<{ title: string; lines: ReadonlyArray<string> }>;
  note?: string;
}
export type ProfilePdfFonts = readonly [ArrayBuffer, ArrayBuffer];
export const PROFILE_PDF_FILENAME = 'Ориента — профкарта.pdf';
const FONT_URL = '/design/profile-pdf/';
export async function loadProfilePdfFonts(signal?: AbortSignal): Promise<ProfilePdfFonts> {
  const get = async (filename: string) => {
    const response = await fetch(FONT_URL + filename, { signal });
    if (!response.ok) throw Error('Не удалось загрузить шрифты профкарты.');
    return await response.arrayBuffer();
  };
  return await Promise.all([get('OrientaText.ttf'), get('OrientaTitle.ttf')]);
}

const encoder = new TextEncoder();
const ascii = (s: string) => encoder.encode(s);
const hex = (n: number) => n.toString(16).padStart(4, '0');
const n = (x: number) => Number(x.toFixed(3));
const clean = (s: string) => s.normalize().replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').replace(/\uFE0F/g, '');
const join = (...chunks: Uint8Array[]) => {
  const out = new Uint8Array(chunks.reduce((sum, b) => sum + b.length, 0));
  let offset = 0; for (const b of chunks) { out.set(b, offset); offset += b.length; }
  return out;
};
class Pdf {
  private readonly parts: Uint8Array[] = [];
  reserve() { return this.parts.push(new Uint8Array()); }
  set(id: number, body: string | Uint8Array) { this.parts[id - 1] = typeof body === 'string' ? ascii(body) : body; }
  add(body: string | Uint8Array) { const id = this.reserve(); this.set(id, body); return id; }
  stream(bytes: Uint8Array, more = '') { return this.add(join(ascii(`<< /Length ${bytes.length}${more} >>\nstream\n`), bytes, ascii('\nendstream'))); }
  finish(root: number) {
    const header = join(ascii('%PDF-1.4\n%'), Uint8Array.of(226, 227, 207, 211), ascii('\n'));
    let offset = header.length;
    const body = this.parts.map((part, i) => {
      const bytes = join(ascii(`${i + 1} 0 obj\n`), part, ascii('\nendobj\n'));
      const start = offset; offset += bytes.length;
      return { bytes, start };
    });
    const xref = 'xref\n0 ' + (body.length + 1) + '\n0000000000 65535 f \n' + body.map(p => String(p.start).padStart(10, '0') + ' 00000 n \n').join('') +
      `trailer\n<< /Size ${body.length + 1} /Root ${root} 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
    return join(header, ...body.map(p => p.bytes), ascii(xref));
  }
}

class EmbeddedFont {
  private readonly bytes: Uint8Array;
  private readonly d: DataView;
  private readonly head: number;
  private readonly hhea: number;
  private readonly hmtx: number;
  private readonly cmap: number;
  private readonly units: number;
  private readonly cids = new Map<string, { cid: number; glyph: number; width: number }>();
  constructor(source: ArrayBuffer, readonly name: string, readonly serif: boolean) {
    this.bytes = new Uint8Array(source); this.d = new DataView(source);
    const table = (tag: string) => {
      for (let i = 0; i < this.u16(4); i++) {
        const p = 12 + 16 * i;
        if (String.fromCharCode(...this.bytes.slice(p, p + 4)) === tag) return this.d.getUint32(p + 8);
      }
      throw Error('Неизвестный формат шрифта профкарты.');
    };
    this.head = table('head'); this.hhea = table('hhea'); this.hmtx = table('hmtx'); this.units = this.u16(this.head + 18);
    const cmap = table('cmap');
    for (let i = 0; i < this.u16(cmap + 2); i++) {
      const p = cmap + 4 + 8 * i, platform = this.u16(p);
      const sub = cmap + this.d.getUint32(p + 4);
      if ((platform === 0 || platform === 3) && this.u16(sub) === 4) { this.cmap = sub; return; }
    }
    throw Error('Шрифт профкарты не содержит таблицу Юникода.');
  }
  private u16(i: number) { return this.d.getUint16(i); }
  private scaled(x: number) { return Math.round(x * 1000 / this.units); }
  private glyph(ch: string) {
    const code = ch.codePointAt(0) || 0;
    if (code > 0xffff) return 0;
    const t = this.cmap, count = this.u16(t + 6) / 2, end = t + 14, start = end + 2 * count + 2;
    for (let i = 0; i < count; i++) {
      const off = i * 2;
      if (code > this.u16(end + off)) continue;
      const min = this.u16(start + off);
      if (code < min) return 0;
      const delta = this.d.getInt16(start + 2 * count + off), range = start + 4 * count + off;
      const shift = this.u16(range);
      if (!shift) return (code + delta) & 0xffff;
      const glyph = this.u16(range + shift + 2 * (code - min));
      return glyph ? (glyph + delta) & 0xffff : 0;
    }
    return 0;
  }
  private map(ch: string) {
    const existing = this.cids.get(ch); if (existing) return existing;
    const glyph = this.glyph(ch) || this.glyph('□') || this.glyph('?');
    const width = this.scaled(this.u16(this.hmtx + 4 * Math.min(glyph, this.u16(this.hhea + 34) - 1)));
    const data = { cid: this.cids.size + 1, glyph, width }; this.cids.set(ch, data); return data;
  }
  width(str: string, size: number) { return [...str].reduce((sum, c) => sum + this.map(c).width, 0) * size / 1000; }
  encode(str: string) { return [...str].map(c => hex(this.map(c).cid)).join(''); }
  embed(pdf: Pdf) {
    const entries = [...this.cids], gid = new Uint8Array((entries.length + 1) * 2), ugid = new DataView(gid.buffer);
    for (const [, m] of entries) ugid.setUint16(m.cid * 2, m.glyph);
    const fontData = pdf.stream(this.bytes, ' /Length1 ' + this.bytes.length);
    const scaleField = (offset: number) => this.scaled(this.d.getInt16(offset));
    const descriptor = pdf.add(`<< /Type /FontDescriptor /FontName /${this.name} /Flags ${this.serif ? 6 : 4} /FontBBox [${[36,38,40,42].map(i => scaleField(this.head + i)).join(' ')}] /ItalicAngle 0 /Ascent ${scaleField(this.hhea + 4)} /Descent ${scaleField(this.hhea + 6)} /CapHeight 680 /StemV ${this.serif ? 96 : 72} /FontFile2 ${fontData} 0 R >>`);
    const gidId = pdf.stream(gid);
    const cidFont = pdf.add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${this.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap ${gidId} 0 R /W [1 [${entries.map(([, m]) => m.width).join(' ')}]] >>`);
    let mappings = '';
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      mappings += `${batch.length} beginbfchar\n` + batch.map(([c, m]) => '<' + hex(m.cid) + '> <' + c.split('').map(v => hex(v.charCodeAt(0))).join('') + '>').join('\n') + '\nendbfchar\n';
    }
    const cm = pdf.stream(ascii(('/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
      '/CMapName /OrientaUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <ffff>\nendcodespacerange\n') + mappings +
      'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n'));
    return pdf.add(`<< /Type /Font /Subtype /Type0 /BaseFont /${this.name} /Encoding /Identity-H /DescendantFonts [${cidFont} 0 R] /ToUnicode ${cm} 0 R >>`);
  }
}

const W = 595.28, H = 841.89, M = 44, LEFT = M + 20, RIGHT = W - M - 20, BODY = RIGHT - LEFT;
const palette = { paper:'#fbf6e7', green:'#243e32', pale:'#f8e8b7', ink:'#352e24', shade:'#62533f', gold:'#b69254', line:'#d7c6a0', tint:'#f1e5c9', white:'#fffef8' };
const rgb = (c: string) => [1, 3, 5].map(i => n(Number.parseInt(c.slice(i, i + 2), 16) / 255)).join(' ');
const splitScore = (line: string) => line.match(/^(.+?):\s*(\d+(?:[,.]\d+)?\s*(?:\/\s*\d+|балл[аов]*|%))(?:\s*)$/u);
function wrap(input: string, font: EmbeddedFont, size: number, max: number): string[] {
  const result: string[] = [];
  for (const paragraph of clean(input).split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (font.width(line ? line + ' ' + word : word, size) <= max) { line = line ? line + ' ' + word : word; continue; }
      if (line) { result.push(line); line = ''; }
      if (font.width(word, size) <= max) { line = word; continue; }
      for (const c of word) {
        if (line && font.width(line + c, size) > max) { result.push(line); line = ''; }
        line += c;
      }
    }
    result.push(line);
  }
  return result;
}

export function buildProfilePdf(model: ProfilePdfModel, sources: ProfilePdfFonts): Uint8Array {
  const regular = new EmbeddedFont(sources[0], 'OrientaText', false), heading = new EmbeddedFont(sources[1], 'OrientaTitle', true);
  const pages: string[][] = []; let points: string[] = [], y = 0;
  const rect = (x: number, top: number, w: number, h: number, color: string) => points.push(`${rgb(color)} rg ${n(x)} ${n(H - top - h)} ${n(w)} ${n(h)} re f`);
  const draw = (str: string, x: number, top: number, size: number, color = palette.ink, font = regular) => {
    if (!str) return;
    points.push(`BT /${font === heading ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${n(x)} ${n(H - top)} Tm <${font.encode(str)}> Tj ET`);
  };
  const page = () => {
    points = []; pages.push(points);
    rect(0, 0, W, H, palette.paper);
    rect(M, H - 45, W - 2*M, 0.65, palette.gold);
    draw('ОРИЕНТА  /  ПУТЬ ГЕРОЯ', M, H - 26, 9.5, palette.shade);
    if (pages.length > 1) {
      rect(M, 38, W - 2*M, 29, palette.green);
      draw('ПРОФКАРТА ГЕРОЯ', LEFT, 57, 10, palette.white, heading);
      y = 88;
    }
  };
  const ensure = (height: number) => { if (y + height > H - 58) page(); };
  page();
  const hero = wrap(model.hero.trim() || 'Искатель', heading, 21, BODY);
  const archetype = model.archetype ? wrap(model.archetype, regular, 13, BODY) : [];
  const bannerHeight = 120 + hero.slice(0, 3).length * 25 + archetype.slice(0, 2).length * 18;
  rect(M, 35, W - 2*M, bannerHeight, palette.green);
  rect(M, 35, 4, bannerHeight, palette.gold);
  draw('ОРИЕНТА   /   ЛИЧНЫЙ МАРШРУТ', LEFT, 62, 10, palette.pale);
  draw('Профкарта Героя', LEFT, 108, 34, palette.white, heading);
  let bannerY = 144;
  for (const line of hero.slice(0, 3)) { draw(line, LEFT, bannerY, 21, palette.white, heading); bannerY += 25; }
  for (const line of archetype.slice(0, 2)) { draw(line, LEFT, bannerY, 13, palette.pale); bannerY += 18; }
  y = 35 + bannerHeight + 24;
  const section = (title: string, lines: ReadonlyArray<string>, index: number) => {
    const content = lines.filter(text => text.trim());
    if (!content.length) return;
    const prefix = (index + 1).toString().padStart(2, '0');
    const showTitle = (continued = false) => {
      const titleLines = wrap(title + (continued ? ' / продолжение' : ''), heading, 17, BODY - 35);
      const height = 17 + titleLines.length * 20;
      ensure(height + 24);
      rect(M, y, W - 2*M, height, palette.tint);
      rect(M, y, 3, height, palette.gold);
      draw(prefix, LEFT, y + 23, 10, palette.shade);
      titleLines.forEach((line, i) => draw(line, LEFT + 30, y + 24 + i * 20, 17, palette.green, heading));
      y += height + 12;
    };
    const scoreBlock = /^(Профессиональные интересы:|Мотивация:)/i.test(title);
    const continueLine = (height = 15) => { if (y + height > H - 57) { page(); showTitle(true); } };
    showTitle();
    for (const raw of content) {
      const score = scoreBlock && splitScore(raw.trim());
      if (score) {
        const label = wrap(score[1], regular, 11.5, BODY - 94);
        const height = Math.max(29, label.length * 15 + 11);
        continueLine(height);
        rect(LEFT, y, BODY, height - 3, palette.white);
        rect(LEFT, y + height - 3, BODY, 0.6, palette.line);
        label.forEach((line, i) => draw(line, LEFT + 9, y + 17 + i * 15, 11.5));
        const size = 12; draw(score[2], RIGHT - 9 - heading.width(score[2], size), y + 17, size, palette.green, heading);
        y += height + 2;
        continue;
      }
      const wrapped = wrap(raw, regular, 11.5, BODY - 15);
      for (let i = 0; i < wrapped.length; i++) {
        continueLine(18);
        if (i === 0) rect(LEFT + 1, y + 6, 3, 3, palette.gold);
        draw(wrapped[i], LEFT + 12, y + 11.4, 11.5);
        y += 16.6;
      }
      y += 6;
    }
    y += 17;
  };
  model.sections.forEach((s, i) => section(s.title, s.lines, i));
  if (model.note?.trim()) {
    for (const line of wrap(model.note, regular, 9.5, BODY)) {
      ensure(15);
      draw(line, LEFT, y + 10, 9.5, palette.shade); y += 14;
    }
  }
  const prior = points;
  pages.forEach((p, i) => {
    points = p; const tag = `${i + 1} / ${pages.length}`;
    draw(tag, W - M - regular.width(tag, 9.5), H - 26, 9.5, palette.shade);
  });
  points = prior;
  const pdf = new Pdf(), root = pdf.reserve(), parent = pdf.reserve(), type1 = regular.embed(pdf), type2 = heading.embed(pdf);
  const ids = pages.map(commands => {
    const stream = pdf.stream(ascii(commands.join('\n')));
    return pdf.add(`<< /Type /Page /Parent ${parent} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${type1} 0 R /F2 ${type2} 0 R >> >> /Contents ${stream} 0 R >>`);
  });
  pdf.set(parent, `<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id => id + ' 0 R').join(' ')}] >>`);
  pdf.set(root, `<< /Type /Catalog /Pages ${parent} 0 R /Lang (ru-RU) >>`);
  return pdf.finish(root);
}
