# Small Table on GitHub Pages

The `small-table` directory is a self-contained subpage. Its links, manifest,
service worker, and icons use relative paths, so it can be hosted beneath a
repository path, custom domain, or another folder without editing a base URL.

## Add it to an existing Pages site

Copy the complete `small-table` directory into the folder GitHub Pages already
publishes:

```text
YOUR-PAGES-SOURCE/
├── index.html                 ← your existing main page
└── small-table/
    ├── index.html
    ├── custom.css
    ├── manifest.webmanifest
    ├── sw.js
    └── icons/
```

If Pages publishes from `/docs`, use `docs/small-table/`. If it publishes from
the repository root, use `small-table/` at the repository root.

Link to the game from the main page with a relative URL:

```html
<a href="./small-table/">Play Small Table</a>
```

After pushing, the game will normally be available at a URL resembling:

```text
https://USERNAME.github.io/REPOSITORY/small-table/
```

No build command or dependency installation is required.

## Enable GitHub Pages if necessary

In the repository, open **Settings → Pages**. Choose **Deploy from a branch**,
then select the branch and either the repository root or `/docs`, matching where
your existing site lives. If the main site already works through GitHub Pages,
do not change its publishing source; add the folder to that source instead.

## Mobile and style customization

The shipped interface is responsive, including compact phone layouts and safe
area padding. Edit `small-table/custom.css` to override the built-in theme or
layout. Useful variables are documented at the top of that file. The custom
stylesheet loads after the built-in CSS, so it can override presentation without
changing the game JavaScript.

The primary mobile breakpoint is `759px`. Add further rules inside:

```css
@media (max-width: 759px) {
  /* phone-specific overrides */
}
```

## Home Screen and offline use

Open the deployed URL in Safari on iPhone or iPad, choose **Share → Add to Home
Screen**, and launch it once online. The service worker then caches the game for
offline use.

When publishing an update, change the cache name at the top of `small-table/sw.js`
so returning installations fetch the new files.
