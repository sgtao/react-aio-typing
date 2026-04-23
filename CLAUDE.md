# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`aio-typing` is a browser-based English typing game built from static HTML/CSS/JS with no build system. It is deployed via GitHub Pages from the `docs/` directory. Players type English sentences drawn from the Japanese English-learning book *ALL IN ONE*, with audio playback support.

## Development

There is no build step, package manager, or test suite. Development is done by editing files directly and previewing in a browser.

To run locally, serve the `docs/` directory with any static file server, for example:

```bash
npx serve docs/
# or
python3 -m http.server 8080 --directory docs/
```

The app requires a server (not `file://`) because it uses `fetch()` to load the JSON content file.

## Architecture

All logic is in `docs/scripts/` as three IIFE modules. They are loaded via `defer` in `index.html` and must remain in this script order:

1. **`resourceAllinOne.js`** — Data layer. Fetches and caches the JSON content file, exposes `loadResourceCategory`, `loadResourceContents`, and `checkFileExist`.

2. **`audioControl.js`** — Audio layer. Manages `<audio>` DOM elements inside `#audio-panel`. Exposes `appendAudioElements`, `playAudioFile`, `stopAudioFile`, `stopAllAudioFiles`.

3. **`managementGame.js`** — Game logic and UI. Owns all game state (`isPlaying`, `isNextAvailable`, `contents_index`, etc.) and all keyboard/click event listeners. Calls the other two modules.

### Content data format

Content is loaded from `assets-sample.json` (path hardcoded in `managementGame.js`). The real content file (`public/assets/`) is gitignored. The expected JSON shape is:

```json
{
  "category": "01_時制",
  "contents": [
    {
      "index": "idx001",
      "englishText": "The sentence to type.",
      "translation": {
        "slashed": "スラッシュリーディング訳",
        "natural": "自然な和訳"
      }
    }
  ]
}
```

Only `translation.slashed` is displayed; `translation.natural` is unused in the UI.

### Audio file convention

Audio files live in `docs/audio/` and are named by stripping the `idx` prefix from the index and appending `.mp3`. For example, `idx001` → `001.mp3`. The file is only loaded if `checkFileExist` confirms it exists (via `fetch`).

### UI visibility

Elements are shown/hidden by toggling the `.hidden` CSS class (`display: none`). There is no front-end framework.

## Game state machine

- **Menu state**: `isPlaying = false`. Click or Enter starts the game.
- **Playing state**: `isPlaying = true`, `isNextAvailable = false`. Keystrokes are matched against `wordUpper[loc]`/`wordLower[loc]`. Non-alphanumeric characters are skipped by `findTypingChar()`.
- **Word complete**: `isNextAvailable = true`. Enter advances to the next content or returns to menu when `contents_index` is empty.
- Enter during playing (before completion) force-finishes the current word and shows elapsed time.
- Escape during playing stops all audio and returns to menu.
- Space replays the current audio.

`contents_index` is a shuffled array of numeric indices into the loaded contents array; items are spliced out as they are consumed.
