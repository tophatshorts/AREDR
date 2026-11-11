# GDRNG:R — Geometry Dash RNG Reborn

A Geometry Dash collection game with a modern home and login screen, centered CS-style reel inspired by `origin/legacy`, quick roll, auto roll, permanent upgrades, collection, daily best, and community leaderboard. The legacy branch is unchanged.

## Run

Requires Node.js 22+. No dependency installation is needed.

```sh
npm start
```

Open http://localhost:3000. Use `PORT` to select another port. `npm run dev` watches server changes; reload the browser after front-end edits.

```sh
npm test
npm run build
```

The build produces a standalone Node application in `dist/`; run `cd dist && npm start`. Deploy to a Node host: the catalog endpoint uses the Node server, so this is not a static-only application.

## Firebase accounts and cloud setup

The app uses Firebase Authentication (Google and email/password), password reset, persistent sign-in, and Firestore cloud saves. It reuses the **public web application configuration** from the legacy branch in `public/firebase-config.json`. Firebase web configuration is not an admin credential. No service-account key is used or needed in the browser. SDK modules load independently from Google's CDN; guest play works if the SDK or Firebase is unavailable.

Before account features work on a new domain, the Firebase project owner must:

1. Enable **Email/Password** and **Google** in Firebase Console → Authentication → Sign-in method.
2. Add the actual production and development hostnames to Authentication → Settings → Authorized domains. Add `localhost` for local testing if needed.
3. Review and deploy `firestore.rules` and `firestore.indexes.json` to the named database in `firebase.json`. The rules retain the legacy rules and add the `gdrngPlayers`, `gdrngLeaderboard`, and `gdrngDaily/{date}/entries` namespaces. If production rules have changed since the legacy branch, merge the Reborn blocks into those current rules before deploying.

From a Firebase CLI session already authorized for that project:

```sh
firebase deploy --only firestore --project gen-lang-client-0358715185
```

For a different Firebase project, replace the public web configuration and update `firebase.json`'s database. Authentication providers, authorized domains, Firestore rules, and indexes require project-owner access; the repository build does not change Firebase Console settings or deploy rules.

Guest progress remains under `gd-rng-save-v1` for compatibility. Each signed-in account has its own device save under `gdrng-reborn-account-<uid>` and private Firestore document. Guest progress is not silently uploaded or merged. On sign-in, the newest account snapshot wins; this is snapshot sync, not simultaneous multiplayer merging. Sign out waits for a save attempt. Failed cloud loads do not overwrite an existing cloud collection: use **Save to cloud** in the account dialog to retry. Cloud failures are shown in that dialog, while device saves continue. Export a JSON backup from Collection at any time. Cloud snapshots are limited to 900 KB; larger saves remain exportable locally.

Public scores contain only player display name, best level, difficulty, rolls, and update time. Scores are player-submitted; this is not a server-authoritative competitive economy. The leaderboard orders difficulty descending, then rolls descending. Daily best resets at midnight UTC for every player, with a personal best available offline. Missing permissions, indexes, or networking show honest empty/error states rather than invented players.

## Rolling and catalog

Space rolls outside dialogs and interactive controls. Quick roll shortens animation; the Quick spin upgrade makes it faster. Auto roll unlocks for 180 demon keys and pauses on screen changes, dialogs, hidden tabs, or the difficulty selected in Settings. Reduced motion honors both system preferences and the in-game setting. Existing save balances named `orbs` are retained internally and displayed as demon keys.

The server caches GDBrowser's rated search and samples random pages using the API's reported page count. Cached levels play immediately while upstream refreshes are coalesced and limited to one per ten seconds. A bundled starter pool works offline. The footer identifies live versus cached data. The downloaded pool is not an offline dump of every rated level. Each level's roll weight is `(0.65 + luckLevel * 0.025) ^ difficultyRank`, from Auto (0) to Extreme Demon (10). The odds dialog shows current pool probabilities.

## Asset sources

Real Geometry Dash difficulty faces are vendored in `public/assets/faces/` from [GDBrowser's difficulty asset archive](https://github.com/tzt345/GDBrowser/tree/master/assets/difficulties). Level thumbnail IDs and ranks are extracted from the legacy branch into `public/legacy-levels.json`; thumbnails use the same [AREDL thumbnail source](https://github.com/All-Rated-Extreme-Demon-List/Thumbnails) as legacy's `DemonThumbnail` component. Starter extreme thumbnails and home artwork are vendored locally. Other levels try the legacy thumbnail URL, then [GDLevelThumbs](https://github.com/Prevter/GDLevelThumbs); if unavailable, the difficulty face and level name remain visible. No unrelated thumbnail is substituted. Fonts from Google Fonts are optional with local system fallbacks.

Geometry Dash and its assets belong to RobTop Games. This is an unaffiliated fan project.
