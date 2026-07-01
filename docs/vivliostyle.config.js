const documentConfig = require('./document.config.json');

module.exports = {
  title: documentConfig.title,
  author: documentConfig.author,
  language: documentConfig.language,
  size: documentConfig.size,
  entry: ['.vivliostyle/generated/document-bundle.md'],
  theme: ['styles/document.css'],
  output: [documentConfig.output],
  workspaceDir: '.vivliostyle/workspace',
};
