# Chrome Extension Vite Template

React + TypeScript + Vite を使用した Chrome 拡張機能開発のための pnpm モノレポテンプレート

## 必要な環境

- Node.js 22 以上
- pnpm 10.0.0 以上

## セットアップ

```bash
# 依存関係をインストール
pnpm install
```

## 開発

```bash
# サンプル拡張機能の開発サーバー起動
pnpm --filter example-extension dev

# Chrome で chrome://extensions/ を開き、
# packages/example-extension/dist/ を読み込む
```

## ビルド

```bash
# 特定の拡張機能をビルド
pnpm --filter example-extension build

# 全パッケージをビルド
pnpm -r --parallel build
```

## リント・フォーマット

```bash
# チェック
pnpm check

# 自動修正
pnpm check:fix

# 型チェック
pnpm type-check
```

## プロジェクト構造

```
chrome-extension-vite-template/
├── packages/
│   ├── ui/                    # 共有UIコンポーネント
│   └── example-extension/     # サンプル拡張機能
├── tsconfig.base.json         # TypeScript基本設定
├── biome.jsonc                # リント・フォーマット設定
└── pnpm-workspace.yaml        # ワークスペース定義
```

## 新しい拡張機能の追加

```bash
# テンプレートをコピー
cp -r packages/example-extension packages/my-extension

# package.json と vite.config.ts を編集
# pnpm install
# pnpm --filter my-extension dev
```

## 共有UIコンポーネントの使用

```typescript
import { Button } from '@chrome-extension-template/ui';
import '@chrome-extension-template/ui/styles';
```

## リリース管理

このテンプレートは [Changesets](https://github.com/changesets/changesets) を使用した自動リリースシステムを採用しています。各拡張機能を独立してバージョン管理し、GitHub Releaseとして配布できます。

### 初回セットアップ（他のリポジトリで使用する場合）

このテンプレートを他のリポジトリにコピーして使用する場合は、以下の設定を変更してください。

#### 1. `.changeset/config.json` のリポジトリURLを変更

```json
{
  "changelog": [
    "@changesets/changelog-github",
    {
      "repo": "あなたのGitHubユーザー名/リポジトリ名"
    }
  ]
}
```

例: `"repo": "myname/my-chrome-extensions"`

#### 2. package.json のリポジトリURLを変更（任意）

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/あなたのユーザー名/リポジトリ名.git"
  }
}
```

### リリースフロー

#### 1. 変更を加えたらchangesetを作成

```bash
pnpm changeset
```

対話式プロンプトで以下を入力:
- 変更したパッケージを選択（例: `example-extension`）
- バージョンタイプを選択（`patch` / `minor` / `major`）
- 変更内容のサマリーを入力

これにより `.changeset/` ディレクトリに変更内容が記録されます。

#### 2. PRを作成してmainにマージ

changesetファイルをコミットしてPRを作成し、mainブランチにマージします。

```bash
git add .
git commit -m "feat: 新機能を追加"
git push origin feature/new-feature
# PRを作成してマージ
```

#### 3. Version Packages PRが自動作成される

mainにマージすると、GitHub Actionsが自動で「Version Packages」PRを作成します。このPRには以下が含まれます。

- `package.json` のバージョン更新
- `vite.config.ts` の manifest.version 更新
- `CHANGELOG.md` の自動生成

#### 4. Version Packages PRをマージしてリリース

Version Packages PRをマージすると、以下が自動実行されます。

1. ビルドの実行
2. gitタグの作成（例: `example-extension@0.0.2`）
3. ZIPファイルの作成
4. GitHub Releaseの作成とZIPの添付

### タグ命名規則

`{パッケージ名}@{バージョン}` 形式でタグが作成されます。

```
example-extension@0.0.1
example-extension@0.0.2
my-extension@1.0.0
```

### 注意点

- `packages/ui` は `private: true` なのでリリース対象外です
- Changesetsが自動でChangelogを生成します
- GitHub Releaseには拡張機能のインストール手順が自動で記載されます
- Chrome Web Storeへのアップロードは手動で行います（ZIPファイルをダウンロードして使用）

## 技術スタック

- Vite 7.3.1
- React 19.2.3
- TypeScript 5.9.3
- Tailwind CSS 4.1.18
- Biome 2.3.8
- @crxjs/vite-plugin
- shadcn/ui
- Changesets (バージョン管理)
