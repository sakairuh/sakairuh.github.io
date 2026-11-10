# sakairuh.github.io

Sukima Apps（Ryohei Sakai）のアプリの、サイトの一番上の階層に置くファイル。

- `index.html`: サイトのトップ（https://sakairuh.github.io/ ）。アプリの一覧と連絡先を日英で載せる。プレスキットやストアから開発者を確かめに来た人と、X のプロフィールのリンク先のためのページ。アプリを足したら一覧に足す。App Store へのリンクはキャンペーンのリンク（`ct=developer-top`）で、App アナリティクスでトップ経由のダウンロードを見分ける（勉強ペースメーカーは日本だけで配信しているので、国を付けない URL は米国のストアで 404 になる。`/jp/` を付ける）。アイコンは各アプリのサポートのページ（`kotobajan/` は紹介ページ）のものをそのまま使う
- `_config.yml`: この README をサイトに出さないための設定（`index.html` がなかったころは、GitHub Pages がこの README をトップにしていた）
- `robots.txt`・`sitemap.xml`: 検索エンジンに読ませるページの一覧。紹介ページを増やしたら `sitemap.xml` に足す
- `b2847d82d18a605e68a3b2bc92ff62f8.txt`: IndexNow（Bing などにページの追加・更新を知らせる仕組み）のキー。ページを増やしたり直したりしたら、`https://api.indexnow.org/indexnow?url=<ページの URL>&key=b2847d82d18a605e68a3b2bc92ff62f8` を開くと知らせられる
- `app-ads.txt`: 広告（Google AdMob）の発行元を示すファイル（[app-ads.txt](https://support.google.com/admob/answer/9363762)）。アプリの App Store の掲載にある開発者のサイト（`sakairuh.github.io` の下のサポートのページ）と同じドメインの一番上に置く必要がある

- `kotobajan/`: ことば雀の紹介ページ（App Store の掲載のマーケティング URL）。画面の写真は、ストアのスクリーンショットを縮めたもの

各アプリのページ:

- [ことば雀 - ひらがな麻雀](https://sakairuh.github.io/kotobajan/)（[サポート](https://sakairuh.github.io/kotobajan-support/)）
- 勉強ペースメーカー: [サポート](https://sakairuh.github.io/pacekei-support/)
- もじっこ: [サポート](https://sakairuh.github.io/mojikko-support/)
