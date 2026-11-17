# Wujiang: The Places We Hold Dear

A minimal portrait site built from `sample.pdf` as the visual reference, opening with a vertical About introduction followed by the portrait index.

Open `index.html` directly, or serve the folder with:

```sh
python3 -m http.server 8000
```

## Structure

- **Opening About:** a centered editorial column titled "A Future Between Cities" with the opening copy from `about.txt`, followed by the "The Places We Hold Dear" section. The wordmark above it carries "Wujiang: The Places We Hold Dear". It is the first section on load and scrolls vertically with the page.
- **Home:** seven vertical 3:4 portrait slots in one horizontally scrollable rail, placed directly below the About introduction.
- **What Remains:** a second editorial section directly after the portrait rail, using the "What Remains?" closing reflection from `about.txt` and the same centered type column.
- **Scenery rail:** seven vertical 3:4 photographs from `assets/scenery/` in a second full-screen rail below the closing text. Each cover carries a bilingual name overlay, and the rail shares the portrait rail's ripple depth, drag, keyboard, arrow, and infinite-loop behavior.
- **Scenery pages:** clicking a scenery photograph opens a split view with that photograph on the left and its companion collection from the matching `assets/wall02/NN/` folder in a vertical list on the right. After a short pause, the cover crossfades into the matching project text; scenery collections use numbers only and do not display captions.
- **Ripple focus:** the portrait nearest the center scales to 1.2× and stays sharp; cards toward the edges fall to 0.9× with a soft blur and fade. The depth values are interpolated with `requestAnimationFrame` instead of CSS transitions for smoother dragging.
- **Infinite loop:** the seven portraits repeat seamlessly in both directions, so scrolling forward from `07` continues to `01` and scrolling back from `01` continues to `07`. The loop is built from cloned edge cards in `assets/main.js`; the seven files in `assets/portraits/` remain the only source.
- **Portrait page:** clicking a portrait enlarges it into a split view with the portrait on the left and a vertical photograph list on the right. On mobile, the portrait/story sits above the photograph list.
- **Names:** each portrait and scenery cover carries a pure-white name overlay in the lower-left corner. English mode shows only the English name; Chinese mode shows only the Chinese name. Names without a translation use the same label in both modes.
- **About navigation:** the fixed `About / 关于` link opens a text-only About overlay at the reader's current position instead of jumping back to the top of the page. Closing it returns focus to the link without changing the underlying scroll position.
- **Timed crossfade:** three seconds after a portrait or scenery page opens, its cover crossfades over 2.2 seconds into an independently scrollable text column for interviews, field notes, and project statements. Once settled, clicking or pressing `Enter` on the text returns to the cover, and the cover returns to the text. The opacity crossfade remains active under `prefers-reduced-motion`; spatial motion such as the cover zoom is disabled.
- **Photo list:** each photograph sits beside a reserved caption column. The photograph list scrolls vertically and independently from the portrait text.
- **Navigation:** the page scrolls vertically through About, the portrait index, What Remains, and the scenery rail. When scrolling settles and either rail covers at least 75% of the viewport, a damped spring pulls it into a full-screen position; new wheel, touch, pointer, or keyboard input interrupts the snap. With macOS Reduce Motion enabled, the spring remains but is more tightly damped with only a faint settle. Drag, trackpad, arrow buttons, or keyboard arrows move either photo rail horizontally. `Escape` closes an open portrait or scenery page.
- **Language:** the `EN / 中` control switches interface labels, the About and What Remains copy, portrait and scenery stories, photo captions, and image descriptions between English and Simplified Chinese. It updates accessible labels and remembers the choice in `localStorage`. Names without a Chinese translation, such as `JA` and `CC`, stay the same in both modes.

Portrait and scenery stories and the long-form About copy are live. Photograph captions come from the matching `NNcaptions.txt` file; photos without a caption show only their number and leave the text area blank.

## Photographs

- The seven homepage portraits are read only from `assets/portraits/01.jpg` through `07.jpg`.
- That folder is the single source for the intro photographs; no generated or PDF-extracted images are used.
- The portrait photograph list reads from `assets/wall/01/` through `assets/wall/07/`, matching each portrait number. Empty folders show a clean empty state until photographs are added.
- The scenery rail reads its seven cover photographs directly from `assets/scenery/01.jpeg` through `07.jpeg`.
- Each scenery page reads its companion photographs from the matching folder in `assets/wall02/01/` through `assets/wall02/07/`. All seven collections currently contain photographs.

## Portrait names

- `01` — JA
- `02` — CC
- `03` — 贝利亚哥哥 (Big Brother Belial)
- `04` — 胖哥 (Pangge)
- `05` — 鸡翅弟弟 (Chicken-Wing Bro)
- `06` — 大志 (Dazhi)
- `07` — 杂记 (Miscellaneous)

The bilingual names live in `index.html`; their per-portrait colors and overlay styling live in `assets/style.css`.

## Typography

The site loads DengXian Light from `assets/fonts/DengXian-Light.ttf` through
`@font-face`, then falls back to the platform's native Chinese UI font when the
file is unavailable. The Microsoft font file is intentionally excluded from Git
and Vercel because its web-embedding rights have not been confirmed.

## Photo manifest

Browsers cannot list a local folder, so `assets/wall/manifest.js` records the portrait photograph lists. After adding, removing, or renaming photographs in any `assets/wall/01`–`07` folder, regenerate it:

```sh
python3 tools/build-wall-manifest.py
```

The generated manifest is loaded by `index.html` before `assets/main.js`. The seven homepage portraits are not reused in the photograph lists.

Scenery collections use a separate generated manifest. After changing files in any `assets/wall02/01`–`07` folder, regenerate it:

```sh
python3 tools/build-scenery-manifest.py
```

The generated `assets/wall02/manifest.js` is loaded by `index.html` before `assets/main.js`.

Wall photos use sequential two-digit names within each portrait folder (`01.jpeg`, `02.jpeg`, and so on), preserving their original extension.

## Photo captions

Caption files use the photo number as a section heading, followed by one or more caption lines:

```text
01
First caption line
Second caption line

02
Another caption
```

Chinese captions live in `assets/wall/NN/` as `NNcaptions.txt`, `NNcaption.txt`, or `NN.txt`. English translations use the matching `NNcaptions.en.txt`, `NNcaption.en.txt`, or `NN.en.txt`. After editing any caption file, regenerate the browser-readable manifest:

```sh
python3 tools/build-wall-captions.py
```

The generated `assets/wall/captions.js` contains both languages and is loaded before `assets/main.js`. Missing caption sections stay blank.

## Portrait text

The story column reads from `assets/portraits/01.txt` through `07.txt` in Chinese and `01.en.txt` through `07.en.txt` in English. Blank files show a localized "Text forthcoming" state. After editing any text file, regenerate the browser-readable manifest:

```sh
python3 tools/build-portrait-text.py
```

The generated `assets/portraits/stories.js` is loaded by `index.html` before `assets/main.js`. Blank lines create new paragraphs; single line breaks are preserved.

## Scenery text

Each scenery page reads its project statement from `assets/scenery/01.txt` through `07.txt`. The first non-empty line is the title; the remaining lines are the body, with blank lines creating spaced sections. English translations live in `01.en.txt` through `07.en.txt` using the same structure. Chinese mode shows only the Chinese title and body; English mode shows only the English title and body. A missing translation shows the localized text-placeholder state instead of falling back to the other language.

After editing a scenery text file, regenerate the browser-readable manifest:

```sh
python3 tools/build-scenery-text.py
```

The generated `assets/scenery/stories.js` is loaded by `index.html` before `assets/main.js`.

Replace a portrait by overwriting the matching file in `assets/portraits/`. Keep the same `01.jpg`–`07.jpg` filenames and a 3:4 crop.

The portrait URLs in `index.html` end in `?v=4` so browsers do not keep serving older photos after a replacement. If a newly replaced portrait still shows the previous image, increment that value (for example to `?v=5`).

## Visual rules

- Keep the home page image-first: no captions, dates, or metadata on the portraits.
- Keep the open portrait page split into the portrait/text column and the vertical photograph-plus-caption list.
- Keep the timed crossfade and the independent scrolling of the text and photograph columns.
- Layout values live in `assets/style.css`. Responsive behavior switches at `1180px` and `700px`.
