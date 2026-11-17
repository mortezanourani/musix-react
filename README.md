# Musix

Monorepo for the musix music player.

- **`apps/mobile`** — Android app (Expo / React Native). Reads the device's music
  library and plays it through the Now Playing modal.
- **`apps/web`** — web client (Vite / React / PWA). Intended for iOS and Windows
  once the music library lives online.
- **`packages/core`** — framework-agnostic domain logic: models, library
  indexing, playlists, and the future sync/streaming API client. No React, no
  React Native, no DOM.
- **`packages/ui`** — shared design tokens, theme, and icons (not components).

## Current state

- `apps/mobile` — **Home** opens with the **Musix** title and a live library
  search, then horizontally swipeable shelves for **Recently played** albums,
  artists, and tracks, plus **Albums**, **Artists**, and **Books**.
  Cards are sized for two and a half squares, then scaled down by 10% so the
  next card peeks in. Tapping a track starts playback in the **Now Playing**
  modal; tapping an album or artist opens its detail screen. Files from the
  device's `Music` directory
  appear as albums; files from its `Audiobooks` directory appear as books. The
  **Update Library** button requests
  audio permission, scans both directories through the media store, reads
  embedded tags (title, artist, author, album, album artist, track number,
  cover art)
  through a local native module, and persists the result so it survives an app
  restart. The **Manage music files** page in Settings shows the Music and
  Audiobooks directories as expandable folder trees, with search across files.
  Select a file to edit its album, track number, title, and artist tags directly
  in the audio file, with Android's per-file approval on Android 11 and newer.
  Artists from both directories appear together in **Artists**.
- **Albums** shows a two-column grid of album cover tiles (initials when a file
  has no embedded art), grouped by album title and album artist, so compilations
  stay together instead of splitting by each track's artist. Tapping an album
  opens its tracks in album order and has a **Play** button that queues the
  whole album.
- **Artists** shows a two-column grid of artist tiles. Tags containing several
  artists (`A & B`, `A feat. B`, `A; B`) list the track under each artist.
  Tapping an artist opens that artist's albums, where **Play** queues all of
  their tracks album by album. Playing an album or artist shows it in
  **Recently played** instead of the individual track that started it.
- The **Settings** page (gear icon on Home) lets you choose **System**,
  **Light**, or **Dark** appearance, update the library, and see its scan
  status. Apple Music red (`#fa243c`) stays the accent color in both themes.
- Tracks without tags appear under **Unknown Artist** / **Unknown Album**.
  Embedded cover art is cached under the app's files directory by the native
  module.
- The **Now Playing** modal (a real modal overlay, not a navigation screen)
  shows the current track's artwork and tags, a draggable progress bar,
  previous / play-pause / next controls, and shuffle and repeat (off / all /
  one) toggles. A queue button opens a **Queue** panel where tracks can be
  selected, reordered, or removed. Swipe the player down or tap the chevron to
  minimize it. Playback uses `expo-audio`, starts when a track is tapped, and
  advances through the queue. Minimizing keeps playback running and collapses it
  into a bottom mini-player bar with the current track, progress,
  previous / next, and play-pause controls. Tapping the bar opens the full modal
  again. Playback continues when the screen locks or the app is backgrounded,
  and the lock screen / notification shows the track with play-pause and scrub
  controls; audiobooks also get 10-second seek buttons.
- **Audiobooks** get a few extra playback features. The player swaps shuffle and
  repeat for a playback-speed picker (0.75× to 2×, with pitch correction) and a
  sleep timer (5, 15, 30, 45, or 60 minutes, or the end of the current chapter).
  Speed is remembered for audiobooks and music separately, so a faster book does
  not speed up songs. The player saves the listening position every few seconds
  and resumes from it the next time the book is opened, clearing it when a
  chapter finishes. The mini-player swaps previous / next for rewind / forward
  10 seconds while a book is playing.

## Requirements

- Node.js 22+
- npm 10+ (npm workspaces)

## Getting started

```bash
npm install
```

### Mobile (Expo)

Targets **Expo SDK 57**.

```bash
npm run dev:mobile      # start Metro
npm run android         # start on a connected Android device/emulator
```

> **Run Expo commands from `apps/mobile`**, or through the root scripts above.
> Expo treats the current directory as the project root: running `npx expo start`
> at the repository root creates a second Expo project there (`app.json`,
> `android/`, `.expo/`) and fails with `Unable to resolve "../../App"`.

Installing an Expo-managed dependency:

```bash
cd apps/mobile
npx expo install expo-audio
```

Or from the repository root:

```bash
npm exec -w @musix/mobile -- expo install expo-audio
```

Running the app on a device requires a development build, not Expo Go, because
audio playback and the tag reader rely on native modules. `npm run android`
builds a new development build; use it after changing anything under
`apps/mobile/modules`, after adding a native Expo dependency, or after changing
the `expo-audio` config plugin in `app.json` (background playback uses Android
foreground-service permissions and the iOS `audio` background mode).

The tag reader is a local Expo module at
`apps/mobile/modules/music-metadata`. Expo autolinking finds it through the
`nativeModulesDir` setting in `apps/mobile/package.json`. It uses
jaudiotagger to write tags into supported audio files; tag editing requires
Android 11 or newer so Android can request approval before changing existing
media files.

### Web (Vite)

```bash
npm run dev:web         # http://localhost:5173
npm run build:web
```

## Workspace commands

```bash
npm run typecheck       # every workspace that defines it
npm run lint            # every workspace that defines it
```

## Layout

```
musix-react/
├── apps/
│   ├── mobile/         # Expo (React Native, TypeScript)
│   │   ├── App.tsx
│   │   ├── app.json
│   │   ├── index.ts
│   │   ├── metro.config.js
│   │   ├── modules/    # local native modules (tag reader)
│   │   └── assets/
│   └── web/            # Vite (React, TypeScript)
│       ├── index.html
│       ├── src/
│       └── vite.config.ts
├── packages/
│   ├── core/           # @musix/core
│   └── ui/             # @musix/ui
├── package.json        # npm workspaces
└── tsconfig.base.json
```

## Notes

- `apps/mobile/android` and `apps/mobile/ios` are generated by Expo and are
  git-ignored. Configure native behaviour in `app.json` and config plugins.
- Workspace packages are consumed as TypeScript source (`exports` points at
  `src/index.ts`); Metro and Vite both compile them directly, so there is no
  build step for `packages/*`.
- React and React DOM are pinned to `19.2.3` for the whole workspace via
  `overrides` in the root `package.json`, because that is the version required
  by React Native 0.86 / Expo SDK 57.
