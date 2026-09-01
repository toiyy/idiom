/**
 * 全問題の英文を 1 行 1 文で書き出す（別で作ったリスニングアプリ用）。
 * 空所 "___" は正解の選択肢で埋め、完全な文にする。
 *
 *   node scripts/export-sentences.mjs            # sentences.txt に書き出し
 *   node scripts/export-sentences.mjs --check    # 既存ファイルと差分がないか確認（CI 用）
 *
 * 出題順（ファイル名順 → 配列順）で並ぶので、カテゴリごとにまとまる。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/data/questions');
const outFile = path.join(root, 'sentences.txt');

function buildLines() {
  const lines = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith('.json')) continue;
    const questions = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const q of questions) {
      const answer = q.choices[q.answerIndex];
      if (!q.sentence.includes('___')) {
        throw new Error(`${q.id}: 空所 "___" が見つかりません`);
      }
      const sentence = q.sentence.replace('___', answer).replace(/\s+/g, ' ').trim();
      lines.push(sentence);
    }
  }
  return lines;
}

const content = buildLines().join('\n') + '\n';

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (current !== content) {
    console.error('sentences.txt が最新ではありません。`npm run export` を実行してください。');
    process.exit(1);
  }
  console.log('sentences.txt は最新です。');
} else {
  fs.writeFileSync(outFile, content);
  console.log(
    `${content.trimEnd().split('\n').length} 文を ${path.relative(root, outFile)} に書き出しました。`,
  );
}
