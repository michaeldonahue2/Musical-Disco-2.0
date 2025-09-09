import fs from "fs";
import path from "path";
import { marked } from "marked";

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function html(layout, map) {
  let out = layout;
  for (const [k, v] of Object.entries(map)) {
    out = out.replaceAll(`{{${k}}}`, v ?? "");
  }
  return out;
}

export function writeFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

export function renderIndex({ layout, posts, site, skimPid, beehiivUrl }) {
  const items = posts
    .slice(0, 40)
    .map(p => html(fs.readFileSync("src/templates/post.html","utf8"), {
      TITLE: p.title,
      PERMALINK: p.permalink,
      DATE: p.date.toISOString().split("T")[0],
      BODY: p.html
    }))
    .join("\n");

  const out = html(layout, {
    PAGE_TITLE: `${site.title} — ${site.tagline}`,
    PAGE_DESC: site.tagline,
    SITE_TITLE: site.title,
    SITE_TAGLINE: site.tagline,
    SITE_BRAND: site.brand,
    YEAR: String(new Date().getFullYear()),
    CONTENT: items,
    SKIMLINKS_PID: skimPid || "",
    BEEHIIV_URL: beehiivUrl || "#"
  });
  writeFile("dist/index.html", out);
}

export function renderPage({ layout, site, title, body, outPath, skimPid, beehiivUrl }) {
  const page = html(layout, {
    PAGE_TITLE: `${title} — ${site.title}`,
    PAGE_DESC: title,
    SITE_TITLE: site.title,
    SITE_TAGLINE: site.tagline,
    SITE_BRAND: site.brand,
    YEAR: String(new Date().getFullYear()),
    CONTENT: `<article><h2>${title}</h2><div class="post-body">${body}</div></article>`,
    SKIMLINKS_PID: skimPid || "",
    BEEHIIV_URL: beehiivUrl || "#"
  });
  writeFile(outPath, page);
}

export function renderPost({ layout, site, post, skimPid, beehiivUrl }) {
  const body = html(fs.readFileSync("src/templates/post.html","utf8"), {
    TITLE: post.title,
    PERMALINK: post.permalink,
    DATE: post.date.toISOString().split("T")[0],
    BODY: post.html
  });
  const out = html(layout, {
    PAGE_TITLE: `${post.title} — ${site.title}`,
    PAGE_DESC: post.title,
    SITE_TITLE: site.title,
    SITE_TAGLINE: site.tagline,
    SITE_BRAND: site.brand,
    YEAR: String(new Date().getFullYear()),
    CONTENT: body,
    SKIMLINKS_PID: skimPid || "",
    BEEHIIV_URL: beehiivUrl || "#"
  });
  writeFile(`dist${post.permalink}`, out);
}

export function renderRSS({ site, posts }) {
  const items = posts.slice(0, 30).map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${site.url}${p.permalink}</link>
      <guid>${site.url}${p.permalink}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
    </item>
  `).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title><![CDATA[${site.title}]]></title>
      <link>${site.url}</link>
      <description><![CDATA[${site.tagline}]]></description>
      ${items}
    </channel>
  </rss>`;
  writeFile("dist/rss.xml", rss);
}

export function mdToHtml(md) {
  return marked.parse(md);
}
