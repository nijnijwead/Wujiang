# Wujiang: The Places We Hold Dear

A minimal two-screen portrait site built from `sample.pdf` as the visual reference.

Open `index.html` directly, or serve the folder with:

```sh
python3 -m http.server 8000
```

## Structure

- **Home:** eight vertical 3:4 portrait slots in one horizontally scrollable rail.
- **Ripple focus:** the portrait nearest the center scales to 1.2× and stays sharp; cards toward the edges fall to 0.9× with a soft blur and fade. The depth values are interpolated with `requestAnimationFrame` instead of CSS transitions for smoother dragging.
- **Infinite loop:** the eight portraits repeat seamlessly in both directions, so scrolling forward from `08` continues to `01` and scrolling back from `01` continues to `08`. The loop is built from cloned edge cards in `assets/main.js`; the eight files in `assets/portraits/` remain the only source.
- **Portrait page:** clicking a portrait enlarges it into a split view with the portrait on the left and a vertical photograph list on the right. On mobile, the portrait/story sits above the photograph list.
- **Names:** each portrait carries a pure-white name overlay in the lower-left corner. English mode shows only the English name; Chinese mode shows only the Chinese name. Names without a translation use the same label in both modes.
- **About:** a centered, scrollable editorial column with the headline "What Makes Us Happy?", long-form project text, and the same topbar as the portrait pages.
- **Timed crossfade:** three seconds after the portrait page opens, the portrait crossfades over 2.2 seconds into an independently scrollable text column for interviews and field notes. Once settled, clicking or pressing `Enter` on the text returns to the portrait, and the portrait returns to the text. The opacity crossfade remains active under `prefers-reduced-motion`; spatial motion such as the portrait zoom is disabled.
- **Photo list:** each photograph sits beside a reserved caption column. The photograph list scrolls vertically and independently from the portrait text.
- **Navigation:** drag, trackpad, arrow buttons, or keyboard arrows move the portrait rail. `Escape` closes the portrait page.
- **Language:** the `EN / 中` control switches interface labels (About, Index, Portrait) between English and Simplified Chinese, updates accessible labels, and remembers the choice in `localStorage`.

Portrait stories and the long-form About copy are live. Photograph captions come from the matching `NNcaptions.txt` file; photos without a caption show only their number and leave the text area blank.

## Photographs

- The eight homepage portraits are read only from `assets/portraits/01.jpg` through `08.jpg`.
- That folder is the single source for the intro photographs; no generated or PDF-extracted images are used.
- The portrait photograph list reads from `assets/wall/01/` through `assets/wall/08/`, matching each portrait number. Folders `05` and `06` currently show a clean empty state until photographs are added.

## Portrait names

- `01` — JA
- `02` — CC
- `03` — 鸡翅弟弟 (Chicken-Wing Bro)
- `04` — 贝利亚哥哥 (Big Brother Belial)
- `05` — 胖哥 (Pangge)
- `06` — ？
- `07` — 大志 (Dazhi)
- `08` — 杂记 (Miscellaneous)

The bilingual names live in `index.html`; their per-portrait colors and overlay styling live in `assets/style.css`.

## Typography

The site uses DengXian Light when it is installed locally, then falls back to the
platform's native Chinese UI font. The Microsoft font file is intentionally
excluded from Git and Vercel because its web-embedding rights have not been
confirmed. No font file is downloaded by visitors.

## Photo manifest

Browsers cannot list a local folder, so `assets/wall/manifest.js` records the portrait photograph lists. After adding, removing, or renaming photographs in any `assets/wall/01`–`08` folder, regenerate it:

```sh
python3 tools/build-wall-manifest.py
```

The generated manifest is loaded by `index.html` before `assets/main.js`. The eight homepage portraits are not reused in the photograph lists.

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

After editing any caption file in `assets/wall/NN/`, named either `NNcaptions.txt` or `NN.txt`, regenerate the browser-readable manifest:

```sh
python3 tools/build-wall-captions.py
```

The generated `assets/wall/captions.js` is loaded before `assets/main.js`. Missing caption sections stay blank.

## Portrait text

The story column reads from `assets/portraits/01.txt` through `08.txt`. Blank files show a localized "Text forthcoming" state. After editing any text file, regenerate the browser-readable manifest:

```sh
python3 tools/build-portrait-text.py
```

The generated `assets/portraits/stories.js` is loaded by `index.html` before `assets/main.js`. Blank lines create new paragraphs; single line breaks are preserved.

Replace a portrait by overwriting the matching file in `assets/portraits/`. Keep the same `01.jpg`–`08.jpg` filenames and a 3:4 crop.

The portrait URLs in `index.html` end in `?v=2` so browsers do not keep serving older photos after a replacement. If a newly replaced portrait still shows the previous image, increment that value (for example to `?v=3`).

## Visual rules

- Keep the home page image-first: no captions, dates, or metadata on the portraits.
- Keep the open portrait page split into the portrait/text column and the vertical photograph-plus-caption list.
- Keep the timed crossfade and the independent scrolling of the text and photograph columns.
- Layout values live in `assets/style.css`. Responsive behavior switches at `1180px` and `700px`.
