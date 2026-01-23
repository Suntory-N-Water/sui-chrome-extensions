import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';

/**
 * package.jsonのバージョンをvite.config.tsのmanifest.versionに同期
 */
function syncManifestVersions() {
  // packages/とapps/配下の全拡張機能を取得（uiは除外）
  const packageDirs = globSync(
    ['packages/*/package.json', 'apps/*/package.json'],
    {
      ignore: ['packages/ui/**', 'apps/ui/**'],
    },
  );

  for (const pkgPath of packageDirs) {
    const packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const packageDir = join(pkgPath, '..');
    const viteConfigPath = join(packageDir, 'vite.config.ts');

    if (!existsSync(viteConfigPath)) continue;

    const version = packageJson.version;
    let viteConfig = readFileSync(viteConfigPath, 'utf-8');

    // version: '0.0.1' のパターンを置換
    const versionRegex = /(version:\s*['"])([^'"]+)(['"]\s*,?)/;
    viteConfig = viteConfig.replace(versionRegex, `$1${version}$3`);

    writeFileSync(viteConfigPath, viteConfig);
    console.log(`✓ ${packageJson.name}: ${version}`);
  }
}

syncManifestVersions();
