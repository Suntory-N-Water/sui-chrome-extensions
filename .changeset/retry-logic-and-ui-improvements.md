---
'@sui-chrome-extensions/heavenly-reviews-collector': patch
---

バックグラウンド処理のリトライ機能とUI改善を追加

- async-retryパッケージを追加し、URL収集とレビュー抽出処理にリトライロジックを実装（最大3回試行、2秒間隔）
- タイムアウトやタブIDエラーなどの一時的なエラーに対してリトライを実行
- ReviewsDashboardに写真スコアの平均表示を追加
- OptionsPageのレイアウトを調整（flexboxの改善）
