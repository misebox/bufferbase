export default {
  plugins: [
    // 1. コミット履歴から次期バージョン番号を算出する。
    "@semantic-release/commit-analyzer",

    // 2. リリースノートのためのコンテンツ（テキスト）を生成する。
    "@semantic-release/release-notes-generator",

    // 3. "2" で生成されたリリースノート用コンテンツを Changelog ファイルに記述する。
    '@semantic-release/changelog',

    // 4. package.json の version フィールドを次期バージョン番号で更新する。
    //    公開は行わない。npm の 2FA はブラウザ認証を求めるが semantic-release は
    //    非対話でサブプロセスを起動するため応答できない。リリース後に手で
    //    `npm publish` する（scripts/release.sh が案内する）。
    ['@semantic-release/npm', { npmPublish: false }],

    // 5. リリースフローで発生したアセットの更新差分をリポジトリにコミットする。
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'bun.lock'],
      },
    ],

    // 6. "2" で生成されたリリースノート用コンテンツを用いて GitHub Release を追加する。
    '@semantic-release/github',
  ],
};
