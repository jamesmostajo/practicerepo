# Host Basis as a subpage of your existing site

This package includes **upload-ready static files** in `pages-site/quant-practice/`.
No Node server, login, API key, or cloud database is needed on the hosted site.

## Fastest route: use the already-built folder

1. Locate the **published output** of your current GitHub Pages site. If it publishes from the repository root, use that root. If it publishes from `/docs`, use `docs/`. If an Actions workflow builds the parent site, use that workflow's final output directory.
2. Copy the entire `pages-site/quant-practice/` folder into that location, beside the existing homepage. Keep its `index.html`, `assets/`, `favicon.svg`, and `host-theme.css` together. Do not replace the parent homepage or its deployment workflow.
3. Link to it from your parent page, for example `<a href="./quant-practice/">Quant practice</a>` when the link is on the parent homepage.
4. Publish using the parent site's existing process.

Example URLs:

- User site: `https://YOUR-USER.github.io/quant-practice/`
- Repository site: `https://YOUR-USER.github.io/YOUR-REPO/quant-practice/`
- Custom domain: `https://example.com/quant-practice/`

Use the trailing slash. Internal routes use hashes, such as `quant-practice/#/guide/basics/start`, so refreshing a game/guide works without rewrite rules or a custom 404 page. All assets are relative to the app directory, including on nested repository sites. You can rename the prebuilt app folder; the default Main site link goes one directory up.

GitHub Pages supports a branch publishing source at the root or `/docs`, or an Actions build. It does not let you select an arbitrary nested folder as the branch publishing source: keep your existing publishing source and add this app inside it. For a plain static output (no Jekyll), `pages-site/.nojekyll` can be placed in the publishing root. If your existing parent uses Jekyll, keep that site's setup; do not add `.nojekyll` merely for this subpage.

Official setup reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Rebuild with a different path or parent link

Edit `site.config.json`:

```json
{
  "subdirectory": "tools/quant-practice",
  "parentSiteUrl": "../../"
}
```

`subdirectory` is relative to your site's published root, not an absolute URL. Use ordinary path segments containing letters, numbers, hyphens, or underscores. `parentSiteUrl` can be a relative path or HTTPS URL; set it to `""` to hide the Main site link. The normal local app does not show this link.

Run from the source project folder:

```sh
npm ci
npm run build:pages
```

This creates `dist-static/` (standalone app contents) and `pages-site/<subdirectory>/` (ready to merge into the parent site's output). Each build recreates **this project's pages-site directory**, so don't put your parent website's source or output there. The parent site is not automatically deployed or overwritten.

For an existing Actions workflow, build your parent site, build this app, then copy the app folder into the parent's output **before its existing upload/deploy step**. Example shell step when this app's source is at `apps/quant-practice` and the parent output is `_site`:

```sh
npm ci --prefix apps/quant-practice
npm run build:pages --prefix apps/quant-practice
mkdir -p _site/quant-practice
cp -R apps/quant-practice/pages-site/quant-practice/. _site/quant-practice/
```

Adapt both source/output paths and the configured subdirectory. Use your site's existing single Pages deployment artifact, containing both parent and app; a second deployment containing only this app would replace the live parent output.

## Preview

```sh
npm run build:pages
npm run preview:pages
```

Open the URL printed by Vite. To check the actual nested path, serve `pages-site` using any static server, for example `python3 -m http.server 4174 --directory pages-site`, then open `http://localhost:4174/quant-practice/`. Do not double-click the HTML as a `file://` URL.

## Progress and backups

The Pages build uses IndexedDB in the visitor's browser. Each installation path has a separate store. Sessions/presets survive reloads in the same browser, but are **not synchronized** across computers, phones, browsers or localhost. Each visitor has their own progress, without an account.

To migrate: Export JSON from the local app, open the hosted app, and Import JSON in History or Overview. Imports merge and deduplicate. Export regularly; clearing site data, private browsing, or browser storage restrictions can remove/prevent saved progress. Changing the app path or domain also gives it a different storage location; export before moving it. Nothing writes progress into the GitHub repository. Do not upload your `data/` folder.

The original `npm run dev` and `npm run build` / `npm start` workflows still use the local Node server and JSON file.

## Styling and mobile

Edit the uploaded app's `host-theme.css` (or `public/host-theme.css` before rebuilding). It loads after the game styles. Override existing CSS variables for colors, text, borders, accent, content width and page gutters. Use `:root[data-theme=light]` for light-mode overrides. Keeping this as a separate file avoids editing hashed bundles.

The app is a full page under your site's path; it doesn't inherit your parent page's CSS. Match its palette using this stylesheet. Mobile layouts include wrapping navigation, stacked guides/forms, touch-sized buttons, larger form text, and horizontally scrollable data tables. Keyboard shortcuts remain available; buttons and form submission provide touch alternatives. Check on your target devices, especially game input with the on-screen keyboard open.
