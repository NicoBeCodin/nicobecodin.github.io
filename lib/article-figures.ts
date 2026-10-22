export const figureNames = ['hotstuff', 'hotstuff-topology', 'state-sharing', 'merkle', 'capacity', 'leafpay-private-withdrawal', 'leafpay-tree-rollup', 'leafpay-memo-indexing'] as const;
export type FigureName = typeof figureNames[number];
export type ArticleSection = { type: 'html'; value: string } | { type: 'figure'; name: FigureName };

// Plain Markdown links survive rich-text editing. Only standalone, known links
// become figures; normal links and legacy article HTML remain unchanged.
export function splitArticleFigures(html: string): ArticleSection[] {
  const names = figureNames.join('|');
  const pattern = new RegExp(
    `<!-- interactive:(${names}) -->|<p>\\s*<a\\b(?=[^>]*\\bhref=["']#figure-(${names})["'])[^>]*>(?:(?!<\\/a>)[\\s\\S])*<\\/a>\\s*<\\/p>`,
    'g',
  );
  const sections: ArticleSection[] = [];
  let cursor = 0;
  for (const match of html.matchAll(pattern)) {
    sections.push({ type: 'html', value: html.slice(cursor, match.index) });
    sections.push({ type: 'figure', name: (match[1] ?? match[2]) as FigureName });
    cursor = match.index + match[0].length;
  }
  sections.push({ type: 'html', value: html.slice(cursor) });
  return sections;
}
