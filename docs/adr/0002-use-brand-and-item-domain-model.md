# ChainBiteではBrandとItemを中心にモデル化する

**Status: accepted**

ChainBiteはRSSフィードを集約するアプリではなく、外食チェーン・コンビニの公式情報を収集するアプリである。NexusFeedの `Source`、`Category`、`NewsItem` をそのまま持ち込まず、公式情報源を表す `Brand` と、公式サイト上の1件の情報を表す `Item` を中心にする。公式サイトごとの差分は `BrandAdapter` で吸収し、共通パイプラインには `RawItem` を渡す。取得時の生データは `rawPayload` に残し、分類ルールを後から再実行できるようにする。

## Considered Options

- RSSの `Source` / `Category` / `NewsItem` モデルを流用する
- 公式サイトごとに別モデルを作る
- `Brand` / `Item` とアダプター境界を採用する（採用）

## Consequences

- RSS以外のHTML/APIにも対応でき、公式サイト単位の差分を共通処理から隔離できる
- ブランド、情報タイプ、公開期間などChainBite固有の要件を自然に表現できる
- アダプターの実装数は増えるが、RSS固有の不要な概念や移行用コードを持たずに済む
- `rawPayload` により、取得済みデータを使ったタグ判定の改善が可能になる
