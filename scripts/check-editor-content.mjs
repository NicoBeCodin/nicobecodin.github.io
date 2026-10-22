import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { marked } from 'marked';

const file = new URL('../content/posts/building-a-dex-part-4.md', import.meta.url);
const { data, content } = matter(readFileSync(file, 'utf8'));
for (const field of ['title', 'description', 'date', 'series', 'readTime']) {
  assert.equal(typeof data[field], 'string', `Article field ${field} must stay a string`);
}
assert.equal(data.series, 'Building Light DEX');
assert.equal(data.part, 4);
const tokens = marked.lexer(content);
for (const name of ['state-sharing', 'merkle', 'capacity']) {
  const matches = tokens.filter(token => token.type === 'paragraph'
    && token.tokens?.length === 1 && token.tokens[0].type === 'link'
    && token.tokens[0].href === `#figure-${name}`);
  assert.equal(matches.length, 1, `Keep exactly one standalone Figure link for ${name} in the article editor`);
}
assert(!tokens.some(token => token.type === 'html'), 'Keep article 4 editor-safe: use Markdown rather than raw HTML');
console.log('Article editor metadata and figure placeholders checked.');
