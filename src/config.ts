export const SITE = {
  name: "UTG – Up To Game Pro",
  short: "UTG",
  tagline: "Never miss a launch or a sale.",
  sub: "Pick games you care about, get dates and alerts in one list.",
  url: "https://utg.yadev.tech",
  email: "yad3v.dev@gmail.com",
  legalName: "Yad3V",
  country: "Saudi Arabia",
  appStore: "https://apps.apple.com/app/utg-up-to-game-pro/id1480143119",
  appId: "1480143119",
  umamiSrc: "https://umami.yadev.tech/script.js",
  umamiId: "3b7d6b0b-5875-4dd4-8713-8d16aa405279",
  year: 2026,
} as const;

export const PRICES = [
  { length: "Weekly", id: "utgutgp_0199_1w", usd: "$1.99", sar: "SAR 7.99" },
  { length: "Monthly", id: "utgutgp_0099_1m", usd: "$0.99", sar: "SAR 3.99" },
  { length: "Annual", id: "utgutgp_0999_1y", usd: "$9.99", sar: "SAR 39.99" },
] as const;

export const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;
