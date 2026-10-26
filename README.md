# ChainBite

外食チェーンやコンビニの公式サイトから、新商品・期間限定商品・キャンペーンなどを見つける情報ウォッチャーです。

## 技術スタック

- Next.js 16 / React 19 / TypeScript
- PostgreSQL (Supabase) / Prisma 7
- Tailwind CSS 4 / Vercel

## ローカル開発

```bash
npm install
copy .env.local.example .env
npm run db:start
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

環境変数やローカルDBを使わずに型チェック・Lintを実行する場合は、次を使えます。

```bash
npx tsc --noEmit
npm run lint
```

## 構成

```text
公式サイト
  ↓
BrandAdapter（ブランド別のHTML/API差分を吸収）
  ↓
RawItem
  ↓
共通の重複排除・タグ判定・UPSERT
  ↓
Item（Brandに紐づく情報レコード）
  ↓
検索API / カード一覧
```

`lib/http.ts`、`lib/content.ts`、`lib/robots.ts` には、旧NexusFeedで検証したHTTP timeout、限定的なretry、URL解決、OGP画像抽出、robots.txtキャッシュの知見を残しています。RSS固有の `Source` や `NewsItem`、Vercel Queue、JobExecutionはChainBiteの初期MVPには持ち込みません。

## 最初のデータ同期

現在は吉野家の公式RSSを対象にしています。ローカルDBを起動してマイグレーションとブランドseedを適用した後、次のコマンドで取得・保存できます。

```bash
npm run sync:yoshinoya
```

同じ処理は、Node.js runtimeのRoute Handlerからも実行できます。開発サーバー起動後、`CRON_SECRET`を設定している場合は次のように呼び出します。

```bash
curl -H "Authorization: Bearer local-development-secret-key-12345" http://localhost:3000/api/cron/sync
```

RSSのタイトル・URL・公開日時・カテゴリを`Item`へ保存し、URLをキーに再実行時はUPSERTします。取得元のRSS項目は`rawPayload`にも残します。

## 現在の状態

- `Brand` と `Item` のスキーマ、初期4ブランドのseed、Item検索APIを用意しています。
- NexusFeed時代の検索・無限スクロール・ブックマークUIをItem向けに移植しています。
- ブランド別アダプターと日次同期Cronは、公式サイトの構造を確認したうえで追加します。
- アダプターが未登録の段階で古いNexusFeed用Cronが実行されないよう、`vercel.json` には旧Cronを残していません。

## 設計ドキュメント

- [NexusFeedから再利用する知見](docs/nexusfeed-lessons.md): 過去の失敗事例と再利用ルール
- [ADR](docs/adr/): ChainBite固有の重要な設計判断
- [刷新・移行記録](docs/TRANSITION.md): NexusFeedからの移行方針と作業記録
