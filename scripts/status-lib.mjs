const UA = "UTG-status/1.0 (+https://utg.yadev.tech/status)";
const TIMEOUT_MS = 8000;
const CACHE_MS = 45_000;

/** @type {{ at: number, payload: object } | null} */
let cache = null;

export const STATUS_ITEMS = [
  {
    id: "appstore",
    name: "Apple App Store & In-App Purchase",
    blurb: "Download, restore, and UTG Pro+ billing.",
    href: "https://www.apple.com/support/systemstatus/",
  },
  {
    id: "apns",
    name: "Apple Push Notification service",
    blurb: "Release and related alerts.",
    href: "https://developer.apple.com/system-status/",
  },
  {
    id: "icloud",
    name: "Apple iCloud",
    blurb: "Collections sync.",
    href: "https://www.apple.com/support/systemstatus/",
  },
  {
    id: "auth",
    name: "Sign in with Apple / Google / Firebase",
    blurb: "Optional accounts.",
    href: "https://status.firebase.google.com/",
  },
  {
    id: "igdb",
    name: "IGDB",
    blurb: "Game catalog and metadata.",
    href: "https://www.igdb.com/",
  },
  {
    id: "prices",
    name: "CheapShark / storefront data",
    blurb: "Price tracking.",
    href: "https://www.cheapshark.com/",
  },
  {
    id: "revenuecat",
    name: "RevenueCat",
    blurb: "Subscription entitlement status for Pro+.",
    href: "https://status.revenuecat.com/",
  },
  {
    id: "ai",
    name: "AI inference (OpenAI)",
    blurb: "Recommendations, chat, Buy/Wait.",
    href: "https://status.openai.com/",
  },
  {
    id: "local",
    name: "Weather & maps",
    blurb: "Local play features when location is allowed.",
    href: "https://developer.apple.com/system-status/",
  },
  {
    id: "website",
    name: "This website",
    blurb: "Marketing and legal pages — not the app binary.",
    href: "https://utg.yadev.tech/status",
  },
];

function timeoutSignal() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

async function fetchText(url) {
  const { signal, done } = timeoutSignal();
  try {
    const res = await fetch(url, { signal, headers: { "user-agent": UA, accept: "application/json,text/plain,*/*" } });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    done();
  }
}

function parseJsonp(text) {
  const match = text.match(/^[^{\[]*\((.*)\)\s*;?\s*$/s);
  return JSON.parse(match ? match[1] : text);
}

function appleActiveEvents(service) {
  return (service?.events ?? []).filter((event) => {
    const status = String(event.eventStatus || "").toLowerCase();
    if (status === "resolved" || status === "completed") return false;
    if (event.endDate || event.epochEndDate) return false;
    return true;
  });
}

function appleLookup(bundle, names) {
  const services = bundle?.services ?? [];
  const matched = names
    .map((name) => services.find((service) => service.serviceName === name))
    .filter(Boolean);
  const active = matched.flatMap(appleActiveEvents);
  if (!matched.length) return { state: "unknown", detail: "Apple did not list this service in the public feed." };
  if (!active.length) return { state: "operational", detail: "No active incident on Apple’s status page." };
  const worst = active.some((event) => /outage/i.test(event.statusType || "")) ? "outage" : "degraded";
  const first = active[0];
  return {
    state: worst,
    detail: first.message || `${first.statusType} reported by Apple.`,
  };
}

function statuspageState(json) {
  const indicator = json?.status?.indicator;
  const description = json?.status?.description || "";
  if (indicator === "none") return { state: "operational", detail: description || "All systems operational." };
  if (indicator === "minor") return { state: "degraded", detail: description };
  if (indicator === "major" || indicator === "critical") return { state: "outage", detail: description };
  return { state: "unknown", detail: description || "Could not read this status page." };
}

function rank(state) {
  return { outage: 3, degraded: 2, unknown: 1, operational: 0 }[state] ?? 1;
}

function worse(a, b) {
  return rank(a.state) >= rank(b.state) ? a : b;
}

async function appleFeeds() {
  const [pub, dev] = await Promise.all([
    fetchText("https://www.apple.com/support/systemstatus/data/system_status_en_US.js"),
    fetchText("https://www.apple.com/support/systemstatus/data/developer/system_status_en_US.js"),
  ]);
  return {
    pub: pub.ok ? JSON.parse(pub.text) : null,
    dev: dev.ok ? parseJsonp(dev.text) : null,
  };
}

async function collectUncached() {
  const items = [];
  const fail = (id, detail) => {
    const meta = STATUS_ITEMS.find((item) => item.id === id);
    items.push({ ...meta, state: "unknown", detail });
  };

  let apple = { pub: null, dev: null };
  try {
    apple = await appleFeeds();
  } catch {
    apple = { pub: null, dev: null };
  }

  const appleOrUnknown = (id, names, bundle) => {
    const meta = STATUS_ITEMS.find((item) => item.id === id);
    if (!bundle) {
      items.push({ ...meta, state: "unknown", detail: "Could not reach Apple’s status feed." });
      return;
    }
    items.push({ ...meta, ...appleLookup(bundle, names) });
  };

  appleOrUnknown("appstore", ["App Store"], apple.pub);
  if (apple.dev) {
    const iap = appleLookup(apple.dev, ["App Store - In-App Purchases"]);
    const last = items.at(-1);
    items[items.length - 1] = { ...last, ...worse(last, iap) };
  }

  appleOrUnknown("apns", ["APNS"], apple.dev);
  appleOrUnknown(
    "icloud",
    ["iCloud Account & Sign In", "iCloud Drive", "iCloud Backup", "iCloud Keychain"],
    apple.pub,
  );

  try {
    const authApple = apple.pub ? appleLookup(apple.pub, ["Apple Account"]) : { state: "unknown", detail: "Apple Account feed missing." };
    const fb = await fetchText("https://status.firebase.google.com/incidents.json");
    let authFb = { state: "unknown", detail: "Could not read Firebase status." };
    if (fb.status) {
      const incidents = JSON.parse(fb.text);
      const openAuth = (Array.isArray(incidents) ? incidents : []).filter((incident) => {
        if (incident.end) return false;
        const hay = `${incident.service_name || ""} ${(incident.affected_products || []).map((p) => p.title).join(" ")}`.toLowerCase();
        return hay.includes("authentication") || hay.includes("identity platform");
      });
      authFb = openAuth.length
        ? { state: "degraded", detail: openAuth[0].external_desc || "Firebase Authentication incident." }
        : { state: "operational", detail: "No open Firebase Authentication incident." };
    }
    const meta = STATUS_ITEMS.find((item) => item.id === "auth");
    items.push({ ...meta, ...worse(authApple, authFb) });
  } catch {
    fail("auth", "Could not reach Apple Account or Firebase status.");
  }

  try {
    const igdb = await fetchText("https://api.igdb.com/v4/games");
    const up = igdb.status === 401 || igdb.status === 403 || igdb.status === 200;
    items.push({
      ...STATUS_ITEMS.find((item) => item.id === "igdb"),
      state: up ? "operational" : igdb.status >= 500 ? "outage" : "unknown",
      detail: up
        ? "IGDB API is reachable (catalog calls still need a key in the app)."
        : `IGDB API returned HTTP ${igdb.status}.`,
    });
  } catch {
    fail("igdb", "Could not reach the IGDB API host.");
  }

  try {
    const shark = await fetchText("https://www.cheapshark.com/");
    items.push({
      ...STATUS_ITEMS.find((item) => item.id === "prices"),
      state: shark.ok ? "operational" : shark.status >= 500 ? "outage" : "unknown",
      detail: shark.ok ? "CheapShark website is reachable." : `CheapShark returned HTTP ${shark.status}.`,
    });
  } catch {
    fail("prices", "Could not reach CheapShark.");
  }

  try {
    const rc = await fetchText("https://status.revenuecat.com/api/v2/status.json");
    const meta = STATUS_ITEMS.find((item) => item.id === "revenuecat");
    items.push(rc.ok ? { ...meta, ...statuspageState(JSON.parse(rc.text)) } : { ...meta, state: "unknown", detail: `RevenueCat status HTTP ${rc.status}.` });
  } catch {
    fail("revenuecat", "Could not reach RevenueCat status.");
  }

  try {
    const ai = await fetchText("https://status.openai.com/api/v2/status.json");
    const meta = STATUS_ITEMS.find((item) => item.id === "ai");
    items.push(ai.ok ? { ...meta, ...statuspageState(JSON.parse(ai.text)) } : { ...meta, state: "unknown", detail: `OpenAI status HTTP ${ai.status}.` });
  } catch {
    fail("ai", "Could not reach OpenAI status.");
  }

  if (apple.dev) {
    const weather = appleLookup(apple.dev, ["WeatherKit"]);
    const maps = appleLookup(apple.dev, ["Apple Maps API", "MapKit JS Dashboard"]);
    const meta = STATUS_ITEMS.find((item) => item.id === "local");
    items.push({ ...meta, ...worse(weather, maps) });
  } else {
    fail("local", "Could not reach Apple developer status for WeatherKit / Maps.");
  }

  items.push({
    ...STATUS_ITEMS.find((item) => item.id === "website"),
    state: "operational",
    detail: "This live checker responded.",
  });

  const overall = items.reduce((acc, item) => (rank(item.state) > rank(acc) ? item.state : acc), "operational");
  return { checkedAt: new Date().toISOString(), overall, items };
}

export async function collectStatus() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.payload;
  const payload = await collectUncached();
  cache = { at: Date.now(), payload };
  return payload;
}
