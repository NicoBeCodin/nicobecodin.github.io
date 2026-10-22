import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { marked } from 'marked';

const articles = [
  { file: 'building-a-dex-part-3.md', figures: ['hotstuff-topology', 'hotstuff'] },
  { file: 'building-a-dex-part-4.md', figures: ['state-sharing', 'merkle', 'capacity'] },
  { file: 'how-a-solana-zk-mixer-works-leafpay.md', figures: ['leafpay-private-withdrawal', 'leafpay-tree-rollup', 'leafpay-memo-indexing'] },
];

for (const article of articles) {
  const file = new URL(`../content/posts/${article.file}`, import.meta.url);
  const { data, content } = matter(readFileSync(file, 'utf8'));
  for (const field of ['title', 'description', 'readTime']) {
    assert.equal(typeof data[field], 'string', `${article.file}: ${field} must stay a string`);
  }
  // Pages CMS serializes a YAML date as an unquoted timestamp. Accept that
  // representation without altering the article or discarding its edit.
  assert(data.date instanceof Date || typeof data.date === 'string', `${article.file}: invalid date`);
  const tokens = marked.lexer(content);
  for (const name of article.figures) {
    const matches = tokens.filter(token => token.type === 'paragraph'
      && token.tokens?.length === 1 && token.tokens[0].type === 'link'
      && token.tokens[0].href === `#figure-${name}`);
    assert.equal(matches.length, 1, `${article.file}: keep exactly one standalone Figure link for ${name}`);
  }
  assert(!tokens.some(token => token.type === 'html'), `${article.file}: use Markdown rather than raw HTML`);
}
console.log('CMS article metadata and figure placeholders checked.');
