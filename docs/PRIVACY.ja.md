---
title: プライバシーポリシー
---

# プライバシーポリシー

施行日: 2026-05-26

`fadee` は、YouTube のチャンネルページで視聴済み動画を見えにくくする Chrome 拡張機能です。

## fadee が扱うデータ

- **視聴済み動画の ID。** 動画を視聴済みとしてマークすると、fadee はその YouTube 動画 ID を `chrome.storage.sync` にローカル保存します。`chrome.storage.sync` は Chrome 自体が提供する仕組みであり、ご自身の Google アカウントにサインインしている Chrome の各インスタンス間で Chrome が同期します(fadee ではなく Chrome が同期主体です)。fadee がそれ以外の場所に送信することはありません。
- **ローカル UI 設定。** ツールバーのトグルなど、小さな拡張機能設定を同じ `chrome.storage` 領域に保存します。

## fadee が扱わないデータ

- 個人を特定可能な情報は扱いません。
- 上記の動画単位の視聴済みマーク以外の閲覧履歴は扱いません。
- アナリティクス・テレメトリ・クラッシュレポートはありません。
- サードパーティのトラッカーや SDK は使っていません。

## ネットワーク通信

fadee 自身はネットワーク通信を行いません。すべての処理はブラウザ内で完結します。

## 権限の理由

- `storage` — 視聴済み動画 ID と UI 設定をセッション・端末間で `chrome.storage.sync` に保存するため。
- `offscreen` — OS のカラースキーム設定 (`matchMedia("(prefers-color-scheme: dark)")`) を読み取り Service Worker に伝える隠しドキュメントをホストするため。これによりツールバーアイコンを OS のダーク/ライト設定に追従させています。
- `host_permissions: https://www.youtube.com/*` — チャンネルページの DOM を読み、視聴済み動画にフェードを適用するために必要です。

## 問い合わせ

ご質問・ご懸念は GitHub の Issue でお寄せください: <https://github.com/ichi0g0y/fadee/issues>
