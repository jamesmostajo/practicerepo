# Practice Hub — consolidated GitHub Pages package

Three apps, one homepage, one deployment. No install or build is needed to publish the included website.

## Deploy

1. Extract this ZIP. Upload the **contents** of `consolidated-practice-hub` into your GitHub repository, so `docs/index.html` is at the repository's `docs/index.html`, not inside an extra enclosing folder.
2. Commit to your publishing branch (usually `main`).
3. In Settings → Pages, choose **Deploy from a branch**, select that branch and **/docs**, then Save.
4. Open the URL GitHub provides once deployment completes.

The homepage will be at `https://USERNAME.github.io/REPOSITORY/`.
The apps will be at `poker/`, `small-table/`, and `numerical-practice/` beneath it.
All navigation uses relative paths, so no username or repository name needs editing.

If you already have a Pages site, copy the contents of `docs/` into its publishing directory instead. The included homepage replaces its existing homepage; keep or merge your existing homepage if preferred. An existing Actions deployment must include all three app folders in its single output artifact.

## Package layout

- `docs/`: complete deployment-ready website, including the shared homepage and `.nojekyll`.
- `sources/practice-table/`: original Poker project, documentation and tests.
- `sources/numerical-practice/`: original numerical source, server, tests and prebuilt output.
- `sources/small-table/`: original Small Table package and instructions.

The source folders preserve the originals. Published integration changes are in `docs/`.

## How the different packages were parsed

| Uploaded ZIP | Published files taken from | Destination |
|---|---|---|
| Practice-Table-GitHub-Pages(1).zip | Practice-Table-GitHub-Pages/poker/ | docs/poker/ |
| Small-Table-GitHub-Pages(1).zip | small-table/ | docs/small-table/ |
| numerical-practice-pages.zip | numerical-practice/pages-site/numerical-practice/ | docs/numerical-practice/ |

numerical's root index.html is a development entry point, not the deployable app. Its prebuilt `pages-site` output uses browser storage and does not require its Node server. The existing prebuilt output is used as supplied; it was not rebuilt from source. Both shipped JavaScript bundles are preserved, but index.html loads only the bundle it originally referenced.

## Integration changes

- Added a responsive shared homepage.
- Preserved each app's original URL folder, interface and game logic.
- Poker and Basis already have parent-site links. Added a Practice Hub link to Small Table's footer.
- Scoped Small Table's offline cache to its own URL and restricted cleanup to its own cache prefix, protecting other apps on the same domain. Unrelated and old legacy caches are left alone. Future offline updates should increment its cache version in `docs/small-table/sw.js`.

## Local preview

From this package directory, run:

```sh
python3 -m http.server 8000 --directory docs
```

Open http://localhost:8000/ (do not double-click the HTML files).

## Progress and future edits

Browser data is local to each visitor's browser/device; no shared login or cross-device sync is included. Changing the deployment domain or path can separate stored progress. Export Basis progress before moving, then import it on the new site. No existing browser progress is included in these ZIPs.

For numerical changes, edit `sources/numerical-practice/`, run `npm ci` and `npm run build:pages`, then copy its `pages-site/numerical-practice/` into `docs/numerical-practice/`. Keep the other apps and homepage. For Poker and Small Table, edit the static published files directly, or copy source changes into the corresponding docs folder; retain the Small Table integration changes described above.

This package prepares deployment; no GitHub repository has been changed or published.

## Validation performed

All 21 local HTML, CSS and Poker module references checked successfully. The supplied Poker learning, UI-state and path checks passed. Small Table service worker syntax and targeted cache-isolation checks passed. Visual/browser smoke testing was unavailable because this environment has no installed browser executable; complete game flows and offline behavior should be checked after deployment.
