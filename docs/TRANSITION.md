# ChainBite プロジェクト刷新・移行記録書

本書は、NexusFeed から ChainBite へのプロジェクト移行・刷新にあたり、2026-09-30 に実施した壁打ち（Grilling & Domain Modeling）の意思決定プロセス、完了した刷新作業、および今後の具体的課題を記録した文書です。

その後の再検討により、RSS固有のドメインモデルは分離しつつ、NexusFeedで検証済みのHTTP・robots.txt・画像抽出・UIの実装はChainBite向けに移植する方針へ更新しています。

---

## 1. 刷新の背景と基本戦略

### 1.1 プロジェクトの分離
- **NexusFeed**: 過去に開発した RSS ニュースアグリゲーター。
- **ChainBite**: 外食チェーンやコンビニの公式サイトから新商品・期間限定商品・キャンペーン情報を収集・整理する情報ウォッチャー。
- [CONTEXT.md](file:///C:/Users/KazuhiroSato/agy-projects/chain-bite/CONTEXT.md) セクション 1 & 8 の原則に基づき、GitHub、データベース、環境変数、設計を完全に分離する。

### 1.2 Git 履歴と移行アプローチ
- **決定方針**: 
  1. 旧リポジトリのローカル環境上で不要ファイルの削除、新仕様（ChainBite）に合わせたデータモデル・コードの再構築を実施する。
  2. 全体の刷新と動作確認が完了した段階で、既存の `.git` ディレクトリを削除し、`git init` を実行する。
  3. これにより、過去の試行錯誤やコミット履歴にノイズを残さず、ChainBite 専用の新しいリポジトリとして「Initial Commit」からスタートする。
  4. NexusFeed 時代の過去コードや議論履歴は、GitHub 上のリモートリポジトリ（`gp-sato/news-aggregator`）でいつでも参照可能。

---

## 2. 壁打ち（Grilling）で確定した主要設計決定

1. **ドキュメントの整理**:
   - `docs/` 配下の旧計画書（5件）・旧ADR（2件）・設計メモ（2件）は、現在の ChainBite 要件と混同を生むため全削除（ディレクトリ構造は維持）。
2. **初期対象ブランド（MVP 4社）**:
   - ハンバーガー: **マクドナルド** (`mcdonalds`)
   - 牛丼: **吉野家** (`yoshinoya`)
   - コンビニ: **セブン-イレブン** (`seven-eleven`)
   - 麺類: **丸亀製麺** (`marugame-seimen`)
3. **データモデリング**:
   - ブランドを独立テーブル `Brand` として定義（`prisma/seed.ts` で初期投入）。
   - 情報レコードのモデル名は `Item`。
   - 情報タイプは複数保持可能な PostgreSQL 文字列配列 `types String[]`。
   - ルール変更時の再判定に備え、取得時の元データを `rawPayload Json?` に保持。
   - 実行ログ用テーブル（旧 `JobExecution` 等）は初期 MVP から除外し、コンソール／Vercel ログで運用。
4. **クローラー方式**:
   - チェーンごとに専用のアダプター（`lib/adapters/` 配下）を実装。
   - Vercel Cron（日次 1 回）により、単一のジョブ内で 4 社を順次実行し DB へ UPSERT するシンプル設計（初期から Queue 等の分散処理は持ち込まない）。
5. **UI / 閲覧体験**:
   - カード形式の一覧表示。カードをクリックすると公式サイトの該当ページへ外部リンク直行（初期版ではアプリ内詳細画面は持たない）。
6. **Supabase Local の分離**:
   - `supabase/config.toml` の `project_id` を `chain-bite` に変更し、NexusFeed の DB コンテナ・ボリュームと完全分離。
   - 同時起動はせず片方ずつの起動運用とし、ポート番号（54322 / 54321）はそのまま利用。

---

## 3. 実施完了作業（2026-09-30）

| 区分 | 内容 | 影響ファイル |
| :--- | :--- | :--- |
| **パッケージ** | プロジェクト名を `chain-bite` に変更し lockfile を同期 | `package.json`, `package-lock.json` |
| **環境分離** | Supabase Local の `project_id` を `chain-bite` に変更 | `supabase/config.toml` |
| **ドキュメント** | 旧計画書・ADR・設計メモ（計9ファイル）の削除 | `docs/` 配下 |
| **旧ドメインロジックの分離** | RSS固有の収集・Queue・旧APIは実行経路から外し、汎用的な取得・画像・UIの知見はChainBiteへ移植 | `lib/http.ts`, `lib/content.ts`, `lib/robots.ts`, `lib/items.ts`, `components/item-*.tsx` |
| **スキーマ定義** | `Brand` および `Item` モデルへの刷新 | `prisma/schema.prisma` |
| **マスタデータ** | 初期 4 社の投入用スクリプト作成 | `prisma/seed.ts` |
| **アダプター型** | クローラー用共通インターフェース（`RawItem`, `BrandAdapter`）作成 | `lib/adapters/types.ts` |
| **データ取得** | `Item` 取得ロジックおよび API ルートの作成 | `lib/items.ts`, `app/api/items/route.ts` |
| **画面** | ChainBite ブランド・ブランド一覧を表示するトップページに更新 | `app/page.tsx` |
| **品質確認** | `tsc --noEmit` による型チェック通過（エラー 0 件） | 全体 |

---

## 4. 次の具体的課題（Roadmap & To-Do）

今後の実装タスクは以下の順序で進めることを推奨します。

```text
【Step 1】ローカル DB 起動・初期マイグレーション・Seed 投入
   │
【Step 2】ブランド別スクレイピングアダプターの実装 (lib/adapters/)
   │
【Step 3】ルールベース自動分類・タグ付けパイプラインの実装
   │
【Step 4】日次バッチ同期処理の実装 (app/api/cron/sync)
   │
【Step 5】カード一覧 UI とフィルター（ジャンル・ブランド・タグ）の実装（基盤実装済み）
   │
【Step 6】動作検証・.git 削除・新規リポジトリ初期化 (git init)
```

### 4.1 各ステップの詳細課題

#### Step 1: ローカル DB 起動と初回マイグレーション
- [ ] `npm run db:start`（`supabase start`）を実行し、新プロジェクト `chain-bite` のローカル DB コンテナを立ち上げる。
- [ ] 初回マイグレーション `init` を作成・適用する（`npx prisma migrate dev --name init`）。
- [ ] `npm run build` または `tsx prisma/seed.ts` でマスタデータ（4社）が正常に投入できることを確認する。

#### Step 2: ブランド別クローラーアダプターの実装 (`lib/adapters/`)
- [ ] **マクドナルド** (`lib/adapters/mcdonalds.ts`): 公式サイトのニュース・キャンペーン一覧の HTML 構造を調査し、Cheerio を用いてタイトル・URL・画像URL・公開日を抽出する。
- [ ] **吉野家** (`lib/adapters/yoshinoya.ts`): 新着・お知らせ一覧からの抽出。
- [ ] **セブン-イレブン** (`lib/adapters/seven-eleven.ts`): 新商品・地域別フェアページからの抽出。
- [ ] **丸亀製麺** (`lib/adapters/marugame.ts`): 期間限定うどん・フェア一覧からの抽出。
- [ ] 各アダプターに 5〜8 秒のタイムアウト処理（AbortController）を組み込む。

#### Step 3: ルールベース判定パイプラインの実装
- [ ] タイトルや本文の文字列からタグ（`"NEW_ITEM"`, `"LIMITED_TIME"`, `"CAMPAIGN"`, `"DISCOUNT"` 等）を自動判定する正規化ユーティリティを作成する。
- [ ] 「○月○日から期間限定」等のテキストから開始日・終了日（`startsAt`, `endsAt`）を抽出するパーサーを実装する。

#### Step 4: 日次同期バッチ (`app/api/cron/sync/route.ts`)
- [ ] 4 社のアダプターを順次実行し、重複（`url` 一意性）を防止しながら DB の `Item` テーブルへ UPSERT する Route Handler を作成。
- [ ] `CRON_SECRET` による認証チェックを組み込む。

#### Step 5: UI の実装
- [x] `components/item-list.tsx`: NexusFeedのカード、検索、無限スクロール、ブックマークをItem向けに移植。公式画像、ブランド名、タイトル、タグ、公開日を表示する。
- [x] `components/item-container.tsx`: ジャンル、ブランド、情報タイプ、後で読むによるフィルターバーを実装する。

#### Step 6: Git リセット
- [ ] ローカルでの E2E 動作確認後、`.git` を削除。
- [ ] `git init` -> `git add .` -> `git commit -m "feat: initial commit for ChainBite"` を実行。
- [ ] GitHub に新規作成した `chain-bite` リポジトリへ push。
