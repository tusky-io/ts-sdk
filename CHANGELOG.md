# [0.22.0-experimental.4](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-experimental.3...v0.22.0-experimental.4) (2024-10-30)


### Bug Fixes

* encrypt/decrypt streamed chunks ([e730913](https://github.com/Akord-com/carmella-sdk/commit/e73091379320fde0adaab0732ce1417b52536ead))

# [0.22.0-experimental.3](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-experimental.2...v0.22.0-experimental.3) (2024-10-29)


### Bug Fixes

* storage config in akord instance ([5b84048](https://github.com/Akord-com/carmella-sdk/commit/5b8404856b654741e0f190ae495d561c0da22b47))

# [0.22.0-experimental.2](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-experimental.1...v0.22.0-experimental.2) (2024-10-25)


### Bug Fixes

* vault deletion ([73352ab](https://github.com/Akord-com/carmella-sdk/commit/73352ab61bc7a5b962045daa1f2742f56f13269c))


### Features

* list by vault id by default, and use parentId to list root level in vault ([1cedda9](https://github.com/Akord-com/carmella-sdk/commit/1cedda9b1da7921ebd08f68d6cd212566931fff8))
* private/public vault tests ([a8b9b18](https://github.com/Akord-com/carmella-sdk/commit/a8b9b182706e9209b8e6458e3df3ef7d3e2d1025))
* run SDK test on pull request ([d8f15b6](https://github.com/Akord-com/carmella-sdk/commit/d8f15b645dc3929dfa601624d95af9f0c852a3de))
* use prod/dev/local env ([dafa8f8](https://github.com/Akord-com/carmella-sdk/commit/dafa8f88dbed31776dce0a9d473b3622fc28d584))

# [0.22.0-experimental.1](https://github.com/Akord-com/carmella-sdk/compare/v0.21.2...v0.22.0-experimental.1) (2024-10-25)


### Bug Fixes

* airdrop access member name ([6b3732a](https://github.com/Akord-com/carmella-sdk/commit/6b3732af35bd6e4e3d8ffede4ea9d81abfa38aa7))
* current session config ([7c7aceb](https://github.com/Akord-com/carmella-sdk/commit/7c7acebcc99a1e51f4b42fc3cd046ddd28fb2082))
* default auth storage ([6f704b3](https://github.com/Akord-com/carmella-sdk/commit/6f704b3edc63a6ff2c8e4ef25f484a4f280827a1))
* **dsw:** correct external range request header calculation ([508080e](https://github.com/Akord-com/carmella-sdk/commit/508080e8678c53e557833ee25bfd46b60ce3e49d))
* encPrivateKeyBackup field ([aab3911](https://github.com/Akord-com/carmella-sdk/commit/aab391168599a80be9d3f24f27fd7bcd0587fcdb))
* encrypted multi-chunk upload ([4c9ee06](https://github.com/Akord-com/carmella-sdk/commit/4c9ee06e90756659b9235d44e8b2ccfe41aeb9c5))
* import ([bbb29b4](https://github.com/Akord-com/carmella-sdk/commit/bbb29b443548d07f05ec1fbc327015bc2470a9b4))
* import path ([5c66bd1](https://github.com/Akord-com/carmella-sdk/commit/5c66bd12eb4d6f741afdb4a8c234c31b535c4898))
* import paths ([5aed0d7](https://github.com/Akord-com/carmella-sdk/commit/5aed0d782385b2c1407d628310b29526d2f8a025))
* import typo ([6441721](https://github.com/Akord-com/carmella-sdk/commit/644172127bb61eff0f473a7ccc0608a5df2287df))
* logger import ([f1d6dcd](https://github.com/Akord-com/carmella-sdk/commit/f1d6dcd46de7bf2b94fe17f4b830a1f72fc68810))
* logger usage ([4ed0c3e](https://github.com/Akord-com/carmella-sdk/commit/4ed0c3ebd4d876807cf97db695435d6b15369ae5))
* prevent simultaneous refresh token calls ([3843890](https://github.com/Akord-com/carmella-sdk/commit/3843890ff68929f4df2db30641234d99c225c60f))
* **pubsub:** add encrypter in file#decrypt ([6363de7](https://github.com/Akord-com/carmella-sdk/commit/6363de77d90724ac2cf762335b69f5743a81e171))
* **pubsub:** decrypt data before onSuccess fn call ([b4ac056](https://github.com/Akord-com/carmella-sdk/commit/b4ac0564a97ceeddbb5dde5ca6f87c8775d7298f))
* **pubsub:** skip decrypt for public vault ([c62bf4d](https://github.com/Akord-com/carmella-sdk/commit/c62bf4d96c639455b9aab8069bcea645e70f5e0b))
* reinitialize tus request headers ([2a57d60](https://github.com/Akord-com/carmella-sdk/commit/2a57d60081c79995b3af7fc9be4ff959917e26ec))
* remove worker from bundle ([7a4ebbf](https://github.com/Akord-com/carmella-sdk/commit/7a4ebbf796c8c801260c486658c4d8b86940448d))
* run test server only for oauth test flow ([6fab0d8](https://github.com/Akord-com/carmella-sdk/commit/6fab0d82af5c84728eaa9bc4fe0168bea48ffb84))
* set address from session in akord constructor ([1287490](https://github.com/Akord-com/carmella-sdk/commit/1287490c4d9ffc4af85d0d496d00565641795560))
* set new refresh token if present in the response ([dcff6c8](https://github.com/Akord-com/carmella-sdk/commit/dcff6c8aec52ff9804993c5074a163095ec1cf68))
* skip decrypting trash folder ([5ac7025](https://github.com/Akord-com/carmella-sdk/commit/5ac70250fc7284bdd8a47f18e0a7779c200dfa87))
* skip throwing error on getUserId() ([26fb163](https://github.com/Akord-com/carmella-sdk/commit/26fb163591b317af502ce38699822f27fba4e035))
* store chunk size corrected by encryption bytes ([04ea8a9](https://github.com/Akord-com/carmella-sdk/commit/04ea8a9b2dc9b4dab103670198ec8d9018afa18c))
* sui keypair import ([525a736](https://github.com/Akord-com/carmella-sdk/commit/525a7360a8f50dbb07af7c723e6ac21054033443))
* sui keypair import ([43819ac](https://github.com/Akord-com/carmella-sdk/commit/43819ac9742a702955c52b96f48bad708be99954))
* tests imports ([9411a6e](https://github.com/Akord-com/carmella-sdk/commit/9411a6ea3a98100a789fa0841e0910944917158d))
* try-catch worker registration ([3141d43](https://github.com/Akord-com/carmella-sdk/commit/3141d43806bf0b2846ea8a6d4c2d08563bceac4d))
* use logLevel in config ([d9fc1cd](https://github.com/Akord-com/carmella-sdk/commit/d9fc1cd9aabcec460eda4de50e2cdaa02d1294d0))
* use member instance for member calls ([ec55004](https://github.com/Akord-com/carmella-sdk/commit/ec5500478273a07efb337c82f72951ee8eecb085))
* vault members flow ([317e59c](https://github.com/Akord-com/carmella-sdk/commit/317e59c62e20e955646cb55ee26bf83d3219c1f6))


### Features

* account recovery draft ([988a1b0](https://github.com/Akord-com/carmella-sdk/commit/988a1b0ae9a5e197e4c88c2594ed534d007071dd))
* add AES file encryption ([0639ddc](https://github.com/Akord-com/carmella-sdk/commit/0639ddc92d0a49312ce626a5d22cf86e09907632))
* add airdrop access + move member management into the vault module ([2357877](https://github.com/Akord-com/carmella-sdk/commit/23578770aa4834843590f9d6b33a6415377acf72))
* add change & revoke member access ([05e25cd](https://github.com/Akord-com/carmella-sdk/commit/05e25cd82ce3b4d3a0f6d9a2d91a680138a1cad5))
* add decrypt stream func ([8e22e2a](https://github.com/Akord-com/carmella-sdk/commit/8e22e2a9698b9ce429e070b83f4119d915a91d0a))
* add decryption worker ([b9856ca](https://github.com/Akord-com/carmella-sdk/commit/b9856ca2956c2aed93662e3a2c89d9410caf58c8))
* add expiresAt field to file model ([b6e1ddc](https://github.com/Akord-com/carmella-sdk/commit/b6e1ddc6eaee6b628a1fa7adfdd06d5bfb84a7c4))
* add guest flag to the user model ([60ce721](https://github.com/Akord-com/carmella-sdk/commit/60ce7215260a436161c27372c51a6021804001fd))
* add proper log levels ([0dc2163](https://github.com/Akord-com/carmella-sdk/commit/0dc216357e470a5bf9a71e50f7dbc40c752ac534))
* add pubsub dependencies ([9d294d6](https://github.com/Akord-com/carmella-sdk/commit/9d294d6df3a04bbc3fb8d9bf135a5f7e7b70636a))
* add retry on enoki calls ([8b449e2](https://github.com/Akord-com/carmella-sdk/commit/8b449e24e6448f1fff4ae7fed20894f2a8600a84))
* add subscribe on file on module ([0ad126a](https://github.com/Akord-com/carmella-sdk/commit/0ad126a81998ac3e3c86e680a6d9f398cf9fefa2))
* add tus encryptable http stack ([d28a02e](https://github.com/Akord-com/carmella-sdk/commit/d28a02e2ba6b795396d286d2c4eae9682cc2da77))
* add types declaration ([5050e01](https://github.com/Akord-com/carmella-sdk/commit/5050e01be6846c5a8c282f77f5ab5dbafea3aede))
* add uppy uploads starter ([330019d](https://github.com/Akord-com/carmella-sdk/commit/330019d3d725db9e31ff1b7af754168ac63bc40f))
* add vault tags ([21525b3](https://github.com/Akord-com/carmella-sdk/commit/21525b3d068d826db05afb282e297728dee37f83))
* add zip module ([1bb9aeb](https://github.com/Akord-com/carmella-sdk/commit/1bb9aebbd745a2c0f579cfb0d234b468540c4614))
* change contextPath to allowedPaths in member model ([d1e5d3d](https://github.com/Akord-com/carmella-sdk/commit/d1e5d3da5a3201c3a245e1af376569d1207ea421))
* clear keystore on sign out ([2fbf77b](https://github.com/Akord-com/carmella-sdk/commit/2fbf77bc6567f7e50c6e39aa3db0e9120684b370))
* **crypto:** remove akord wallet & cleanup repo ([4c7d386](https://github.com/Akord-com/carmella-sdk/commit/4c7d386574f961c8ffe2487fc5bcb70e9acf09e5))
* enable auth config in Akord constuctor ([0d25519](https://github.com/Akord-com/carmella-sdk/commit/0d25519d571fc42581b527409383e8ea1546c098))
* enable auth wallet config from private key ([5ed17bc](https://github.com/Akord-com/carmella-sdk/commit/5ed17bc98aa479e85ec5cb84898206e304152a33))
* enable multi user SDK instances ([b49ae52](https://github.com/Akord-com/carmella-sdk/commit/b49ae52e845500654b2c33c24429d282708fa964))
* export file source type ([51e0196](https://github.com/Akord-com/carmella-sdk/commit/51e0196349efc2d0923e1660461e9d87298e7c78))
* **file:** add simple pubsub ([fabff03](https://github.com/Akord-com/carmella-sdk/commit/fabff03896313952a25ed8d7304aa798b89838fd))
* make auth storage path env specific ([7bac05c](https://github.com/Akord-com/carmella-sdk/commit/7bac05c5d7a84ffa3ed689d57ca8338a1e35ac2c))
* move stream to typescript ([e6e87eb](https://github.com/Akord-com/carmella-sdk/commit/e6e87ebe402b2f17d6afeb5f4e52c32e40eba225))
* move whole file encryption process to onBeforeRequest ([4dff027](https://github.com/Akord-com/carmella-sdk/commit/4dff027ee5621e9f5bcebb52c92f4b9e696bf220))
* provide decryption service worker ([7cf9dad](https://github.com/Akord-com/carmella-sdk/commit/7cf9dad59b68c1a2b1f383aed1e84a12bcf2545c))
* reinitialize xhr ([772eee1](https://github.com/Akord-com/carmella-sdk/commit/772eee1bbacf4438074f12af9dee7a1358756a0c))
* save encryptedAesKey and use it to decrypt file ([665a1e4](https://github.com/Akord-com/carmella-sdk/commit/665a1e4b87a128eb2aef76b59260da0becc63a1f))
* save JWT from wallet-based auth, retrieve address from session & refactor JWT client ([5f589cd](https://github.com/Akord-com/carmella-sdk/commit/5f589cda1bfb2b6de53954768eb7322409124f61))
* save JWT from wallet-based auth, retrieve address from session & refactor JWT client ([11d1c72](https://github.com/Akord-com/carmella-sdk/commit/11d1c72f1b9288de4bed25fb61206e70afd17c1d))
* separate file download implementation per env ([d0918a4](https://github.com/Akord-com/carmella-sdk/commit/d0918a486255bb89a3eb1b637888b33f97b42504))
* set user specific session & password key paths to enable multi user usage ([085a487](https://github.com/Akord-com/carmella-sdk/commit/085a487817167906855867f9b730692fc7542c35))
* set viewer as default aidrop access role ([098dba8](https://github.com/Akord-com/carmella-sdk/commit/098dba8cca07c3a7d4d97d80fc8a90f14c605116))
* sharing part of the vault ([fadf1c6](https://github.com/Akord-com/carmella-sdk/commit/fadf1c66eb3004a2a08f6433497611e34459fc75))
* start types cleanup ([e7dccef](https://github.com/Akord-com/carmella-sdk/commit/e7dccefe5aace63b3d1aed551ab8f94ef60b4d0d))
* store user address in session ([0aa2de2](https://github.com/Akord-com/carmella-sdk/commit/0aa2de23620f8b1671ac668d2a155e85853ea4bd))
* support experimental releases ([5174b7d](https://github.com/Akord-com/carmella-sdk/commit/5174b7d66446231d79a9e8936ee60a2a75d56cdc))
* support multi env auth ([d437cbc](https://github.com/Akord-com/carmella-sdk/commit/d437cbc17a6828b4fe8a4e6738b0b30c4ff653cb))
* support resumability for encrypted uploads ([aab421c](https://github.com/Akord-com/carmella-sdk/commit/aab421c107a9477a0f3e34a518418c247a9ff5fc))
* throw unauthorized errors for invalid auth session ([c5f3461](https://github.com/Akord-com/carmella-sdk/commit/c5f3461fac86408d61c9a1809a90e38c325fba35))
* try to use refresh token if id token not found ([9970e3f](https://github.com/Akord-com/carmella-sdk/commit/9970e3ff140e2fb9be6b0dee001f9c638e5068ee))
* update starter to the newest SDK ([aff7c10](https://github.com/Akord-com/carmella-sdk/commit/aff7c106597f3c57ef439a5678169973f26b764e))
* use akrd.io ([46e7058](https://github.com/Akord-com/carmella-sdk/commit/46e7058fe08ac383002c35231f7b927d4589e90e))
* use auth provider specific scopes ([2ecbf48](https://github.com/Akord-com/carmella-sdk/commit/2ecbf48c62d8b45840ec4e39eb55c53bef15390b))
* use folder instead of parent in content path ([9c7c4be](https://github.com/Akord-com/carmella-sdk/commit/9c7c4bea0d2755b090cda30b9723a12cf14c08e8))
* use keystore & start cleanup crypto ([a5f63a5](https://github.com/Akord-com/carmella-sdk/commit/a5f63a501131b58d80889d2e25de0ecdd4b930ad))
* use nonce from create challenge for authentication ([fb63e0d](https://github.com/Akord-com/carmella-sdk/commit/fb63e0df93fe6954cc71d0287f26541422ed62a8))
* use service worker for non encrypted data ([22b310e](https://github.com/Akord-com/carmella-sdk/commit/22b310e57712c12b3fd0d1b3b64ea22e2a2133b5))
* use session key to encrypt user password key, store session key in indexedDB & encrypted password key in session storage ([3d29b42](https://github.com/Akord-com/carmella-sdk/commit/3d29b42a0022177a819df0385d1c2a6a5b250b86))
* use tus protocol ([c5f979e](https://github.com/Akord-com/carmella-sdk/commit/c5f979e067844b2000462342e9bba118776c8966))
* use tusky.io ([128f8d7](https://github.com/Akord-com/carmella-sdk/commit/128f8d725141e1dea7eca5178cbf5e4e9cf37f54))
* use webpack 'browser' for browser specific code ([abd3bba](https://github.com/Akord-com/carmella-sdk/commit/abd3bbaa4733bd65f8237e154b0a555cacbd13bf))
* use with naming convention for akord builder & simplify encrypter setup ([a6bb341](https://github.com/Akord-com/carmella-sdk/commit/a6bb341cf7134aa741c29283d4d517e3d34f72f0))


### Performance Improvements

* remove lodash ([4bf8f67](https://github.com/Akord-com/carmella-sdk/commit/4bf8f679b07569240b6f2a91b3af003deed04bf9))
* separate bundles for web & node; separate bundles for cjs & esm ([ac959fd](https://github.com/Akord-com/carmella-sdk/commit/ac959fd388fad85cb39f75376084e4daad1aaf80))

# [0.22.0-dev.50](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.49...v0.22.0-dev.50) (2024-10-24)


### Bug Fixes

* prevent simultaneous refresh token calls ([3843890](https://github.com/Akord-com/carmella-sdk/commit/3843890ff68929f4df2db30641234d99c225c60f))

# [0.22.0-dev.49](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.48...v0.22.0-dev.49) (2024-10-24)


### Features

* support resumability for encrypted uploads ([aab421c](https://github.com/Akord-com/carmella-sdk/commit/aab421c107a9477a0f3e34a518418c247a9ff5fc))

# [0.22.0-dev.48](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.47...v0.22.0-dev.48) (2024-10-23)


### Bug Fixes

* **dsw:** correct external range request header calculation ([508080e](https://github.com/Akord-com/carmella-sdk/commit/508080e8678c53e557833ee25bfd46b60ce3e49d))

# [0.22.0-dev.47](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.46...v0.22.0-dev.47) (2024-10-21)


### Bug Fixes

* set new refresh token if present in the response ([dcff6c8](https://github.com/Akord-com/carmella-sdk/commit/dcff6c8aec52ff9804993c5074a163095ec1cf68))

# [0.22.0-dev.46](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.45...v0.22.0-dev.46) (2024-10-21)


### Features

* add vault tags ([21525b3](https://github.com/Akord-com/carmella-sdk/commit/21525b3d068d826db05afb282e297728dee37f83))

# [0.22.0-dev.45](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.44...v0.22.0-dev.45) (2024-10-19)


### Bug Fixes

* **pubsub:** skip decrypt for public vault ([c62bf4d](https://github.com/Akord-com/carmella-sdk/commit/c62bf4d96c639455b9aab8069bcea645e70f5e0b))

# [0.22.0-dev.44](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.43...v0.22.0-dev.44) (2024-10-19)


### Bug Fixes

* **pubsub:** add encrypter in file#decrypt ([6363de7](https://github.com/Akord-com/carmella-sdk/commit/6363de77d90724ac2cf762335b69f5743a81e171))

# [0.22.0-dev.43](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.42...v0.22.0-dev.43) (2024-10-19)


### Bug Fixes

* **pubsub:** decrypt data before onSuccess fn call ([b4ac056](https://github.com/Akord-com/carmella-sdk/commit/b4ac0564a97ceeddbb5dde5ca6f87c8775d7298f))

# [0.22.0-dev.42](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.41...v0.22.0-dev.42) (2024-10-18)


### Features

* add subscribe on file on module ([0ad126a](https://github.com/Akord-com/carmella-sdk/commit/0ad126a81998ac3e3c86e680a6d9f398cf9fefa2))

# [0.22.0-dev.41](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.40...v0.22.0-dev.41) (2024-10-17)


### Features

* add pubsub dependencies ([9d294d6](https://github.com/Akord-com/carmella-sdk/commit/9d294d6df3a04bbc3fb8d9bf135a5f7e7b70636a))
* **file:** add simple pubsub ([fabff03](https://github.com/Akord-com/carmella-sdk/commit/fabff03896313952a25ed8d7304aa798b89838fd))

# [0.22.0-dev.40](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.39...v0.22.0-dev.40) (2024-10-17)


### Bug Fixes

* import ([bbb29b4](https://github.com/Akord-com/carmella-sdk/commit/bbb29b443548d07f05ec1fbc327015bc2470a9b4))

# [0.22.0-dev.39](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.38...v0.22.0-dev.39) (2024-10-17)


### Bug Fixes

* skip throwing error on getUserId() ([26fb163](https://github.com/Akord-com/carmella-sdk/commit/26fb163591b317af502ce38699822f27fba4e035))

# [0.22.0-dev.38](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.37...v0.22.0-dev.38) (2024-10-17)


### Features

* throw unauthorized errors for invalid auth session ([c5f3461](https://github.com/Akord-com/carmella-sdk/commit/c5f3461fac86408d61c9a1809a90e38c325fba35))

# [0.22.0-dev.37](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.36...v0.22.0-dev.37) (2024-10-16)


### Bug Fixes

* use member instance for member calls ([ec55004](https://github.com/Akord-com/carmella-sdk/commit/ec5500478273a07efb337c82f72951ee8eecb085))


### Features

* change contextPath to allowedPaths in member model ([d1e5d3d](https://github.com/Akord-com/carmella-sdk/commit/d1e5d3da5a3201c3a245e1af376569d1207ea421))
* set viewer as default aidrop access role ([098dba8](https://github.com/Akord-com/carmella-sdk/commit/098dba8cca07c3a7d4d97d80fc8a90f14c605116))
* sharing part of the vault ([fadf1c6](https://github.com/Akord-com/carmella-sdk/commit/fadf1c66eb3004a2a08f6433497611e34459fc75))
* use folder instead of parent in content path ([9c7c4be](https://github.com/Akord-com/carmella-sdk/commit/9c7c4bea0d2755b090cda30b9723a12cf14c08e8))

# [0.22.0-dev.36](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.35...v0.22.0-dev.36) (2024-10-16)


### Bug Fixes

* skip decrypting trash folder ([5ac7025](https://github.com/Akord-com/carmella-sdk/commit/5ac70250fc7284bdd8a47f18e0a7779c200dfa87))


### Features

* add expiresAt field to file model ([b6e1ddc](https://github.com/Akord-com/carmella-sdk/commit/b6e1ddc6eaee6b628a1fa7adfdd06d5bfb84a7c4))

# [0.22.0-dev.35](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.34...v0.22.0-dev.35) (2024-10-15)


### Bug Fixes

* current session config ([7c7aceb](https://github.com/Akord-com/carmella-sdk/commit/7c7acebcc99a1e51f4b42fc3cd046ddd28fb2082))


### Features

* add guest flag to the user model ([60ce721](https://github.com/Akord-com/carmella-sdk/commit/60ce7215260a436161c27372c51a6021804001fd))

# [0.22.0-dev.34](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.33...v0.22.0-dev.34) (2024-10-13)


### Features

* use service worker for non encrypted data ([22b310e](https://github.com/Akord-com/carmella-sdk/commit/22b310e57712c12b3fd0d1b3b64ea22e2a2133b5))

# [0.22.0-dev.33](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.32...v0.22.0-dev.33) (2024-10-13)


### Features

* provide decryption service worker ([7cf9dad](https://github.com/Akord-com/carmella-sdk/commit/7cf9dad59b68c1a2b1f383aed1e84a12bcf2545c))

# [0.22.0-dev.32](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.31...v0.22.0-dev.32) (2024-10-11)


### Bug Fixes

* airdrop access member name ([6b3732a](https://github.com/Akord-com/carmella-sdk/commit/6b3732af35bd6e4e3d8ffede4ea9d81abfa38aa7))

# [0.22.0-dev.31](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.30...v0.22.0-dev.31) (2024-10-10)


### Features

* use tusky.io ([128f8d7](https://github.com/Akord-com/carmella-sdk/commit/128f8d725141e1dea7eca5178cbf5e4e9cf37f54))

# [0.22.0-dev.30](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.29...v0.22.0-dev.30) (2024-10-10)


### Features

* enable multi user SDK instances ([b49ae52](https://github.com/Akord-com/carmella-sdk/commit/b49ae52e845500654b2c33c24429d282708fa964))
* support multi env auth ([d437cbc](https://github.com/Akord-com/carmella-sdk/commit/d437cbc17a6828b4fe8a4e6738b0b30c4ff653cb))

# [0.22.0-dev.29](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.28...v0.22.0-dev.29) (2024-10-09)


### Features

* add change & revoke member access ([05e25cd](https://github.com/Akord-com/carmella-sdk/commit/05e25cd82ce3b4d3a0f6d9a2d91a680138a1cad5))
* enable auth wallet config from private key ([5ed17bc](https://github.com/Akord-com/carmella-sdk/commit/5ed17bc98aa479e85ec5cb84898206e304152a33))

# [0.22.0-dev.28](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.27...v0.22.0-dev.28) (2024-10-09)


### Bug Fixes

* vault members flow ([317e59c](https://github.com/Akord-com/carmella-sdk/commit/317e59c62e20e955646cb55ee26bf83d3219c1f6))

# [0.22.0-dev.27](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.26...v0.22.0-dev.27) (2024-10-04)


### Bug Fixes

* import path ([5c66bd1](https://github.com/Akord-com/carmella-sdk/commit/5c66bd12eb4d6f741afdb4a8c234c31b535c4898))
* import paths ([5aed0d7](https://github.com/Akord-com/carmella-sdk/commit/5aed0d782385b2c1407d628310b29526d2f8a025))
* run test server only for oauth test flow ([6fab0d8](https://github.com/Akord-com/carmella-sdk/commit/6fab0d82af5c84728eaa9bc4fe0168bea48ffb84))


### Features

* **crypto:** remove akord wallet & cleanup repo ([4c7d386](https://github.com/Akord-com/carmella-sdk/commit/4c7d386574f961c8ffe2487fc5bcb70e9acf09e5))

# [0.22.0-dev.26](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.25...v0.22.0-dev.26) (2024-10-04)


### Bug Fixes

* remove worker from bundle ([7a4ebbf](https://github.com/Akord-com/carmella-sdk/commit/7a4ebbf796c8c801260c486658c4d8b86940448d))

# [0.22.0-dev.25](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.24...v0.22.0-dev.25) (2024-10-04)


### Features

* use akrd.io ([46e7058](https://github.com/Akord-com/carmella-sdk/commit/46e7058fe08ac383002c35231f7b927d4589e90e))

# [0.22.0-dev.24](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.23...v0.22.0-dev.24) (2024-10-02)


### Bug Fixes

* try-catch worker registration ([3141d43](https://github.com/Akord-com/carmella-sdk/commit/3141d43806bf0b2846ea8a6d4c2d08563bceac4d))

# [0.22.0-dev.23](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.22...v0.22.0-dev.23) (2024-10-02)


### Bug Fixes

* import typo ([6441721](https://github.com/Akord-com/carmella-sdk/commit/644172127bb61eff0f473a7ccc0608a5df2287df))

# [0.22.0-dev.22](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.21...v0.22.0-dev.22) (2024-10-02)


### Bug Fixes

* encPrivateKeyBackup field ([aab3911](https://github.com/Akord-com/carmella-sdk/commit/aab391168599a80be9d3f24f27fd7bcd0587fcdb))


### Features

* account recovery draft ([988a1b0](https://github.com/Akord-com/carmella-sdk/commit/988a1b0ae9a5e197e4c88c2594ed534d007071dd))
* set user specific session & password key paths to enable multi user usage ([085a487](https://github.com/Akord-com/carmella-sdk/commit/085a487817167906855867f9b730692fc7542c35))
* use session key to encrypt user password key, store session key in indexedDB & encrypted password key in session storage ([3d29b42](https://github.com/Akord-com/carmella-sdk/commit/3d29b42a0022177a819df0385d1c2a6a5b250b86))

# [0.22.0-dev.21](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.20...v0.22.0-dev.21) (2024-10-02)


### Performance Improvements

* remove lodash ([4bf8f67](https://github.com/Akord-com/carmella-sdk/commit/4bf8f679b07569240b6f2a91b3af003deed04bf9))

# [0.22.0-dev.20](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.19...v0.22.0-dev.20) (2024-10-01)


### Features

* separate file download implementation per env ([d0918a4](https://github.com/Akord-com/carmella-sdk/commit/d0918a486255bb89a3eb1b637888b33f97b42504))

# [0.22.0-dev.19](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.18...v0.22.0-dev.19) (2024-10-01)


### Bug Fixes

* sui keypair import ([525a736](https://github.com/Akord-com/carmella-sdk/commit/525a7360a8f50dbb07af7c723e6ac21054033443))
* sui keypair import ([43819ac](https://github.com/Akord-com/carmella-sdk/commit/43819ac9742a702955c52b96f48bad708be99954))


### Features

* add airdrop access + move member management into the vault module ([2357877](https://github.com/Akord-com/carmella-sdk/commit/23578770aa4834843590f9d6b33a6415377acf72))

# [0.22.0-dev.18](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.17...v0.22.0-dev.18) (2024-09-26)


### Features

* clear keystore on sign out ([2fbf77b](https://github.com/Akord-com/carmella-sdk/commit/2fbf77bc6567f7e50c6e39aa3db0e9120684b370))

# [0.22.0-dev.17](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.16...v0.22.0-dev.17) (2024-09-26)


### Bug Fixes

* store chunk size corrected by encryption bytes ([04ea8a9](https://github.com/Akord-com/carmella-sdk/commit/04ea8a9b2dc9b4dab103670198ec8d9018afa18c))

# [0.22.0-dev.16](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.15...v0.22.0-dev.16) (2024-09-26)


### Bug Fixes

* encrypted multi-chunk upload ([4c9ee06](https://github.com/Akord-com/carmella-sdk/commit/4c9ee06e90756659b9235d44e8b2ccfe41aeb9c5))

# [0.22.0-dev.15](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.14...v0.22.0-dev.15) (2024-09-25)


### Bug Fixes

* reinitialize tus request headers ([2a57d60](https://github.com/Akord-com/carmella-sdk/commit/2a57d60081c79995b3af7fc9be4ff959917e26ec))

# [0.22.0-dev.14](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.13...v0.22.0-dev.14) (2024-09-25)


### Features

* export file source type ([51e0196](https://github.com/Akord-com/carmella-sdk/commit/51e0196349efc2d0923e1660461e9d87298e7c78))

# [0.22.0-dev.13](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.12...v0.22.0-dev.13) (2024-09-25)


### Features

* reinitialize xhr ([772eee1](https://github.com/Akord-com/carmella-sdk/commit/772eee1bbacf4438074f12af9dee7a1358756a0c))

# [0.22.0-dev.12](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.11...v0.22.0-dev.12) (2024-09-25)


### Features

* start types cleanup ([e7dccef](https://github.com/Akord-com/carmella-sdk/commit/e7dccefe5aace63b3d1aed551ab8f94ef60b4d0d))

# [0.22.0-dev.11](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.10...v0.22.0-dev.11) (2024-09-25)


### Features

* update starter to the newest SDK ([aff7c10](https://github.com/Akord-com/carmella-sdk/commit/aff7c106597f3c57ef439a5678169973f26b764e))

# [0.22.0-dev.10](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.9...v0.22.0-dev.10) (2024-09-25)


### Bug Fixes

* default auth storage ([6f704b3](https://github.com/Akord-com/carmella-sdk/commit/6f704b3edc63a6ff2c8e4ef25f484a4f280827a1))
* logger import ([f1d6dcd](https://github.com/Akord-com/carmella-sdk/commit/f1d6dcd46de7bf2b94fe17f4b830a1f72fc68810))
* logger usage ([4ed0c3e](https://github.com/Akord-com/carmella-sdk/commit/4ed0c3ebd4d876807cf97db695435d6b15369ae5))
* tests imports ([9411a6e](https://github.com/Akord-com/carmella-sdk/commit/9411a6ea3a98100a789fa0841e0910944917158d))
* use logLevel in config ([d9fc1cd](https://github.com/Akord-com/carmella-sdk/commit/d9fc1cd9aabcec460eda4de50e2cdaa02d1294d0))


### Features

* add AES file encryption ([0639ddc](https://github.com/Akord-com/carmella-sdk/commit/0639ddc92d0a49312ce626a5d22cf86e09907632))
* add decrypt stream func ([8e22e2a](https://github.com/Akord-com/carmella-sdk/commit/8e22e2a9698b9ce429e070b83f4119d915a91d0a))
* add proper log levels ([0dc2163](https://github.com/Akord-com/carmella-sdk/commit/0dc216357e470a5bf9a71e50f7dbc40c752ac534))
* add tus encryptable http stack ([d28a02e](https://github.com/Akord-com/carmella-sdk/commit/d28a02e2ba6b795396d286d2c4eae9682cc2da77))
* add zip module ([1bb9aeb](https://github.com/Akord-com/carmella-sdk/commit/1bb9aebbd745a2c0f579cfb0d234b468540c4614))
* move stream to typescript ([e6e87eb](https://github.com/Akord-com/carmella-sdk/commit/e6e87ebe402b2f17d6afeb5f4e52c32e40eba225))
* move whole file encryption process to onBeforeRequest ([4dff027](https://github.com/Akord-com/carmella-sdk/commit/4dff027ee5621e9f5bcebb52c92f4b9e696bf220))
* save encryptedAesKey and use it to decrypt file ([665a1e4](https://github.com/Akord-com/carmella-sdk/commit/665a1e4b87a128eb2aef76b59260da0becc63a1f))
* save JWT from wallet-based auth, retrieve address from session & refactor JWT client ([11d1c72](https://github.com/Akord-com/carmella-sdk/commit/11d1c72f1b9288de4bed25fb61206e70afd17c1d))
* use keystore & start cleanup crypto ([a5f63a5](https://github.com/Akord-com/carmella-sdk/commit/a5f63a501131b58d80889d2e25de0ecdd4b930ad))
* use webpack 'browser' for browser specific code ([abd3bba](https://github.com/Akord-com/carmella-sdk/commit/abd3bbaa4733bd65f8237e154b0a555cacbd13bf))
* use with naming convention for akord builder & simplify encrypter setup ([a6bb341](https://github.com/Akord-com/carmella-sdk/commit/a6bb341cf7134aa741c29283d4d517e3d34f72f0))


### Performance Improvements

* separate bundles for web & node; separate bundles for cjs & esm ([ac959fd](https://github.com/Akord-com/carmella-sdk/commit/ac959fd388fad85cb39f75376084e4daad1aaf80))

# [0.22.0-dev.9](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.8...v0.22.0-dev.9) (2024-09-25)


### Features

* use nonce from create challenge for authentication ([fb63e0d](https://github.com/Akord-com/carmella-sdk/commit/fb63e0df93fe6954cc71d0287f26541422ed62a8))

# [0.22.0-dev.8](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.7...v0.22.0-dev.8) (2024-09-24)


### Features

* try to use refresh token if id token not found ([9970e3f](https://github.com/Akord-com/carmella-sdk/commit/9970e3ff140e2fb9be6b0dee001f9c638e5068ee))

# [0.22.0-dev.7](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.6...v0.22.0-dev.7) (2024-09-20)


### Features

* store user address in session ([0aa2de2](https://github.com/Akord-com/carmella-sdk/commit/0aa2de23620f8b1671ac668d2a155e85853ea4bd))

# [0.22.0-dev.6](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.5...v0.22.0-dev.6) (2024-09-20)


### Bug Fixes

* set address from session in akord constructor ([1287490](https://github.com/Akord-com/carmella-sdk/commit/1287490c4d9ffc4af85d0d496d00565641795560))

# [0.22.0-dev.5](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.4...v0.22.0-dev.5) (2024-09-20)


### Features

* add retry on enoki calls ([8b449e2](https://github.com/Akord-com/carmella-sdk/commit/8b449e24e6448f1fff4ae7fed20894f2a8600a84))

# [0.22.0-dev.4](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.3...v0.22.0-dev.4) (2024-09-20)


### Features

* use auth provider specific scopes ([2ecbf48](https://github.com/Akord-com/carmella-sdk/commit/2ecbf48c62d8b45840ec4e39eb55c53bef15390b))

# [0.22.0-dev.3](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.2...v0.22.0-dev.3) (2024-09-19)


### Features

* make auth storage path env specific ([7bac05c](https://github.com/Akord-com/carmella-sdk/commit/7bac05c5d7a84ffa3ed689d57ca8338a1e35ac2c))

# [0.22.0-dev.2](https://github.com/Akord-com/carmella-sdk/compare/v0.22.0-dev.1...v0.22.0-dev.2) (2024-09-19)


### Features

* enable auth config in Akord constuctor ([0d25519](https://github.com/Akord-com/carmella-sdk/commit/0d25519d571fc42581b527409383e8ea1546c098))
* save JWT from wallet-based auth, retrieve address from session & refactor JWT client ([5f589cd](https://github.com/Akord-com/carmella-sdk/commit/5f589cda1bfb2b6de53954768eb7322409124f61))

# [0.22.0-dev.1](https://github.com/Akord-com/carmella-sdk/compare/v0.21.2...v0.22.0-dev.1) (2024-09-16)


### Features

* add decryption worker ([b9856ca](https://github.com/Akord-com/carmella-sdk/commit/b9856ca2956c2aed93662e3a2c89d9410caf58c8))
* add types declaration ([5050e01](https://github.com/Akord-com/carmella-sdk/commit/5050e01be6846c5a8c282f77f5ab5dbafea3aede))
* add uppy uploads starter ([330019d](https://github.com/Akord-com/carmella-sdk/commit/330019d3d725db9e31ff1b7af754168ac63bc40f))
* use tus protocol ([c5f979e](https://github.com/Akord-com/carmella-sdk/commit/c5f979e067844b2000462342e9bba118776c8966))

## [0.21.2](https://github.com/Akord-com/carmella-sdk/compare/v0.21.1...v0.21.2) (2024-09-13)


### Bug Fixes

* set default storage ([42ecb1c](https://github.com/Akord-com/carmella-sdk/commit/42ecb1cbb65de64234a1d0877f3c1567abda45e8))

## [0.21.1](https://github.com/Akord-com/carmella-sdk/compare/v0.21.0...v0.21.1) (2024-09-13)


### Bug Fixes

* append file in browser ([6fb7a58](https://github.com/Akord-com/carmella-sdk/commit/6fb7a5895bb2e9b84f6312e70e4600d1094cbdec))
* get auth tokens path ([4bb5c28](https://github.com/Akord-com/carmella-sdk/commit/4bb5c28777a85e69390cee4ae37940d13b71604a))

# [0.21.0](https://github.com/Akord-com/carmella-sdk/compare/v0.20.0...v0.21.0) (2024-09-12)


### Features

* add sign out function ([f3d7754](https://github.com/Akord-com/carmella-sdk/commit/f3d775480d49c3eb60e931445bddec55be502cc8))
* change to with from use to avoid React hook naming convention collision ([0483984](https://github.com/Akord-com/carmella-sdk/commit/0483984abd5000416e5b079b882a68a4b5be83bb))
* implement oauth flow ([99afe9f](https://github.com/Akord-com/carmella-sdk/commit/99afe9fca0a225412d063c6792b517d8032a0926))
* refresh token logic + use api auth/token endpoint ([d9d8ad3](https://github.com/Akord-com/carmella-sdk/commit/d9d8ad307588faabf07888ecc675788a4c34db44))
* support builder pattern with chaining for Akord init ([3f7560f](https://github.com/Akord-com/carmella-sdk/commit/3f7560f759745b980bbe90754372c3fb945082fa))

# [0.20.0](https://github.com/Akord-com/carmella-sdk/compare/v0.19.0...v0.20.0) (2024-09-09)


### Features

* add react starter with Sui wallet auth ([c479592](https://github.com/Akord-com/carmella-sdk/commit/c47959272fd6b305b75ae1fd711265383f9f026f))

# [0.19.0](https://github.com/Akord-com/carmella-sdk/compare/v0.18.0...v0.19.0) (2024-09-09)


### Features

* export wallet & encrypter ([a4bfa1d](https://github.com/Akord-com/carmella-sdk/commit/a4bfa1d14894037f0fd0b9882286d05148c0e5f0))

# [0.18.0](https://github.com/Akord-com/carmella-sdk/compare/v0.17.0...v0.18.0) (2024-09-09)


### Bug Fixes

* temp crypto dep fix for browser ([dcad7f1](https://github.com/Akord-com/carmella-sdk/commit/dcad7f1c3490e098bb01a2ef3d499442c74ab220))
* use encPrivateKey field for user encryption context ([81205a0](https://github.com/Akord-com/carmella-sdk/commit/81205a0ed58ccfbb54f34f1ce8e4e5e455147111))


### Features

* add private vault support ([7b05444](https://github.com/Akord-com/carmella-sdk/commit/7b054442cb9e4d46c494f2b3da04937edb794e58))
* add wallet based auth ([92c4c36](https://github.com/Akord-com/carmella-sdk/commit/92c4c36e6bb22559e863a39cd6290c5bfc1915cd))
* configure multiple auth providers ([b91d797](https://github.com/Akord-com/carmella-sdk/commit/b91d797b73eed3a6634c9f68578bef31ec727561))

# [0.17.0](https://github.com/Akord-com/carmella-sdk/compare/v0.16.1...v0.17.0) (2024-09-04)


### Features

* support Conflict error code ([9535e0e](https://github.com/Akord-com/carmella-sdk/commit/9535e0eeda51ef6b59bb7c4365ba8f70782523d1))

## [0.16.1](https://github.com/Akord-com/carmella-sdk/compare/v0.16.0...v0.16.1) (2024-08-30)


### Bug Fixes

* typo ([384b339](https://github.com/Akord-com/carmella-sdk/commit/384b33934afd4e1fea7c97921fa2d5ab7074f308))

# [0.16.0](https://github.com/Akord-com/carmella-sdk/compare/v0.15.0...v0.16.0) (2024-08-29)


### Features

* add trash module ([f6d2ab4](https://github.com/Akord-com/carmella-sdk/commit/f6d2ab4d84b46b74c09b7a22abe11956c6d8f206))

# [0.15.0](https://github.com/Akord-com/carmella-sdk/compare/v0.14.1...v0.15.0) (2024-08-21)


### Features

* add payment module ([cd2242a](https://github.com/Akord-com/carmella-sdk/commit/cd2242a6c29639aac6bcbd5f9fe50cb1ba1d16fe))
* add support for get-payment-plans endpoint ([19be961](https://github.com/Akord-com/carmella-sdk/commit/19be961a5d2d5fcda175d123b07fd88acee98c03))

## [0.14.1](https://github.com/Akord-com/carmella-sdk/compare/v0.14.0...v0.14.1) (2024-08-19)


### Bug Fixes

* export storage & api-key types ([5833049](https://github.com/Akord-com/carmella-sdk/commit/5833049e87331d747713f06094cde5a0cc97ff8b))

# [0.14.0](https://github.com/Akord-com/carmella-sdk/compare/v0.13.0...v0.14.0) (2024-08-19)


### Bug Fixes

* api config ([be96584](https://github.com/Akord-com/carmella-sdk/commit/be965843b1ad06be6d4bd68426fc93d7cf17b85d))


### Features

* add status query param ([ffa7893](https://github.com/Akord-com/carmella-sdk/commit/ffa78932fd5f3c93ef6606a5d944dc97f52fff4b))

# [0.13.0](https://github.com/Akord-com/carmella-sdk/compare/v0.12.0...v0.13.0) (2024-08-19)


### Features

* use carmella.io route ([cf8c754](https://github.com/Akord-com/carmella-sdk/commit/cf8c754f5f9b866790abec4743bfea4afcd659bf))

# [0.12.0](https://github.com/Akord-com/carmella-sdk/compare/v0.11.1...v0.12.0) (2024-08-16)


### Features

* **file:** remove default list filter ([76555d0](https://github.com/Akord-com/carmella-sdk/commit/76555d0fc30d0c8fd301cb868d8ce5ef180b4f43))

## [0.11.1](https://github.com/Akord-com/carmella-sdk/compare/v0.11.0...v0.11.1) (2024-08-14)


### Bug Fixes

* download public files ([a7c846e](https://github.com/Akord-com/carmella-sdk/commit/a7c846ec37f0175cc4085b23886ce750fd5f6c21))

# [0.11.0](https://github.com/Akord-com/carmella-sdk/compare/v0.10.0...v0.11.0) (2024-08-13)


### Features

* go back to using strings for timestamps ([ddef91a](https://github.com/Akord-com/carmella-sdk/commit/ddef91a8f2ceea18ee9c622008bce0df24d9b982))

# [0.10.0](https://github.com/Akord-com/carmella-sdk/compare/v0.9.0...v0.10.0) (2024-08-13)


### Features

* add deletePermanently() methods ([e5b8480](https://github.com/Akord-com/carmella-sdk/commit/e5b84805127869343f03ea2a0ed86d25dc3faac8))

# [0.9.0](https://github.com/Akord-com/carmella-sdk/compare/v0.8.0...v0.9.0) (2024-08-13)


### Features

* update transaction fields ([23b7618](https://github.com/Akord-com/carmella-sdk/commit/23b761877ee0e1990dd7fddef798e944386b70e3))
* use number for all timestamps ([1541e70](https://github.com/Akord-com/carmella-sdk/commit/1541e7099fd1c4ad53692dcbffc023ba1f2ecb8c))

# [0.9.0-dev.1](https://github.com/Akord-com/carmella-sdk/compare/v0.8.0...v0.9.0-dev.1) (2024-08-13)


### Features

* update transaction fields ([23b7618](https://github.com/Akord-com/carmella-sdk/commit/23b761877ee0e1990dd7fddef798e944386b70e3))
* use number for all timestamps ([1541e70](https://github.com/Akord-com/carmella-sdk/commit/1541e7099fd1c4ad53692dcbffc023ba1f2ecb8c))

# [0.8.0](https://github.com/Akord-com/carmella-sdk/compare/v0.7.0...v0.8.0) (2024-08-12)


### Bug Fixes

* remove code duplicate ([8267c08](https://github.com/Akord-com/carmella-sdk/commit/8267c0853de8dc7214bdf710f23fb0fa55b44432))


### Features

* add more storage fields ([ba777fa](https://github.com/Akord-com/carmella-sdk/commit/ba777fa78853c937322bbf93f27351b36781853e))

# [0.8.0-dev.1](https://github.com/Akord-com/carmella-sdk/compare/v0.7.0...v0.8.0-dev.1) (2024-08-12)


### Bug Fixes

* remove code duplicate ([8267c08](https://github.com/Akord-com/carmella-sdk/commit/8267c0853de8dc7214bdf710f23fb0fa55b44432))


### Features

* add more storage fields ([ba777fa](https://github.com/Akord-com/carmella-sdk/commit/ba777fa78853c937322bbf93f27351b36781853e))

# [0.7.0-dev.2](https://github.com/Akord-com/carmella-sdk/compare/v0.7.0-dev.1...v0.7.0-dev.2) (2024-08-12)


### Features

* add more storage fields ([ba777fa](https://github.com/Akord-com/carmella-sdk/commit/ba777fa78853c937322bbf93f27351b36781853e))

# [0.7.0-dev.1](https://github.com/Akord-com/carmella-sdk/compare/v0.6.0...v0.7.0-dev.1) (2024-08-09)


### Bug Fixes

* api key flow ([2b2125e](https://github.com/Akord-com/carmella-sdk/commit/2b2125ee7d5eeb9e6b37f67b6d6a3cfac75efbaf))
* autoExecute param ([755afca](https://github.com/Akord-com/carmella-sdk/commit/755afca62c82b349514f8489adbd1ed9e5be5eb0))
* create file params ([92fa925](https://github.com/Akord-com/carmella-sdk/commit/92fa925a6312a57bdd8ba3044592f5e9e8aab61d))
* storage flow ([a2a576f](https://github.com/Akord-com/carmella-sdk/commit/a2a576f27f7f288d388f3df89c17049c9cd65ab5))


### Features

* add trash size to vault ([68bc00c](https://github.com/Akord-com/carmella-sdk/commit/68bc00ca93e0345ba3bc83bb8c302eb4884c1e16))
* trashSize -> trash ([69c6fe4](https://github.com/Akord-com/carmella-sdk/commit/69c6fe4e31b3a835196fcec1025ad78cc4fb8dbe))
* vault filter cleanup ([c7aa5a4](https://github.com/Akord-com/carmella-sdk/commit/c7aa5a4b074c80ee7519894f70d64689e1cbc568))

# [0.6.0-dev.4](https://github.com/Akord-com/carmella-sdk/compare/v0.6.0-dev.3...v0.6.0-dev.4) (2024-08-09)


### Bug Fixes

* api key flow ([2b2125e](https://github.com/Akord-com/carmella-sdk/commit/2b2125ee7d5eeb9e6b37f67b6d6a3cfac75efbaf))
* storage flow ([a2a576f](https://github.com/Akord-com/carmella-sdk/commit/a2a576f27f7f288d388f3df89c17049c9cd65ab5))

# [0.6.0-dev.3](https://github.com/Akord-com/carmella-sdk/compare/v0.6.0-dev.2...v0.6.0-dev.3) (2024-08-09)


### Bug Fixes

* autoExecute param ([755afca](https://github.com/Akord-com/carmella-sdk/commit/755afca62c82b349514f8489adbd1ed9e5be5eb0))
* create file params ([92fa925](https://github.com/Akord-com/carmella-sdk/commit/92fa925a6312a57bdd8ba3044592f5e9e8aab61d))


### Features

* trashSize -> trash ([69c6fe4](https://github.com/Akord-com/carmella-sdk/commit/69c6fe4e31b3a835196fcec1025ad78cc4fb8dbe))
* vault filter cleanup ([c7aa5a4](https://github.com/Akord-com/carmella-sdk/commit/c7aa5a4b074c80ee7519894f70d64689e1cbc568))

# [0.6.0-dev.2](https://github.com/Akord-com/carmella-sdk/compare/v0.6.0-dev.1...v0.6.0-dev.2) (2024-08-09)


### Features

* add trash size to vault ([68bc00c](https://github.com/Akord-com/carmella-sdk/commit/68bc00ca93e0345ba3bc83bb8c302eb4884c1e16))

# [0.6.0-dev.1](https://github.com/Akord-com/carmella-sdk/compare/v0.5.2-dev.1...v0.6.0-dev.1) (2024-08-08)


### Bug Fixes

* build ([4cf4400](https://github.com/Akord-com/carmella-sdk/commit/4cf4400b4c0bccd83bb62125a4f3f9aa928943ae))


### Features

* adjust folder & file queries with new api ([ad4ec6c](https://github.com/Akord-com/carmella-sdk/commit/ad4ec6c0176fe99c6ff716037ab34d7c2f018b95))
* implement api key module ([64ce2f4](https://github.com/Akord-com/carmella-sdk/commit/64ce2f4c4f7b715c1dd0cc3d711a9e3fcd6c2f24))
* implement me module ([62d4604](https://github.com/Akord-com/carmella-sdk/commit/62d46048b7a5bf38190b253ccc963c4c3c2f1777))
* switch to lowercase constants ([02997e7](https://github.com/Akord-com/carmella-sdk/commit/02997e7f590746c0628f77cfea4ced5369dedc9f))

## [0.5.2-dev.1](https://github.com/Akord-com/carmella-sdk/compare/v0.5.1...v0.5.2-dev.1) (2024-08-07)


### Bug Fixes

* starter setup ([63a0497](https://github.com/Akord-com/carmella-sdk/commit/63a0497a09c0f34103941b6d3c97e6da53d86379))

## [0.5.1](https://github.com/Akord-com/carmella-sdk/compare/v0.5.0...v0.5.1) (2024-08-07)


### Bug Fixes

* append name to form before file ([7db2390](https://github.com/Akord-com/carmella-sdk/commit/7db23903fe2b1a4afc3cab59ef2112284c7aea02))

# [0.5.0](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0...v0.5.0) (2024-08-06)


### Bug Fixes

* file & folder api types ([87cd0c3](https://github.com/Akord-com/carmella-sdk/commit/87cd0c385c2ea31d0eb99ceea274dd4bdc640156))
* **file:** add vaultId parameter to upload request ([e0db794](https://github.com/Akord-com/carmella-sdk/commit/e0db79410cf38a17351ac4d06d2b190cac4d243c))
* send file name ([eeb70f1](https://github.com/Akord-com/carmella-sdk/commit/eeb70f10bee5c6c78cfef9b622a4e17c67c7aa17))
* typo ([349df75](https://github.com/Akord-com/carmella-sdk/commit/349df75a77c000526a7fc3c8bb3997855f687d0c))


### Features

* add file upload form in nextjs starter ([b79789e](https://github.com/Akord-com/carmella-sdk/commit/b79789e162279ea82b35f8ac06ef4e6231315d68))
* add nextjs starter enoki <> carmella SDK ([e8709b6](https://github.com/Akord-com/carmella-sdk/commit/e8709b61d77a9fa43bab5bfe7edb75d8c176f83c))
* **auth:** make token provider async ([f88295f](https://github.com/Akord-com/carmella-sdk/commit/f88295fd8d92559743fa53f2ff9db8220923cf50))
* cleanup file types ([9afc769](https://github.com/Akord-com/carmella-sdk/commit/9afc769cc124b45cd844f0051b119eaac9c644c7))
* cleanup membership types ([fe77230](https://github.com/Akord-com/carmella-sdk/commit/fe77230c17c2b94dfd189416f46cf8c959634ddb))
* generate enoki nonce for zklogin ([ec0914a](https://github.com/Akord-com/carmella-sdk/commit/ec0914aeaeae015fb2dc60f7b5cb9ca85720f276))
* mock enoki flow ([76f1121](https://github.com/Akord-com/carmella-sdk/commit/76f1121b1b2148a3b9821a2b254d4b6fc49d11bb))
* move enoki signer & its deps to nextjs starter ([abbbe42](https://github.com/Akord-com/carmella-sdk/commit/abbbe4249706a6d48570b63910a3fc83a2e535d4))
* remove avatar ([4923e16](https://github.com/Akord-com/carmella-sdk/commit/4923e16d884a8ae38758b090a3d3ebd5f9d725ce))
* remove storage payment ([ac99964](https://github.com/Akord-com/carmella-sdk/commit/ac99964a389eb9abfd390b937e1a2e4f9199b374))
* remove sui specific code ([bc1ff3a](https://github.com/Akord-com/carmella-sdk/commit/bc1ff3acef1444342e644aa9658b0269792dae82))
* support auth token provider & api key authorization ([d71efeb](https://github.com/Akord-com/carmella-sdk/commit/d71efeb97f6bd4b37c9533061d317c626bebdc57))
* use authTokenProvider & cleanup app logs ([e3c90cf](https://github.com/Akord-com/carmella-sdk/commit/e3c90cf5610a177e1dffb73910db0f309a8857c3))
* use json for simple api calls & multipart for file uploads ([db6c7f6](https://github.com/Akord-com/carmella-sdk/commit/db6c7f695f02de901de81969967dec8bb0a443e5))

# [0.4.0-dev.15](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.14...v0.4.0-dev.15) (2024-08-06)


### Features

* remove avatar ([4923e16](https://github.com/Akord-com/carmella-sdk/commit/4923e16d884a8ae38758b090a3d3ebd5f9d725ce))

# [0.4.0-dev.14](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.13...v0.4.0-dev.14) (2024-08-06)


### Features

* remove sui specific code ([bc1ff3a](https://github.com/Akord-com/carmella-sdk/commit/bc1ff3acef1444342e644aa9658b0269792dae82))

# [0.4.0-dev.13](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.12...v0.4.0-dev.13) (2024-08-06)


### Bug Fixes

* send file name ([eeb70f1](https://github.com/Akord-com/carmella-sdk/commit/eeb70f10bee5c6c78cfef9b622a4e17c67c7aa17))

# [0.4.0-dev.12](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.11...v0.4.0-dev.12) (2024-08-06)


### Bug Fixes

* typo ([349df75](https://github.com/Akord-com/carmella-sdk/commit/349df75a77c000526a7fc3c8bb3997855f687d0c))

# [0.4.0-dev.11](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.10...v0.4.0-dev.11) (2024-08-06)


### Features

* use authTokenProvider & cleanup app logs ([e3c90cf](https://github.com/Akord-com/carmella-sdk/commit/e3c90cf5610a177e1dffb73910db0f309a8857c3))

# [0.4.0-dev.10](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.9...v0.4.0-dev.10) (2024-08-06)


### Bug Fixes

* file & folder api types ([87cd0c3](https://github.com/Akord-com/carmella-sdk/commit/87cd0c385c2ea31d0eb99ceea274dd4bdc640156))

# [0.4.0-dev.9](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.8...v0.4.0-dev.9) (2024-08-06)


### Features

* **auth:** make token provider async ([f88295f](https://github.com/Akord-com/carmella-sdk/commit/f88295fd8d92559743fa53f2ff9db8220923cf50))

# [0.4.0-dev.8](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.7...v0.4.0-dev.8) (2024-08-06)


### Features

* support auth token provider & api key authorization ([d71efeb](https://github.com/Akord-com/carmella-sdk/commit/d71efeb97f6bd4b37c9533061d317c626bebdc57))

# [0.4.0-dev.7](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.6...v0.4.0-dev.7) (2024-08-06)


### Features

* cleanup file types ([9afc769](https://github.com/Akord-com/carmella-sdk/commit/9afc769cc124b45cd844f0051b119eaac9c644c7))
* cleanup membership types ([fe77230](https://github.com/Akord-com/carmella-sdk/commit/fe77230c17c2b94dfd189416f46cf8c959634ddb))

# [0.4.0-dev.6](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.5...v0.4.0-dev.6) (2024-08-01)


### Bug Fixes

* **file:** add vaultId parameter to upload request ([e0db794](https://github.com/Akord-com/carmella-sdk/commit/e0db79410cf38a17351ac4d06d2b190cac4d243c))

# [0.4.0-dev.5](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.4...v0.4.0-dev.5) (2024-08-01)


### Features

* add file upload form in nextjs starter ([b79789e](https://github.com/Akord-com/carmella-sdk/commit/b79789e162279ea82b35f8ac06ef4e6231315d68))

# [0.4.0-dev.4](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.3...v0.4.0-dev.4) (2024-07-31)


### Features

* generate enoki nonce for zklogin ([ec0914a](https://github.com/Akord-com/carmella-sdk/commit/ec0914aeaeae015fb2dc60f7b5cb9ca85720f276))

# [0.4.0-dev.3](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.2...v0.4.0-dev.3) (2024-07-31)


### Features

* add nextjs starter enoki <> carmella SDK ([e8709b6](https://github.com/Akord-com/carmella-sdk/commit/e8709b61d77a9fa43bab5bfe7edb75d8c176f83c))
* mock enoki flow ([76f1121](https://github.com/Akord-com/carmella-sdk/commit/76f1121b1b2148a3b9821a2b254d4b6fc49d11bb))
* move enoki signer & its deps to nextjs starter ([abbbe42](https://github.com/Akord-com/carmella-sdk/commit/abbbe4249706a6d48570b63910a3fc83a2e535d4))
* use json for simple api calls & multipart for file uploads ([db6c7f6](https://github.com/Akord-com/carmella-sdk/commit/db6c7f695f02de901de81969967dec8bb0a443e5))

# [0.4.0-dev.2](https://github.com/Akord-com/carmella-sdk/compare/v0.4.0-dev.1...v0.4.0-dev.2) (2024-07-29)


### Features

* fallback blob import ([aff03ec](https://github.com/Akord-com/carmella-sdk/commit/aff03ec60ed7194f64f4c4b816067356f358340b))

# [0.4.0-dev.1](https://github.com/Akord-com/carmella-sdk/compare/v0.3.0...v0.4.0-dev.1) (2024-07-22)


### Features

* remove storage payment ([ac99964](https://github.com/Akord-com/carmella-sdk/commit/ac99964a389eb9abfd390b937e1a2e4f9199b374))
