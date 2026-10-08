# Investigative Web Builder

A React app for building tabletop RPG "investigative webs": columns of clue cards, links between them, and an optional finale box.

## Run it locally

Requires Node 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build for hosting

```bash
npm run build      # outputs static files to dist/
npm run preview    # check the production build locally
```

`dist/` is plain static files. Host it anywhere that serves static sites: Netlify, Vercel, Cloudflare Pages, GitHub Pages or an S3 bucket. There's no server or database.

For GitHub Pages under a sub-path (for example `username.github.io/inv-web/`), set `base: "/inv-web/"` in `vite.config.js` before building.

## Install on an iPad

Open the hosted site in Safari, tap Share, then **Add to Home Screen**. It opens full screen like an app (the manifest and icon are in `public/`).

## Project layout

| Path | What it holds |
| --- | --- |
| `src/lib/model.js` | Web data shape, sample web, migration (`normalize`), cleanup (`prune`), localStorage loading |
| `src/lib/geometry.js` | Turns measured card positions into wire paths: vertical links, side links, finale lines, routed links and gutter lanes |
| `src/components/Board.jsx` | The board: cards, SVG wires, edit controls, link-picking mode, link editor popover |
| `src/components/Wire.jsx` | One SVG wire with optional arrowheads |
| `src/components/AutoText.jsx` | Auto-growing textarea |
| `src/components/SharePanel.jsx` | Export (copy or download JSON) and import |
| `src/App.jsx` | Toolbar, web library, undo history, saving |
| `src/styles.css` | All styles; color and font tokens are at the top |
| `standalone/investigative-web.html` | The same app as a single file with no build step. Open it in a browser or drop it on any static host |

## Data

Webs save to the browser's localStorage under the key `investigative-web.v1`. They stay on that device and browser. Export/Import moves them between devices, and exported JSON from the Claude artifact version imports here unchanged.

A web looks like this:

```json
{
  "name": "The Missing Clerk",
  "rows": 5, "cols": 3, "showFinale": true,
  "cards":  { "0,0": { "title": "Unpaid Debts", "body": "…" } },
  "vOff":   { "1,0": true },
  "h":      { "2,0": "left" },
  "finOff": { "1": true },
  "links":  [{ "id": "a1b2", "from": "3,1", "to": "4,2", "route": "drop", "arrow": "end" }],
  "finale": { "title": "…", "body": "…" }
}
```

- Card keys are `"row,column"`, starting at 0.
- `vOff` lists stacked clues whose connecting line is cut, keyed by the upper card.
- `h` holds side links between a card and the one to its right: `line`, `right`, `left` or `both`.
- `finOff` lists columns whose last clue doesn't connect to the finale.
- `links` are free links. `to` is a card key or `"finale"`. `route` is `drop`, `step`, `jumpL` or `jumpR`. `arrow` is `none`, `end`, `start` or `both`.

## Ideas for next steps

- Sync webs across devices with a backend (Supabase, Firebase or a small API) in place of localStorage.
- Export the board as a PNG with a library such as `html-to-image`.
- Drag and drop to rearrange cards.
