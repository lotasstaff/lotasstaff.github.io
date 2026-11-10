// 仮URL(https://<user>.github.io/<repo>/)での確認用: dist/*.html 内の「/」始まりのリンク・画像に BASE_PATH を付ける。
// 独自ドメイン(ルート配信)では使わない。使い方: BASE_PATH=/asahi-hp node tools/prefix-base.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const base = (process.env.BASE_PATH || '').replace(/\/$/, '');
if (!base) { console.log('BASE_PATH 未設定: 何もしません'); process.exit(0); }
if (!base.startsWith('/')) { console.error('BASE_PATH は / で始めてください'); process.exit(1); }

let files = 0, rewrites = 0;
for (const f of readdirSync('dist').filter((n) => n.endsWith('.html'))) {
  const path = `dist/${f}`;
  const html = readFileSync(path, 'utf8');
  const out = html.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (m, attr, url) => {
    if (url === base || url.startsWith(base + '/')) return m;  // 二重付与を防ぐ
    rewrites++;
    return `${attr}="${base}${url}"`;
  });
  if (out !== html) { writeFileSync(path, out); files++; }
}
console.log(`prefix-base: ${files} ファイル, ${rewrites} 件を ${base} 付きに書き換え`);
