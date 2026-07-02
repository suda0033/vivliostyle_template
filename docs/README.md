# PDF文書作成手順

このフォルダは、Markdown原稿をVivliostyleでPDF化するための文書作成環境です。

利用者は、基本的に次の2つだけを使います。

## 初回セットアップ

PowerShellで、このREADMEが置かれているフォルダへ移動して、次を実行します。
`setup-docs.ps1` があるフォルダです。

```powershell
.\setup-docs.ps1
```

Node.jsが入っていることを確認し、必要なnpmパッケージをインストールします。
Mermaid図のレンダリングにChromiumを含むパッケージを使うため、初回インストールはサイズが大きく(数百MB)、時間がかかることがあります。

## PDF更新

Markdown原稿を編集した後、次を実行します。
PowerShellで、このREADMEが置かれているフォルダへ移動してから実行してください。
`build-pdf.ps1` があるフォルダです。

```powershell
.\build-pdf.ps1
```

PDFは `dist/` に出力されます。
VivliostyleはPDF生成時にローカルサーバーを使うため、複数のPDF生成コマンドを同時に実行しないでください。

## 編集する主なファイル

| ファイル/フォルダ | 用途 |
| --- | --- |
| `manuscript/` | Markdown原稿 |
| `assets/` | 画像、SVG、Mermaid元ファイル |
| `styles/document.css` | PDFの見た目 |
| `document.config.json` | 文書タイトル、出力先、結合順 |

## Markdownファイルを追加した場合

`manuscript/` に新しいMarkdownファイルを追加しただけでは、PDFには含まれません。
PDFに含めるには、`document.config.json` の `files` に追加します。

例:

```json
{
  "files": [
    { "file": "00-cover.md", "toc": false },
    { "file": "01-overview.md", "toc": true },
    { "file": "02-operation.md", "toc": true },
    { "file": "03-new-feature.md", "toc": true }
  ]
}
```

`files` に書いた順番でPDFに結合されます。
目次に出したい章は `toc: true`、表紙など目次に出したくないファイルは `toc: false` にします。

## 画像と図の入れ方

画像は `assets/` に置き、**原稿ファイルからの相対パス**で参照します。

```markdown
![システム構成図](../assets/system-diagram.png)
```

Mermaid図は原稿に ```` ```mermaid ```` のコードブロックとして直接書けば、PDF生成時に自動でSVGに変換されます。

## 基本ルール

- 内容を直す場合は `manuscript/` のMarkdownを編集します。
- 見た目を直す場合は `styles/document.css` を編集します。
- PDFを直接編集せず、MarkdownやCSSを更新してから再生成します。
- `node_modules/` や `.vivliostyle/` は生成物です。手で編集しません。
