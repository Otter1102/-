# 物件情報サイト（構築用）

- **データ**: 物件は **sources.json** のURLからビルド時にスクレイピングし、**data.json** を生成。サイトは data.json を読んで表示する。
- **メモ**: ひとつ上の **メモ.txt** を更新したら、**sources.json** の該当URL・fallback を合わせて更新し、ビルドし直す。

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

- **Root Directory**: 必ず **`vault/08プライベート/物件情報/サイト`** にすること。
- デプロイ時に `npm install && npm run build` が実行され、その時点の物件サイトからスクレイピングして data.json が更新される。
- 設定後は **Redeploy** で反映。

## ファイル

- `index.html` … メイン（メモの内容を反映）
- `styles.css` … スタイル
- `script.js` … カルーセル

画像は `index.html` の `<img src="...">` で差し替え可能。
