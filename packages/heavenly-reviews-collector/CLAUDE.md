# Heavenly Reviews Collector

## 概要
特定のレビューサイトからデータを収集し、管理・分析するためのChrome拡張機能です。
React, TypeScript, Vite, Tailwind CSSを使用して構築されており、Content ScriptによるDOMスクレイピングと、Options Pageによるデータ管理機能を提供します。

## アーキテクチャ
- **Content Script**: `src/content/` - ページ上のレビュー情報（リスト、個別スコア、日付など）を抽出します。
- **Background**: `src/background/` - データ収集プロセスの調整やメッセージングを管理します。
- **UI (Options/Popup)**: `src/components/`, `src/options.tsx` - 収集データの表示、設定、収集操作のトリガーを提供します。
- **Shared Utils**: `@sui-chrome-extensions/common`, `@sui-chrome-extensions/ui` を利用しています。

## 開発ガイド

### 主要コマンド
すべてのコマンドはルートディレクトリから実行することを推奨します。

- **開発サーバー起動**:
  ```bash
  pnpm --filter heavenly-reviews-collector dev
  ```
- **ビルド**:
  ```bash
  pnpm --filter heavenly-reviews-collector build
  ```
- **型チェック**:
  ```bash
  pnpm --filter heavenly-reviews-collector type-check
  ```

### 技術スタック
- **Framework**: React 19, Vite 7
- **Styling**: Tailwind CSS 4
- **Manifest**: V3 (CRXJS Vite Plugin)

### 注意事項
- スクレイピングロジックは対象サイトのDOM構造に依存するため、サイト更新時は `src/services/scraper.ts` のセレクタを確認してください。
