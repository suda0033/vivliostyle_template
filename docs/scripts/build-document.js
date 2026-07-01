const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = process.cwd();
const config = require(path.join(root, 'document.config.json'));
const sourceDir = path.join(root, config.sourceDir);
const generatedDir = path.join(root, '.vivliostyle', 'generated');
const generatedDiagramDir = path.join(generatedDir, 'diagrams');
const outputFile = path.join(generatedDir, 'document-bundle.md');

const counters = [0, 0, 0, 0];
const tocItems = [];
let mermaidIndex = 0;

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

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

function renderMermaid(source, sourceName) {
  fs.mkdirSync(generatedDiagramDir, { recursive: true });

  mermaidIndex += 1;
  const baseName = `${path.basename(sourceName, '.md')}-${String(mermaidIndex).padStart(2, '0')}`;
  const mmdFile = path.join(generatedDiagramDir, `${baseName}.mmd`);
  const svgFile = path.join(generatedDiagramDir, `${baseName}.svg`);
  const mmdPath = toPosixPath(path.relative(root, mmdFile));
  const svgPath = toPosixPath(path.relative(root, svgFile));

  fs.writeFileSync(mmdFile, source.trim() + '\n', 'utf8');

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(
    npxCommand,
    ['mmdc', '-i', mmdPath, '-o', svgPath, '-b', 'transparent'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
  );

  return svgPath;
}

function replaceMermaidBlocks(markdown, sourceName) {
  return markdown.replace(
    /```mermaid\s*\n([\s\S]*?)\n```/g,
    (_, diagramSource) => {
      const svgPath = renderMermaid(diagramSource, sourceName);
      return `![Mermaid diagram](${svgPath})`;
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

function readSource(entry) {
  const fullPath = path.join(sourceDir, entry.file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Markdown file not found: ${path.relative(root, fullPath)}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

const bundledParts = [
  '---',
  `title: ${config.title}`,
  `author: ${config.author}`,
  '---',
  '',
];

for (const entry of config.files) {
  const markdown = readSource(entry);
  const processed = injectAnchors(
    replaceMermaidBlocks(markdown, entry.file),
    entry.toc,
  );
  bundledParts.push(processed, '');

  if (entry.file === config.files[0].file) {
    bundledParts.push('__TOC__', '');
  }
}

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(
  outputFile,
  bundledParts.join('\n').replace('__TOC__', buildToc()),
  'utf8',
);

console.log(`Generated ${path.relative(root, outputFile)}`);
