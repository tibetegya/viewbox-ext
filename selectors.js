// Site selectors and storage keys for isolated-world content scripts (PRD Appendix A).
// Watch-page selectors live in content/player.js: Chrome injects a file once per frame, so this one can't also run in the MAIN world.
var SEL = {
  favTvPrefix: 'bm:t:',                              // localStorage key per TV favorite; value "{addedUnixTs}|"
  tvCard: '.cflip[data-href^="/watch/tv/"]',         // href: /watch/tv/{pid}/{slug}
  cardPoster: 'img.card-img-top',                    // alt = title, src = https://img.xcdn.to/t/p/w342/{tmdbPosterFile}
  cardYear: '.card-badge.top .badge',
  cardBadgeRow: '.card-badge.top',                   // year + TV icon badges; our "N new" badge goes here
  newBadgeClass: 'fc-new',
  showPath: /^\/watch\/tv\/(\d+)/,                   // show page and its episodes
  showPage: (pid) => `/watch/tv/${pid}`,           // works without the slug
  // Auth + sync (PRD F5.4, F5.6)
  loggedIn: 'a[href="/account"]',                    // "My Account" link; httpOnly session cookie isn't readable
  siteNav: 'nav',                                    // present on normal pages; guards against error pages
  signInPath: '/vipsignin',
  logoutLinks: '.nav-item.logout, .dropdown-item.logout',
  loginEndpoint: '/ajax/viplogin',                   // POST JSON {uname, passw}; 401 + message on bad login; {status:"expired"} = VIP expired
  csrfMeta: 'meta[name="csrf-token"]',               // every site POST sends it as X-CSRF-Token (403 without)
  syncInput: '#syncCodeInput',                       // site applies a valid 9-char code by itself ~400 ms after an input event
  syncCodeKey: 'hqs.code',                           // site's localStorage key for this browser's active sync code (survives logout)
  ogTitle: /^Watch all Episodes of (.+) \((\d{4})\)/, // og:title → title, year; og:url → slug; og:image → poster
};
