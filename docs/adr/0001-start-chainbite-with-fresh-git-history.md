# ChainBiteは新しいGit履歴で開始する

**Status: accepted**

ChainBiteはNexusFeedの後継コードを一部利用するが、目的・ドメイン・運用環境が異なる別プロジェクトである。そのため、NexusFeedのリモートまたはアーカイブは参照用に保持し、ChainBite側は移植したコードと判断だけを含む新しいGit履歴で開始する。過去の知見の出典や失敗事例は [`nexusfeed-lessons.md`](../nexusfeed-lessons.md) とADRに記録する。

## Considered Options

- NexusFeedの全履歴をそのまま引き継ぐ
- NexusFeedを別リポジトリに残し、ChainBiteは新規履歴で開始する（採用）
- 履歴を一部だけ書き換えて統合する

## Consequences

- ChainBiteのコミット履歴が、ChainBiteの要件と意思決定に集中する
- NexusFeedの過去実装を調査する手間は残るが、参照先を失わない
- 移植したコードの由来が必要な箇所は、コミットや設計文書を参照として記録する
