# The Practice Table — GitHub Pages edition

A complete static Texas Hold’em training app, prepared as a subpage of an existing website. No build, dependencies, server-side code, or API keys are required. This package includes the current gameplay, coaching, and saved-session stats, plus a mobile table layout and configurable parent-page navigation.

## Add it to your existing website

1. Unzip this package.
2. Copy the entire **`poker` folder** into the folder your website publishes. Keep all eight files inside it together.
3. Commit/upload the folder to the repository and let your existing Pages deployment run.
4. Add this link to your main page, assuming the main page is beside the `poker` folder:

   ```html
   <a href="./poker/">Poker practice</a>
   ```

5. Open the deployed `/poker/` subpage, then click **Deal first hand**.

Upload the extracted folder, not the ZIP. Do not replace your existing homepage, Pages workflow, or site configuration with this package. Only the `poker` directory is needed online; the README, package.json, and tests are optional local development files.

### Where the folder belongs

| How the main website is published | Put the game here | Example final address |
| --- | --- | --- |
| Repository root on a user site | `poker/index.html` | `https://USERNAME.github.io/poker/` |
| Repository root on a project site | `poker/index.html` | `https://USERNAME.github.io/REPOSITORY/poker/` |
| Repository's `docs` publishing folder | `docs/poker/index.html` | `https://USERNAME.github.io/REPOSITORY/poker/` |
| Framework build with a copied public directory | Usually `public/poker/index.html` | Your site's base URL plus `poker/` |
| Static export produced by an existing workflow | Copy `poker/` into that workflow's final published output | Your site's base URL plus `poker/` |

For framework sites, verify that the build copies these files unchanged and that an SPA fallback does not intercept `/poker/`. Do not point Pages at only the poker folder: publish the parent website and the game together.

### If GitHub Pages is not configured yet

For a plain HTML repository: open **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then select your publishing branch and either **`/(root)`** or **`/docs`**, matching where your main website lives. Save. Existing Actions-based sites should keep their current workflow; include `poker/` in its published output instead.

This package deliberately includes no `.nojekyll`, `CNAME`, root homepage, or GitHub workflow, so it does not change how your parent website is built or which domain it uses.

## Rename or nest the subpage

All scripts, stylesheets, and module imports use relative URLs. You can rename `poker` to `practice` or move it to `games/poker` without a rebuild. Do not add an HTML `<base>` tag and do not change asset paths to `/style.css` or `/app.js`, which would lose a project-site prefix.

Examples:

- Parent page at `/REPOSITORY/`, game at `/REPOSITORY/poker/`: defaults work.
- Parent page at `/REPOSITORY/games/`, game at `/REPOSITORY/games/poker/`: defaults work.
- Parent page at `/REPOSITORY/`, game at `/REPOSITORY/games/poker/`: set `homeUrl: '../../'`.
- Parent page at `/REPOSITORY/tools.html`, game at `/REPOSITORY/poker/`: set `homeUrl: '../tools.html'`.

Use a trailing slash in links to the game, for example `./poker/`.

## Configure the page

Edit **`poker/config.js`**:

```js
export const siteConfig = {
  title: 'My Poker Practice',
  homeUrl: '../',
  homeLabel: 'Back to my website',
  showHomeLink: true,
  storageKey: 'my-website-poker',
};
```

`homeUrl` is relative to the game's folder. `showHomeLink: false` hides that link. `title` sets the browser-tab title; the visible brand can be changed directly in `index.html`.

If `storageKey` is empty, session stats are separated by the game's URL path. Set a unique, stable key before launch if you want to rename the folder later without changing the stats namespace on that same origin. Stats cannot automatically transfer across domains, browsers, devices, or the old Mac/ChatGPT copies.

## Mobile layout and styling

Edit **`poker/theme.css`** for colors, fonts, panel corners, page width, sidebar width, and page gutters. Its variables override the original appearance without changing game logic. It is designed as a light theme; when changing colors, check text contrast, suit colors, and disabled states together.

Edit **`poker/responsive.css`** for responsive rules:

| Viewport | Layout |
| --- | --- |
| Above 1000px | Table and coaching panel side by side |
| 641–1000px | Table followed by coaching/review/stats |
| 640px and below | Three-column flowing seat layout; community cards in the middle; larger touch controls |

The small-screen layout uses normal grid rows instead of absolutely positioned seats, allowing player labels and chip amounts to wrap without colliding. It targets phones from 320px wide upward. Form text is 16px on phones, common controls are at least 44px high, and reduced-motion preferences are honored. Coach panels and dialogs scroll with their content.

To customize a breakpoint, edit its `@media` rule in `responsive.css`. Keep the stylesheet order in `index.html`: `style.css`, then `theme.css`, then `responsive.css`.

The parent page links to this as a separate page. Parent stylesheets do not automatically theme it. Importing the game's HTML into an existing document is not supported because both pages may have conflicting element IDs and styles. An iframe is possible, but give it adequate width and height; a normal link is simpler on phones.

## Local preview and checks

For local preview, serve the package directory over HTTP. If Python 3 is installed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/poker/`. Press Control-C in the terminal to stop. Directly opening this edition's `index.html` with a `file://` URL may block its ES modules; use HTTP or the separately provided single-file Mac edition.

If Node.js is installed, no `npm install` is needed:

```sh
npm test
```

This checks learning calculations, UI state flows and browser-storage behavior with a mock DOM, and relative asset/module links under both `/poker/` and a nested project path. `node tests/test.mjs` runs the longer existing poker-engine simulation checks.

Native mobile/browser visual QA and an actual GitHub deployment were not available during packaging. After publishing, check a phone-width view, deal a hand, use the raise-size controls, change coaching depth, inspect Stats, refresh, and verify that the completed session can be selected. Also test the back-to-main-page link.

## Saved data and limits

The game runs in the visitor's browser. Completed-hand stats stay in that browser's local storage, up to 20 sessions. Refreshing starts a new table while prior stats remain available when storage is permitted. No multiplayer, accounts, cross-device sync, or real-money play is included. Hosting on GitHub does not bring the original site's owner-only access system with it.

Coaching remains approximate and GTO-inspired. Equity ranges and decision labels are learning aids, not verified solver judgments.

## Official GitHub references

- Publishing source: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Creating a site and subpages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
