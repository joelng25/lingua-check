/**
 * Merge per-glyph / per-span client rects into continuous underline bars.
 * Editors (esp. Google Docs annotated canvas) often expose one box per letter;
 * rendering each separately leaves visible gaps under the word.
 */
export function mergeUnderlineRects(
  rects: Array<DOMRect | DOMRectReadOnly>,
  options: { maxLineGap?: number } = {},
): DOMRect[] {
  const maxLineGap = options.maxLineGap ?? 6;

  const valid = rects
    .filter((rect) => rect.width > 0.5 && rect.height > 0.5)
    .map((rect) => ({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      height: rect.height,
    }))
    .sort((a, b) => a.top - b.top || a.left - b.left);

  if (valid.length === 0) return [];

  const lines: Array<typeof valid> = [];

  for (const rect of valid) {
    const line = lines.find((group) => {
      const sample = group[0];
      const threshold = Math.max(maxLineGap, sample.height * 0.55);
      return Math.abs(sample.top - rect.top) <= threshold;
    });

    if (line) {
      line.push(rect);
    } else {
      lines.push([rect]);
    }
  }

  const merged: DOMRect[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.left - b.left);

    let left = line[0].left;
    let top = line[0].top;
    let right = line[0].right;
    let bottom = line[0].bottom;

    for (let i = 1; i < line.length; i += 1) {
      const next = line[i];
      // Same line → always join into one continuous bar (fill letter gaps).
      left = Math.min(left, next.left);
      top = Math.min(top, next.top);
      right = Math.max(right, next.right);
      bottom = Math.max(bottom, next.bottom);
    }

    merged.push(new DOMRect(left, top, Math.max(right - left, 4), Math.max(bottom - top, 2)));
  }

  return merged;
}
