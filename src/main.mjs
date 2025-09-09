import fs from "fs";
import path from "path";
import { mdToHtml, renderIndex, renderPost, renderPage, renderRSS, ensureDir } from "./render.mjs";

const layout = fs.readFileSync("src/templates/layout.html","utf8");
const cfg = JSON.parse(fs.readFileSync("src/sources.json","utf8"));
const SKIM_PID = process.env.SKIMLINKS_PID || "";
const BEEHIIV_URL = process.env.BEEHIIV_URL || "";
const ZAP_URL = process.env.ZAPIER_WEBHOOK_URL || "";

async function fetchText(url) {
  const r = await fetch(url, { headers: { "user-agent":"Mozilla/5.0 auto-affiliate-bot" }});
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}

// Very lightweight RSS/Atom parser
function parseFeed(xml) {
  const items = [];
  const isAtom = xml.includes("<feed");
  const reItems = isAtom ? /<entry[\s\S]*?<\/entry>/g : /<item[\s\S]*?<\/item>/g;
  const entries = xml.match(reItems) || [];
  for (const e of entries) {
    const title = (e.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1]
      .replace(/<!\[CDATA\[|\]\]>/g,"").trim();
    const link = isAtom
      ? (e.match(/<link[^>]*href="([^"]+)"/i) || [,""])[1]
      : (e.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [,""])[1].trim();
    const pub = (e.match(/<updated>(.*?)<\/updated>/i) || e.match(/<pubDate>(.*?)<\/pubDate>/i) || [,""])[1];
    items.push({ title, link, pubDate: pub ? new Date(pub) : new Date() });
  }
  return items;
}

function makeSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
}

function stripHtml(s) {
  return s.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();
}

function makeExcerpt(html, n=180) {
  const t = stripHtml(html);
  return t.length > n ? t.slice(0,n) + "…" : t;
}

function postTemplate({title, link}) {
  const md = `**Quick Pick:** [${title}](${link})

- Why it’s notable: Curated from trusted deal/product sources.
- Quick tip: Always compare across 2–3 merchants before checkout.

> If you buy via our links, we may earn a commission (at no cost to you).
`;
  return md;
}

async function build() {
  const dist = path.resolve("dist");
  ensureDir(dist);

  // Ingest feeds
  let pool = [];
  for (const f of cfg.feeds) {
    try {
      const xml = await fetchText(f);
      const items = parseFeed(xml).slice(0, 20);
      pool.push(...items);
    } catch (e) {
      console.error("Feed error:", f, e.message);
    }
  }

  // Sort newest first, dedupe by link
  const seen = new Set();
  pool = pool
    .sort((a,b)=> b.pubDate - a.pubDate)
    .filter(x => {
      if (!x.link || seen.has(x.link)) return false;
      seen.add(x.link);
      return true;
    })
    .slice(0, Math.max(3, cfg.daily_posts || 8));

  // Build posts
  const posts = [];
  for (const it of pool) {
    const md = postTemplate({ title: it.title, link: it.link });
    const html = mdToHtml(md);
    const slug = makeSlug(it.title || "pick");
    const permalink = `/posts/${slug}.html`;
    const excerpt = makeExcerpt(html);
    const post = {
      title: it.title,
      date: it.pubDate || new Date(),
      permalink,
      html,
      excerpt
    };
    posts.push(post);
  }

  // Write posts
  for (const p of posts) {
    renderPost({ layout, site: cfg.site, post: p, skimPid: SKIM_PID, beehiivUrl: BEEHIIV_URL });
  }

  // Static pages
  renderPage({
    layout, site: cfg.site, skimPid: SKIM_PID, beehiivUrl: BEEHIIV_URL,
    title: "About",
    outPath: "dist/about.html",
    body: `<p>${cfg.site.title} auto-curates notable deals and finds from public sources. We may earn a commission via affiliate links.</p>`
  });
  renderPage({
    layout, site: cfg.site, skimPid: SKIM_PID, beehiivUrl: BEEHIIV_URL,
    title: "Disclosures",
    outPath: "dist/disclosures.html",
    body: `<p>We use Skimlinks to auto-monetize outbound product links. Recommendations are informational; verify prices and terms with merchants.</p>`
  });

  // Index + RSS
  renderIndex({ layout, posts, site: cfg.site, skimPid: SKIM_PID, beehiivUrl: BEEHIIV_URL });
  renderRSS({ site: cfg.site, posts });

  // Notify Zapier/Make to push a beehiiv email (optional)
  if (ZAP_URL) {
    const payload = {
      subject: `${cfg.site.brand}: ${posts.length} fresh finds`,
      preheader: "Today’s quick picks.",
      html: fs.readFileSync("dist/index.html","utf8"),
      rss: `${cfg.site.url}/rss.xml`
    };
    try {
      await fetch(ZAP_URL, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
      console.log("Zapier notified.");
    } catch (e) {
      console.error("Zapier notify error:", e.message);
    }
  }
}

build().catch(err => { console.error(err); process.exit(1); });
