const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = process.cwd();
const sourceDir = path.join(root, 'docs', 'spec');
const generatedDiagramDir = path.join(root, 'docs', 'spec', 'assets', 'generated');
const outputDir = root;
const outputFile = path.join(outputDir, 'spec-bundle.md');

const files = [
  { file: '00-cover.md', toc: false },
  { file: '01-overview.md', toc: true },
  { file: '02-login.md', toc: true },
  { file: '03-order-import.md', toc: true },
  { file: '04-stock-allocation.md', toc: true },
  { file: '05-result-export.md', toc: true },
  { file: '90-data-and-files.md', toc: true },
  { file: '99-appendix.md', toc: true },
];

const counters = [0, 0, 0, 0];
const tocItems = [];
let mermaidIndex = 0;

function slugify(text, number) {
  return `${number}-${text}`
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function nextNumber(level) {
  counters[level - 1] += 1;
  for (let i = level; i < counters.length; i += 1) {
    counters[i] = 0;
  }
  return counters.slice(0, level).join('.');
}

function injectAnchors(markdown, includeInToc) {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(#{1,4})\s+(.+)$/.exec(line);
      if (!match || !includeInToc) {
        return line;
      }

      const level = match[1].length;
      const title = match[2].trim();
      const number = nextNumber(level);
      const id = slugify(title, number);
      tocItems.push({ level, number, title, id });
      return `<span id="${id}"></span>\n\n${line}`;
    })
    .join('\n');
}

function renderMermaid(source, baseName) {
  fs.mkdirSync(generatedDiagramDir, { recursive: true });

  const mmdFile = path.join(generatedDiagramDir, `${baseName}.mmd`);
  const svgFile = path.join(generatedDiagramDir, `${baseName}.svg`);
  const mmdPath = path.relative(root, mmdFile).replace(/\\/g, '/');
  const svgPath = path.relative(root, svgFile).replace(/\\/g, '/');
  fs.writeFileSync(mmdFile, source.trim() + '\n', 'utf8');

  execFileSync(
    'cmd',
    [
      '/c',
      `chcp 65001 > nul && npx mmdc -i ${mmdPath} -o ${svgPath} -b transparent`,
    ],
    { cwd: root, stdio: 'inherit' },
  );

  return svgPath;
}

function replaceMermaidBlocks(markdown, sourceName) {
  return markdown.replace(
    /```mermaid\s*\n([\s\S]*?)\n```/g,
    (_, diagramSource) => {
      mermaidIndex += 1;
      const baseName = `${path.basename(sourceName, '.md')}-${String(mermaidIndex).padStart(2, '0')}`;
      const svgPath = renderMermaid(diagramSource, baseName);
      return `![システムフロー図](${svgPath})`;
    },
  );
}

function buildToc() {
  const lines = [
    '<section class="toc unnumbered">',
    '',
    '# 目次',
    '',
    '<nav>',
    '  <ol class="toc-list">',
  ];

  for (const item of tocItems) {
    lines.push(
      `    <li class="toc-level-${item.level}"><a href="#${item.id}"><span class="toc-number">${item.number}</span><span class="toc-title">${item.title}</span></a></li>`,
    );
  }

  lines.push('  </ol>', '</nav>', '', '</section>');
  return lines.join('\n');
}

const bundledParts = [
  '---',
  'title: 機能仕様書サンプル',
  'author: 開発チーム',
  'date: 2026-06-30',
  '---',
  '',
];

for (const entry of files) {
  const fullPath = path.join(sourceDir, entry.file);
  const markdown = fs.readFileSync(fullPath, 'utf8');
  const processed = injectAnchors(
    replaceMermaidBlocks(markdown, entry.file),
    entry.toc,
  );
  bundledParts.push(processed, '');

  if (entry.file === '00-cover.md') {
    bundledParts.push('__TOC__', '');
  }
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  outputFile,
  bundledParts.join('\n').replace('__TOC__', buildToc()),
  'utf8',
);

console.log(`Generated ${path.relative(root, outputFile)}`);
