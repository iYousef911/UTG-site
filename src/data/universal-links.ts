/** HTTPS Universal Links on utg.yadev.tech ↔ custom scheme the iOS app already handles. */
export const APPLE_TEAM_ID = "RGSEF8E3RM";
export const BUNDLE_ID = "com.ya-techno.UTG-SwitUI";
export const APPLE_APP_ID = `${APPLE_TEAM_ID}.${BUNDLE_ID}`;
export const ASSOCIATED_DOMAIN = "applinks:utg.yadev.tech";

export type UniversalRoute = {
  https: string;
  gamedb: string;
  /** AASA path pattern (iOS 12 `paths` / iOS 13+ `components`). */
  aasa: string;
  label: string;
  blurb: string;
};

export const UNIVERSAL_ROUTES: UniversalRoute[] = [
  {
    https: "/game/{id}",
    gamedb: "gamedb://game/{id}",
    aasa: "/game/*",
    label: "Game",
    blurb: "Open an IGDB title in UTG. {id} is the numeric IGDB game id.",
  },
  {
    https: "/discover",
    gamedb: "gamedb://discover",
    aasa: "/discover",
    label: "Discover",
    blurb: "Browse the IGDB catalog.",
  },
  {
    https: "/favorites",
    gamedb: "gamedb://favorites",
    aasa: "/favorites",
    label: "Favorites",
    blurb: "Open the favorites list.",
  },
  {
    https: "/collections",
    gamedb: "gamedb://collections",
    aasa: "/collections",
    label: "Collections",
    blurb: "Open collections (iCloud on device).",
  },
  {
    https: "/news",
    gamedb: "gamedb://news",
    aasa: "/news",
    label: "News",
    blurb: "News list.",
  },
  {
    https: "/news/{id}",
    gamedb: "gamedb://news/{id}",
    aasa: "/news/*",
    label: "News item",
    blurb: "A single news item. {id} is the item id in the app.",
  },
  {
    https: "/events",
    gamedb: "gamedb://events",
    aasa: "/events",
    label: "Events",
    blurb: "Events list.",
  },
  {
    https: "/premium",
    gamedb: "gamedb://premium",
    aasa: "/premium",
    label: "UTG Pro+",
    blurb: "In-app Pro+ screen. Billing is still Apple IAP, not this site.",
  },
  {
    https: "/deals",
    gamedb: "gamedb://deals",
    aasa: "/deals",
    label: "Deals",
    blurb: "Deals list.",
  },
  {
    https: "/deals/{id}",
    gamedb: "gamedb://deals/{id}",
    aasa: "/deals/*",
    label: "Deal",
    blurb: "A single deal. {id} is the deal id in the app.",
  },
];

const AASA_PATHS = [...new Set(UNIVERSAL_ROUTES.map((route) => route.aasa))];

export function aasaDocument() {
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: APPLE_APP_ID,
          paths: AASA_PATHS,
          appIDs: [APPLE_APP_ID],
          components: AASA_PATHS.map((path) => ({
            "/": path,
            comment: UNIVERSAL_ROUTES.find((route) => route.aasa === path)?.label ?? path,
          })),
        },
      ],
    },
  };
}

export function llmsTxt(siteUrl: string): string {
  const rows = UNIVERSAL_ROUTES.map((route) => {
    const left = `${siteUrl}${route.https}`.padEnd(46);
    return `${left} → ${route.gamedb}`;
  }).join("\n");

  return `# UTG – Up To Game Pro

> Marketing and legal site for the iOS 18+ App Store game companion.
> Operator: Yad3V, Saudi Arabia. Support: yad3v.dev@gmail.com
> App Store: https://apps.apple.com/app/utg-up-to-game-pro/id1480143119

UTG does not sell games. Catalog and AI output can be wrong.
This website has no auth, no card forms, and no checkout. UTG Pro+ is Apple In-App Purchase only.

## Universal Links (https → gamedb://)

${rows}

## What the website can do

- Serve apple-app-site-association at https://utg.yadev.tech/.well-known/apple-app-site-association
  (HTTPS 200, application/json, no redirect). Production uses Caddy (see Caddyfile) or Apache (.htaccess).
- Smart App Banner: apple-itunes-app app-id=1480143119 with app-argument = the current page URL.
- Fallback HTML for the paths above if the app is not installed.

## What the website cannot do

Universal Links are incomplete until the iOS app:

1. Adds Associated Domains entitlement: ${ASSOCIATED_DOMAIN}
   (apex only unless www also serves AASA with HTTP 200 and no redirect).
2. Handles NSUserActivityTypeBrowsingWeb (userActivity.webpageURL) and maps
   that HTTPS URL to the matching gamedb:// route.
3. Ships a build that includes that entitlement. Existing gamedb:// handling
   (openURLContexts) is not enough for https:// taps from Messages, Mail, or Safari.

Safari on this same domain typically will not hand off to the app. Use the
“Open in UTG” button (gamedb://) on these fallback pages.

## Marketing pages (not app routes)

- ${siteUrl}/
- ${siteUrl}/features
- ${siteUrl}/pricing
- ${siteUrl}/download
- ${siteUrl}/support
- ${siteUrl}/privacy
- ${siteUrl}/terms
- ${siteUrl}/subscription
- ${siteUrl}/universal-links
`;
}
