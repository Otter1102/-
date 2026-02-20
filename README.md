# 物件情報サイト（構築用）

- **データ**: 物件は **sources.json** のURLからスクレイピングし、**data.json** を生成。サイトは data.json を読んで表示する。
- **間取り**はページ内の「間取り」表記付近から取得（1LDK 等を正確に表示）。
- **インターネット/Wi-Fi** の有無・無料も取得して表示。

## メモが増えた時（新規物件を追加したい）

1. ひとつ上の **メモ.txt** に物件メモを追加する。
2. **sources.json** に1件追加する（`name`, `url`, `fallback` に価格・間取りなど可能な範囲で）。
3. 変更を **GitHub に push** する。
4. **30分以内**に GitHub Actions がスクレイプを実行して data.json を更新し、Vercel が自動で再デプロイする。すぐ反映したい場合は Vercel で「Redeploy」するか、Actions の「Run workflow」で手動実行。

## 30分ごとの自動更新（無料）※ファイル1つ追加するだけ

フォルダはアップロードしなくてOK。**ファイルを1つ作る**だけで動きます。

1. GitHub のリポジトリで **「Add file」→「Create new file」**
2. **ファイル名**の欄に、次の**1行をそのまま**入力する：  
   **`.github/workflows/scrape.yml`**  
   （スラッシュを入れると、自動で .github と workflows のフォルダができ、その中に scrape.yml が1つできるだけ）
3. **scrape-workflow.txt** の中身を**すべてコピー**して、編集エリアに貼り付ける
4. **「Commit changes」** で保存

これで 30分ごとにスクレイプが走り、data.json が更新されて push され、Vercel が再デプロイします（すべて無料）。

## 閲覧（ローカル）

```bash
cd サイト
python3 -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

## ビルド（スクレイピングで data.json 更新）

```bash
cd サイト
npm install
npm run build
```

- **sources.json** のURLにアクセスし、賃料・間取り・専有面積・アクセス・画像を取得して **data.json** を上書きする。
- 取得に失敗した物件は **sources.json** の `fallback` で表示される。画像がない場合はプレースホルダー画像を使用。

## 公開（Vercel）※ルート直でサイト表示・メモは非公開

- **Root Directory**: 必ず **`vault/08プライベート/物件情報/サイト`** にすること（リポジトリがVault全体の場合）。
- デプロイ時に `npm install && npm run build` が実行され、その時点の物件サイトからスクレイピングして **data.json が毎回新規生成**される。
- 設定後は **Redeploy** で反映。

### 中身が更新されないとき

1. **Vercel が参照しているリポジトリを確認**  
   変更を加えているリポジトリと、Vercel の「Settings → Git」で接続しているリポジトリ・ブランチが同じか確認する。別リポなら、更新しているほうを push したあと、そのリポを Vercel に接続するか、接続済みリポに手動で反映する。

2. **キャッシュを外して再デプロイ**  
   Vercel の **Deployments** → 最新のデプロイの「⋯」→ **Redeploy** を選び、**「Clear cache and deploy」** にチェックして実行。これでビルドがやり直され、`npm run build`（＝スクレイプ）が必ず実行される。

3. **ビルドログでスクレイプ実行を確認**  
   同じ Deployments の **Building** ログを開き、`Wrote data.json` や `Scraping ○○... OK` が出ているか確認。出ていなければスクレイプが失敗している（ネットエラーや Node バージョンなど）。

4. **手動でスクレイプしてから push（応急）**  
   ローカルで `npm run build` を実行し、できた **data.json** をコミットして push しても、その時点の内容でサイトが更新される。

## ファイル

- `index.html` … メイン（メモの内容を反映）
- `styles.css` … スタイル
- `script.js` … カルーセル

画像は `index.html` の `<img src="...">` で差し替え可能。
