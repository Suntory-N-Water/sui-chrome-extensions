# レビュー収集のバグ修正とログ強化プラン

## 問題の原因

339件のレビューがあるのに1ページ分しか取得できない問題は、以下の2つが原因です：

1. **waitForPageLoad関数のバグ**: 二重resolve、リスナー削除漏れ
2. **ログ不足**: 何が起きているか分からず、デバッグが困難

### 現在のコードの問題点

```typescript
async function waitForPageLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const checkAndResolve = async () => {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') {
        setTimeout(resolve, 1500);  // ❌ 問題1: 二重resolve
      }
    };

    const listener = (...) => {
      if (...) {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 1500);  // ❌ 問題2: 二重resolve
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
    checkAndResolve();  // ❌ 問題3: リスナー削除漏れ
  });
}
```

**問題**:
1. `checkAndResolve()`が先にresolveすると、リスナーが削除されずに残る
2. 両方が実行されるとresolveが2回呼ばれる（Promiseは1回目のみ有効だが、リソースリーク）
3. 1500msは根拠のない値

## 解決策

以下の2つのアプローチを検討：

### アプローチ1: リスナーのみを使用（推奨）

```typescript
async function waitForPageLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
    };

    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        if (!resolved) {
          resolved = true;
          cleanup();
          // DOMの準備とAjaxの完了を待つための適度な待機時間
          setTimeout(resolve, 1 * 1000);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // タイムアウト処理（30秒）
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Page load timeout'));
      }
    }, 30 * 1000);
  });
}
```

**メリット**:
- シンプルで確実
- リスナーの削除漏れがない
- タイムアウト処理付き

### アプローチ2: 既存の状態チェック + リスナー

```typescript
async function waitForPageLoad(tabId: number): Promise<void> {
  // まず現在の状態を確認
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === 'complete') {
    await new Promise(resolve => setTimeout(resolve, 1 * 1000));
    return;
  }

  // まだ読み込み中ならリスナーで待機
  return new Promise((resolve, reject) => {
    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 1 * 1000);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // タイムアウト処理
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Page load timeout'));
    }, 30 * 1000);
  });
}
```

**メリット**:
- 既に読み込み完了している場合は即座に処理
- 二重resolve問題を回避

## 待機時間について

`status: 'complete'`は「ページのDOMが読み込まれた」ことを示しますが、以下が未完了の可能性があります：

1. **非同期JavaScriptの実行**: DOMContentLoaded後に実行されるスクリプト
2. **Ajaxリクエスト**: ページ読み込み後にレビューを動的取得している可能性
3. **レンダリング完了**: DOM構築後の実際のレンダリング

### 待機時間の選択肢

- **0ms（待機なし）**: `status: 'complete'`を信頼
  - リスク: レビューが取得できない可能性が高い
- **0.5 * 1000 (500ms)**: 元の実装の値
  - リスク: Ajaxリクエストが未完了の可能性
- **1 * 1000 (1000ms)**: 一般的な推奨値
  - 根拠: 大半のWebページでAjax完了に十分な時間
- **1.5 * 1000 (1500ms)**: 現在のバグがある実装での値
  - 安全だが、34ページで51秒の無駄（1500-500=1000ms × 34ページ）

### 推奨: 動的な待機時間

固定値ではなく、**ログを追加して実際の動作を確認してから調整**することを推奨します：

```typescript
await waitForPageLoad(tab.id);
logger.debug({ tabId: tab.id }, 'status:complete検出、追加待機開始');
await new Promise(resolve => setTimeout(resolve, 1 * 1000)); // 1秒待機
logger.debug({ tabId: tab.id }, '追加待機完了');

const { reviews } = await extractReviewsFromTab(tab.id);
logger.info({ reviewCount: reviews.length }, 'レビュー抽出完了');
```

これにより：
- レビュー数が0件なら待機時間不足
- レビュー数が正常なら待機時間は適切
- ログから最適な待機時間を判断可能

**初期値は 1 * 1000 (1000ms / 1秒)**とし、ログを見て調整する方針を推奨します。

## 推奨: アプローチ1（リスナーのみ）

理由:
- コードがシンプル
- リソースリークのリスクがない
- タブ作成直後は通常まだ読み込み中なので、既存状態チェックは不要

## 影響範囲

- **修正ファイル**: `packages/heavenly-reviews-collector/src/background/index.ts`
- **修正箇所**: `waitForPageLoad`関数のみ（90-116行目）

## パート2: ログ機能の強化

### 共通ロガーパッケージの作成

`packages/common/` を新規作成し、Chrome拡張機能用のロガーを実装します。

#### ディレクトリ構造

```
packages/common/
├── src/
│   ├── logger.ts        # ロガー本体
│   └── index.ts         # エクスポート
├── package.json
└── tsconfig.json
```

#### ロガーの特徴

参考実装（cc-vault/logger.ts）をベースに、Chrome拡張機能用に最適化：

URL : https://github.com/Suntory-N-Water/cc-vault/blob/main/src/lib/logger.ts
注意点：ファイルは gh コマンドで確認すること

1. **ログレベル**: trace, debug, info, warn, error, fatal
2. **構造化ログ**: JSON形式とPretty形式の両対応
3. **コンテキスト管理**: child()でコンテキスト付きロガーを作成
4. **Chrome拡張機能対応**: console.logベース（chrome.storageは使わない）

#### 実装内容

- `getLogger(context?: string)`: ロガーインスタンスを取得
- `logger.info()`, `logger.error()`, `logger.warn()` など
- `logger.child({ key: value })`: コンテキスト付きロガー作成
- 環境変数`LOG_LEVEL`でログレベル制御

#### background/index.tsへの統合

各関数にログを追加：

```typescript
import { getLogger } from '@sui-chrome-extensions/common';

const logger = getLogger('background');

async function collectPageUrls(startUrl: string): Promise<boolean> {
  logger.info({ startUrl }, 'URL収集を開始');

  try {
    const pageInfo = await getPageInfoFromTab(tab.id);
    logger.info({
      totalReviews: pageInfo.totalReviews,
      totalPages: pageInfo.totalPages
    }, 'ページ情報を取得');

    // URLリスト生成
    logger.debug({ urlCount: urls.length }, 'URL生成完了');

    return true;
  } catch (error) {
    logger.error({ error }, 'URL収集エラー');
    return false;
  }
}

async function processSinglePageTask(task: PageTask): Promise<void> {
  logger.info({
    pageNumber: task.pageNumber,
    url: task.url
  }, 'ページ処理開始');

  try {
    await waitForPageLoad(tab.id);
    logger.debug({ tabId: tab.id }, 'ページ読み込み完了');

    const { reviews } = await extractReviewsFromTab(tab.id);
    logger.info({
      reviewCount: reviews.length,
      totalReviews: state.reviews.length
    }, 'レビュー抽出完了');

    task.status = 'completed';
  } catch (error) {
    logger.error({
      pageNumber: task.pageNumber,
      error
    }, 'ページ処理エラー');
    task.status = 'error';
  }
}
```

## 影響範囲

### 新規作成
- `packages/common/src/logger.ts`
- `packages/common/src/index.ts`
- `packages/common/package.json`
- `packages/common/tsconfig.json`

### 修正ファイル
- `packages/heavenly-reviews-collector/src/background/index.ts`
  - waitForPageLoad関数の修正
  - ログ追加
- `packages/heavenly-reviews-collector/package.json`
  - commonパッケージへの依存追加
- `pnpm-workspace.yaml` (必要に応じて)
- `tsconfig.json` (ルート、commonパッケージの参照追加)

## 検証方法

1. ビルド: `pnpm build:all`
2. Chrome拡張機能管理画面で再読み込み
3. ブラウザのDevTools > Console を開く
4. 339件のレビューページで収集開始
5. コンソールに以下のようなログが出力されることを確認：
   ```
   INFO, -background-, 2026-01-17T..., URL収集を開始 {"startUrl":"..."}
   INFO, -background-, 2026-01-17T..., ページ情報を取得 {"totalReviews":339,"totalPages":34}
   INFO, -background-, 2026-01-17T..., ページ処理開始 {"pageNumber":1,"url":"..."}
   INFO, -background-, 2026-01-17T..., レビュー抽出完了 {"reviewCount":10,"totalReviews":10}
   ...
   ```
6. 全ページが正しく収集されることを確認
