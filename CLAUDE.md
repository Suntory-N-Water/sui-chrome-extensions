# Chrome Extension Vite Template

## プロジェクトの概要

このプロジェクトは、React + TypeScript + Viteを使用したChrome拡張機能の開発テンプレートです。pnpmモノレポ構成により、複数の拡張機能を効率的に管理できます。

## WHY: 目的

Chrome拡張機能を迅速に開発するための、モダンなフロントエンド技術を使った基盤を提供します。共通UIコンポーネントを一元管理しながら、各拡張機能は独立して開発・ビルドできる構造を実現しています。

## WHAT: 技術スタック

- **ランタイム**: Node.js / ブラウザ
- **パッケージマネージャー**: pnpm (モノレポ)
- **ビルドツール**: Vite 7.3.1
- **言語**: TypeScript 5.9.3
- **フレームワーク**: React 19.2.3
- **スタイリング**: Tailwind CSS 4.1.18
- **UIライブラリ**: shadcn/ui (Radix UI)
- **Chrome拡張プラグイン**: @crxjs/vite-plugin
- **リンター/フォーマッター**: Biome 2.3.8

## HOW: 開発の進め方

### モノレポ構造

```
chrome-extension-vite-template/
├── packages/
│   ├── ui/                          # 共有UIコンポーネントパッケージ
│   │   ├── src/
│   │   │   ├── components/ui/       # shadcn/ui コンポーネント
│   │   │   ├── lib/utils.ts         # ユーティリティ
│   │   │   ├── index.css            # Tailwind CSS テーマ
│   │   │   └── index.ts             # エクスポート
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── example-extension/           # サンプル拡張機能
│       ├── src/
│       │   ├── App.tsx              # 拡張機能固有UI
│       │   ├── main.tsx             # エントリーポイント
│       │   └── components/          # 拡張機能固有コンポーネント
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts           # Manifest + ビルド設定
│       ├── tsconfig.json
│       └── package.json
│
├── tsconfig.base.json               # TypeScript基本設定
├── pnpm-workspace.yaml              # ワークスペース定義
├── .npmrc                           # pnpm設定
├── package.json                     # ルートパッケージ
└── biome.jsonc                      # ワークスペース全体の設定
```

### 基本コマンド

```bash
# サンプル拡張機能の開発サーバー起動
pnpm dev:example

# サンプル拡張機能のビルド
pnpm build:example

# 全パッケージのビルド
pnpm build:all

# リント・フォーマット（全パッケージ）
pnpm check      # チェックのみ
pnpm check:fix  # 自動修正

# 型チェック（全パッケージ）
pnpm type-check
```

### 検証方法

開発中の変更を確認する際は:
1. `pnpm dev:example` で開発サーバーを起動
2. `chrome://extensions/` で拡張機能を読み込み（`packages/example-extension/dist/`）
3. Biomeによるリント/フォーマットは自動実行（Hookで設定済み）

### 共有UIパッケージの使用

`@chrome-extension-template/ui` パッケージから共通コンポーネントをインポートします。

```typescript
import { Button } from '@chrome-extension-template/ui';
import '@chrome-extension-template/ui/styles';
```

### 新しい拡張機能の追加

1. `packages/` 配下に新しいディレクトリを作成
2. `example-extension` をテンプレートとして、`package.json`、`vite.config.ts`、`tsconfig.json` をコピー
3. `package.json` の `name` と `vite.config.ts` の Manifest を編集
4. ルートの `tsconfig.json` に参照を追加
5. `pnpm install` で依存関係を解決

### Chrome拡張機能の構成

- Manifest V3を使用
- 各拡張機能の `vite.config.ts` で `defineManifest` を設定
- ポップアップUIは各拡張機能の `index.html` から起動
- 共通UIコンポーネントは `@chrome-extension-template/ui` から参照