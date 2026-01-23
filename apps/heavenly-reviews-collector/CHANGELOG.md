# @sui-chrome-extensions/heavenly-reviews-collector

## 0.3.1

### Patch Changes

- [#7](https://github.com/Suntory-N-Water/sui-chrome-extensions/pull/7) [`0ba3339`](https://github.com/Suntory-N-Water/sui-chrome-extensions/commit/0ba3339001a5685f377c884ad3ec6361a545a515) Thanks [@Suntory-N-Water](https://github.com/Suntory-N-Water)! - バックグラウンド処理のリトライ機能と UI 改善を追加

  - async-retry パッケージを追加し、URL 収集とレビュー抽出処理にリトライロジックを実装（最大 3 回試行、2 秒間隔）
  - タイムアウトやタブ ID エラーなどの一時的なエラーに対してリトライを実行
  - ReviewsDashboard に写真スコアの平均表示を追加
  - OptionsPage のレイアウトを調整（flexbox の改善）

## 0.3.0

### Minor Changes

- [#5](https://github.com/Suntory-N-Water/sui-chrome-extensions/pull/5) [`8108158`](https://github.com/Suntory-N-Water/sui-chrome-extensions/commit/810815815e76373e00dfa0f497e4ec06d64f4970) Thanks [@Suntory-N-Water](https://github.com/Suntory-N-Water)! - - 女の子名によるレビューフィルタリング機能を追加
  - オール 5（満点）レビュー除外フィルタを追加
  - アクティブフィルタ数のバッジ表示を追加
  - フィルタクリア機能を追加
  - CLAUDE.md、README.md、アイコン画像を追加

## 0.2.0

### Minor Changes

- [#3](https://github.com/Suntory-N-Water/sui-chrome-extensions/pull/3) [`2748b75`](https://github.com/Suntory-N-Water/sui-chrome-extensions/commit/2748b751e73ac2ed66bfddfd817909f86fe7ee91) Thanks [@Suntory-N-Water](https://github.com/Suntory-N-Water)! - Frontend Design Overhaul: Tailwind v4 setup, Heavenly theme application, and complete UI redesign (Options, Dashboard, Dialog).

## 0.1.0

### Minor Changes

- [#1](https://github.com/Suntory-N-Water/sui-chrome-extensions/pull/1) [`0e9c412`](https://github.com/Suntory-N-Water/sui-chrome-extensions/commit/0e9c412be6a2887e4de78901690a5e9f32baf535) Thanks [@Suntory-N-Water](https://github.com/Suntory-N-Water)! - H Reviews Collector beta release.
