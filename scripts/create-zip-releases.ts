import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * changeset tagで作成されたタグからZIPを作成してGitHub Releaseを作成
 */
async function createZipReleases() {
  // 最新のgitタグを取得（changeset tagが作成したタグ）
  let tags: string[];
  try {
    tags = execSync('git tag --points-at HEAD', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter((tag) => tag.includes('@')); // example-extension@0.0.2 形式のみ
  } catch (error) {
    console.log('ℹ No git tags found at HEAD.');
    return;
  }

  if (tags.length === 0) {
    console.log('ℹ No tags found at HEAD. Skipping release creation.');
    return;
  }

  for (const tag of tags) {
    console.log(`\n📦 Processing tag: ${tag}`);

    // @sui-chrome-extensions/example-extension@0.0.1 形式を解析
    // スコープ付きパッケージ名に対応するため、最後の @ で分割
    const lastAtIndex = tag.lastIndexOf('@');
    const fullPackageName = tag.slice(0, lastAtIndex); // @sui-chrome-extensions/example-extension
    const version = tag.slice(lastAtIndex + 1); // 0.0.1

    // ディレクトリ名を抽出 (example-extension)
    const packageDirName = fullPackageName.split('/').pop() || '';
    if (!packageDirName) {
      console.log(
        `⚠ Skipping ${tag}: could not extract package directory name`,
      );
      continue;
    }

    let packageDir = join('packages', packageDirName);
    if (!existsSync(packageDir)) {
      packageDir = join('apps', packageDirName);
    }

    if (!existsSync(packageDir)) {
      console.log(`⚠ Skipping ${tag}: directory not found in packages or apps`);
      continue;
    }

    const distDir = join(packageDir, 'dist');

    if (!existsSync(distDir)) {
      console.log(`⚠ Skipping ${fullPackageName}: no dist/ directory`);
      continue;
    }

    // ZIPファイルを作成
    const zipFile = `${packageDirName}.zip`;
    const zipPath = join(packageDir, zipFile);

    console.log(`  Creating ${zipFile}...`);
    execSync(`cd ${distDir} && zip -r ../${zipFile} .`, { stdio: 'inherit' });
    console.log(`  ✓ Created ${zipFile}`);

    // GitHub Releaseが既に存在するか確認
    try {
      execSync(`gh release view ${tag}`, { stdio: 'ignore' });
      console.log(`  ⚠ Release ${tag} already exists, skipping...`);
      continue;
    } catch {
      // リリースが存在しない場合は作成
    }

    // GitHub Releaseを作成
    const releaseNotes = [
      `Release of ${fullPackageName} version ${version}`,
      '',
      '## Installation',
      '',
      `1. Download \`${packageDirName}.zip\``,
      '2. Extract the archive',
      '3. Open Chrome and navigate to `chrome://extensions/`',
      '4. Enable "Developer mode"',
      '5. Click "Load unpacked" and select the extracted folder',
      '',
      'Or upload to Chrome Web Store manually.',
    ].join('\n');

    // タグをリモートにプッシュ（GitHub Releaseを作成するために必要）
    console.log(`  Pushing tag to remote...`);
    execSync(`git push origin "${tag}"`, { stdio: 'inherit' });

    console.log(`  Creating GitHub Release...`);
    // spawnSync を使用してシェル解釈を回避（バッククォートなどの特殊文字対策）
    const result = spawnSync(
      'gh',
      [
        'release',
        'create',
        tag,
        zipPath,
        '--title',
        tag,
        '--notes',
        releaseNotes,
      ],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) {
      throw new Error(`gh release create failed with status ${result.status}`);
    }

    console.log(`  ✓ Created release: ${tag}`);
  }
}

createZipReleases().catch((error) => {
  console.error('Error creating releases:', error);
  process.exit(1);
});
