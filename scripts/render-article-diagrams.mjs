// Generate static reading/print fallbacks from the same SVG components.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../components/article-diagrams.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const module = { exports: {} };
new Function('require', 'exports', 'module', outputText)(require, module.exports, module);
const diagrams = module.exports;
for (const [file, component] of [
  ['hotstuff-topology', diagrams.TopologyDiagram],
  ['hotstuff-phases', diagrams.HotstuffSummaryDiagram],
  ['state-sharing', diagrams.SharingDiagram],
  ['incremental-merkle', diagrams.MerkleDiagram],
]) {
  const svg = renderToStaticMarkup(createElement(component));
  writeFileSync(new URL(`../public/diagrams/${file}.svg`, import.meta.url), svg);
  console.log(`Rendered ${file}.svg`);
}
