import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { marked } from 'marked';
import matter from 'gray-matter';
import { splitArticleFigures } from '../lib/article-figures.ts';

test('CMS config targets only article 4 and preserves frontmatter fields', () => {
  const require = createRequire(import.meta.url);
  const yaml = createRequire(require.resolve('gray-matter'))('js-yaml');
  const config = yaml.safeLoad(readFileSync(new URL('../.pages.yml', import.meta.url), 'utf8'));
  assert.equal(config.content.length, 1);
  const entry = config.content[0];
  assert.equal(entry.path, 'content/posts/building-a-dex-part-4.md');
  assert.deepEqual(entry.operations, { create: false, rename: false, delete: false });
  assert.deepEqual(entry.fields.map(field => field.name).sort(), ['body', 'date', 'description', 'part', 'readTime', 'series', 'title']);
  assert.equal(entry.fields.find(field => field.name === 'body').type, 'rich-text');
});

test('all three article figures render from Markdown, with prose retained', () => {
  const { content } = matter(readFileSync(new URL('../content/posts/building-a-dex-part-4.md', import.meta.url), 'utf8'));
  const sections = splitArticleFigures(marked.parse(content));
  assert.deepEqual(sections.filter(s => s.type === 'figure').map(s => s.name), ['state-sharing', 'merkle', 'capacity']);
  assert(sections.filter(s => s.type === 'html').map(s => s.value).join('').includes('What&#39;s next'));
});

test('legacy animation markers still work', () => {
  assert.deepEqual(splitArticleFigures('before<!-- interactive:hotstuff -->after'), [
    { type: 'html', value: 'before' }, { type: 'figure', name: 'hotstuff' }, { type: 'html', value: 'after' },
  ]);
});

test('link labels and extra attributes may change without losing figures', () => {
  const html = '<p>\n<a rel="noopener" href="#figure-merkle" title="Diagram"><strong>Tree</strong></a>\n</p>';
  assert.equal(splitArticleFigures(html)[1].name, 'merkle');
});

test('normal, inline and unknown links are not converted', () => {
  for (const source of ['[Unknown](#figure-unknown)', 'See [this tree](#figure-merkle) here.', '[Link](https://example.com/#figure-merkle)', '[Tree](#figure-merkle) and [another link](https://example.com)']) {
    const html = marked.parse(source);
    assert.deepEqual(splitArticleFigures(html), [{ type: 'html', value: html }]);
  }
});
