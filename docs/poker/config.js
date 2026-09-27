// All asset URLs are relative. Rename or nest the poker folder without a build.
export const siteConfig = {
  title: 'The Practice Table — Texas Hold’em',
  // ../ returns to the containing page, including a GitHub repository prefix.
  // For /games/poker/ linking to the site root, use ../../ instead.
  homeUrl: '../',
  homeLabel: 'Back to main page',
  showHomeLink: true,
  // Empty = isolate browser stats by this folder's URL path.
  // Set a unique stable string before launch to preserve stats if you rename it.
  // Example: 'my-website-poker'. Changing the key starts a separate history.
  storageKey: '',
};
