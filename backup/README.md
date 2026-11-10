# backup/original

2026-11-02 時点の https://www.lotas-asahi.com/ の生データ。旧サービス(dekiteru)終了に備えた保全用で、加工しない。

- `urls.txt`: sitemap.xml 記載の73 URL
- `pages/`: 全73ページのHTML(`_root.html` は `/` の内容)
- `assets/<ホスト名>/<パス>`: 画像・CSS・JS・フォント(Google Fonts 含む)。クエリ文字列は除いた名前で保存
- `assets-list.txt`: HTMLから抽出したアセットURL一覧
- 取得できなかったもの(いずれも公開サイトの表示に影響しないと判断):
  - `dekiteru.helper.p.syde.work/js/common.js`(403)
  - `www.lotas-asahi.com/img/common/edit.cur`(配信元でも404。編集画面用カーソル)
- 配信元でも空ファイル: `css/original_10524.css`(0バイト。配信元も0バイト)

## 検証記録(2026-11-02)

- 73ページすべて取得済み。sitemap と一致。エラーページ (404) は `404.html` のみ。
- HTML内リンクのうち sitemap にないものは、http版や `estimate.html` など同一ページの別表記のみ。
- HTML・CSSから参照される5,637件のアセット参照を照合し、未取得は上記2件のみ。
- 初回取得では、配信元が「存在しない画像」にも HTML(200応答)を返すため、約110件の画像が HTML で保存されていた。`dekiteru.net/cms/` や `dekiteru.media` の正しい配信元から取り直し、画像拡張子なのに中身が HTML のファイルが0件であることを確認した。
- JavaScript が実行時に読み込む画像も確認し、存在するものは取得した。

