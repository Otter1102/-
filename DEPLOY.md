# このフォルダをそのまま GitHub にアップする

**すべて英語のファイル名**になっています。Vercel のビルドが通ります。

## 方法1: このフォルダから新規 push（おすすめ）

1. GitHub でリポジトリを用意（空でOK）
2. ターミナルでこのフォルダに移動:
   ```bash
   cd "vault/08プライベート/物件情報/site-upload"
   ```
3. 以下を実行（`YOUR_REPO_URL` を実際のリポジトリURLに変更）:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: site with English filenames"
   git branch -M main
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

## 方法2: 既存リポジトリを上書きする

既存の GitHub リポジトリ（日本語ファイル名のやつ）を、このフォルダの内容で置き換える場合:

```bash
cd "vault/08プライベート/物件情報/site-upload"
git init
git add .
git commit -m "Replace with English filenames for Vercel"
git branch -M main
git remote add origin YOUR_EXISTING_REPO_URL
git push -u origin main --force
```

`--force` で既存のファイル（日本語名）をすべてこの内容で上書きします。

## ファイル一覧（すべて英語）

- index.html
- styles.css
- script.js
- scrape.js
- sources.json
- package.json
- vercel.json
- data.json
- otter.png
- bg-marble.png
- README.md
- scrape-workflow.txt
- .gitignore
- .github/workflows/scrape.yml

Vercel の **Root Directory** は空（`.`）のままでOKです。
