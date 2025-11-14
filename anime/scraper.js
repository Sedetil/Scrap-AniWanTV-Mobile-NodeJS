import axios from "axios";
import * as cheerio from "cheerio";
import { SocksProxyAgent } from "socks-proxy-agent";

const BASE = "https://otakudesu.best";
function proxyBase() {
  const explicit = process.env.PROXY_BASE;
  if (explicit) return explicit;
  if (process.env.VERCEL) {
    const url = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "";
    return url || `http://127.0.0.1:${process.env.PORT || 5000}`;
  }
  return `http://127.0.0.1:${process.env.PORT || 5000}`;
}
const RP =
  process.env.RES_PROXY ||
  (process.env.RES_PROXY_HOST && process.env.RES_PROXY_PORT
    ? `${process.env.RES_PROXY_TYPE || "socks5h"}://${
        process.env.RES_PROXY_HOST
      }:${process.env.RES_PROXY_PORT}`
    : null);
const agent = RP ? new SocksProxyAgent(RP) : undefined;

async function getPage(url) {
  const target = `${proxyBase()}/proxy?url=${encodeURIComponent(url)}`;
  const resp = await axios.get(target, {
    timeout: 15000,
    httpAgent: agent,
    httpsAgent: agent,
  });
  return resp.data;
}

function parseList($) {
  const out = [];
  const items = $("ul.chivsrc li").toArray();
  if (items.length) {
    items.forEach((it) => {
      const el = $(it);
      const a = el.find("h2 a").first();
      const img = el.find("img").first();
      const title = a.text().trim();
      const href = a.attr("href") || "";
      const image_url = img.attr("src") || "";
      if (title && href) out.push({ title, url: href, image_url });
    });
    return out;
  }
  $('#venkonten .venser a[href*="/anime/"]').each((i, a) => {
    const href = $(a).attr("href");
    const title = $(a).text().trim();
    const img = $(a).parent().find("img").attr("src") || "";
    if (title && href) out.push({ title, url: href, image_url: img });
  });
  return out;
}

export async function getTopAnime() {
  const html = await getPage(`${BASE}/complete-anime`);
  const $ = cheerio.load(html);
  return parseList($);
}

export async function getLatestAnime(page = 1) {
  const html = await getPage(`${BASE}/ongoing-anime`);
  const $ = cheerio.load(html);
  const anime_list = parseList($);
  return { anime_list, current_page: page, total_pages: 1 };
}

export async function getAnimeDetails(detailUrl) {
  const html = await getPage(detailUrl);
  const $ = cheerio.load(html);
  const container = $("#venkonten").length ? $("#venkonten") : $.root();
  const h1 =
    container.find("h1.posttl").first().text().trim() ||
    container.find("h1").first().text().trim();
  const title =
    h1 ||
    ($('meta[property="og:title"]').attr("content") || "").trim() ||
    "Unknown Title";
  let image_url =
    container.find(".fotoanime img").attr("src") ||
    container.find("img.wp-post-image").attr("src") ||
    container.find(".venser img").attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    "";
  const info = container.find(".infoanime").length
    ? container.find(".infoanime")
    : container.find(".info");
  function extract(label) {
    const scope = info.length ? info : container;
    const cand = scope
      .find("b, strong")
      .filter((i, el) =>
        $(el).text().toLowerCase().includes(label.toLowerCase())
      )
      .toArray();
    for (const el of cand) {
      const parent = $(el).parent();
      const links = parent
        .find("a")
        .map((i, a) => $(a).text().trim())
        .get()
        .filter(Boolean);
      if (links.length) return links.join(", ");
      const val = parent
        .text()
        .replace($(el).text(), "")
        .replace(":", "")
        .trim();
      if (val) return val;
    }
    const txt = scope.text();
    const m = txt.match(new RegExp(label + "\\s*:\\s*([^\n\r]+)", "i"));
    return m ? m[1].trim() : "";
  }
  const japanese = extract("Japanese");
  const rating =
    extract("Skor") ||
    $('i[itemprop="ratingValue"], span[itemprop="ratingValue"]')
      .first()
      .text()
      .trim();
  const producer = extract("Produser");
  const type = extract("Tipe");
  const status = extract("Status");
  const total_episodes = extract("Total Episode");
  const duration = extract("Durasi");
  const release_date = extract("Tanggal Rilis");
  const studio = extract("Studio");
  let genres = [];
  const bGenres = info
    .find("b")
    .filter((i, el) => $(el).text().includes("Genres"))
    .first();
  if (bGenres.length)
    genres = bGenres
      .parent()
      .find("a")
      .map((i, a) => $(a).text().trim())
      .get()
      .filter(Boolean);
  if (!genres.length)
    genres = container
      .find('a[href*="/genres/"]')
      .map((i, a) => $(a).text().trim())
      .get()
      .filter(Boolean);
  let synopsis = "";
  const syn = container
    .find("h2, b, strong")
    .filter((i, el) => $(el).text().includes("Sinopsis"))
    .first();
  if (syn.length) synopsis = syn.nextAll("p").first().text().trim();
  if (!synopsis) synopsis = container.find(".sinopc").text().trim();
  const episodes = [];
  const list = container.find(
    'div.episodelist, div[class*="epslist"], div[class*="eplister"]'
  );
  if (list.length) {
    list.find('a[href*="/episode/"]').each((i, a) => {
      episodes.push({ title: $(a).text().trim(), url: $(a).attr("href") });
    });
  } else {
    container
      .find('select#selectcog option[value*="/episode/"]')
      .each((i, o) => {
        episodes.push({ title: $(o).text().trim(), url: $(o).attr("value") });
      });
    if (!episodes.length)
      container
        .find('a[href*="/episode/"]')
        .each((i, a) =>
          episodes.push({ title: $(a).text().trim(), url: $(a).attr("href") })
        );
  }
  const seen = new Set();
  const eps = episodes.filter((ep) => {
    if (!ep.url || seen.has(ep.url)) return false;
    seen.add(ep.url);
    return true;
  });
  return {
    title,
    image_url,
    japanese: japanese || "N/A",
    rating: rating || "N/A",
    producer: producer || "N/A",
    type: type || "N/A",
    status: status || "N/A",
    total_episodes: total_episodes || "N/A",
    duration: duration || "N/A",
    release_date: release_date || "N/A",
    studio: studio || "N/A",
    genres,
    synopsis: synopsis || "No synopsis available",
    episodes: eps,
  };
}

function unwrapSafelink(href) {
  try {
    const u = new URL(href);
    const pick = u.searchParams.get("id") || u.searchParams.get("url");
    if (pick) {
      const raw = decodeURIComponent(pick);
      const pad = raw.length % 4;
      const norm = pad ? raw + "=".repeat(4 - pad) : raw;
      const decoded = Buffer.from(norm, "base64").toString("utf-8");
      const m = decoded.match(/https?:\/\/[^\s"'<]*pixeldrain\.com[^\s"'<]*/);
      if (m) return m[0];
    }
  } catch {}
  return null;
}

export async function getEpisodeStreams(epUrl) {
  const html = await getPage(epUrl);
  const $ = cheerio.load(html);
  const container = $("#venkonten").length ? $("#venkonten") : $.root();
  const title = $("h1").first().text().trim() || "Unknown Episode";
  const iframe = container.find("iframe").first();
  let stream_url = iframe.attr("src") || null;
  const mirror_urls = container
    .find(".mirrorstream a[href]")
    .map((i, a) => $(a).attr("href"))
    .get()
    .filter(Boolean);
  const download_links = {};
  container
    .find('.download, #downloadb, div[id*="download"]')
    .find("li")
    .each((i, li) => {
      const q = $(li).find("strong").first().text().trim() || "";
      if (!q) return;
      const links = [];
      $(li)
        .find("a[href]")
        .each((j, a) => {
          links.push({ host: $(a).text().trim(), url: $(a).attr("href") });
        });
      download_links[q] = links;
    });
  function toPixeldrainAPI(raw) {
    let u = (raw || "").trim();
    if (!u) return null;
    if (u.includes("desustream.com")) {
      const unwrapped = unwrapSafelink(u);
      if (unwrapped) u = unwrapped;
    }
    const rx = /pixeldrain\.com\/(?:u|api\/file|u\/download)\/([A-Za-z0-9]+)/;
    let m = u.match(rx);
    let id = m ? m[1] : null;
    if (!id) {
      try {
        const url = new URL(u);
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts[0] === "u" && parts[1]) id = parts[1];
        if (parts[0] === "api" && parts[1] === "file" && parts[2])
          id = parts[2];
      } catch {}
    }
    if (id) return `https://pixeldrain.com/api/file/${id}`;
    return u.includes("pixeldrain.com") ? u : null;
  }
  async function resolvePix(u) {
    const local = toPixeldrainAPI(u);
    if (local) return local;
    try {
      const resp = await axios.get(u, {
        maxRedirects: 5,
        timeout: 12000,
        httpAgent: agent,
        httpsAgent: agent,
        validateStatus: () => true,
      });
      const finalUrl =
        (resp.request && resp.request.res && resp.request.res.responseUrl) || u;
      return toPixeldrainAPI(finalUrl);
    } catch {
      return null;
    }
  }
  const direct_stream_urls = [];
  for (const [q, items] of Object.entries(download_links)) {
    for (const it of items) {
      const api = await resolvePix(it.url);
      if (api)
        direct_stream_urls.push({ host: "Pixeldrain", quality: q, url: api });
    }
  }
  if (!direct_stream_urls.length) {
    container.find('a[href*="pixeldrain.com"]').each((i, a) => {
      const api = toPixeldrainAPI($(a).attr("href"));
      if (api)
        direct_stream_urls.push({
          host: "Pixeldrain",
          quality: "Unknown",
          url: api,
        });
    });
  }
  if (!direct_stream_urls.length && typeof html === "string") {
    const m = html.match(/https?:\/\/[^\s"'<]*pixeldrain\.com[^\s"'<]*/g) || [];
    m.forEach((link) => {
      const api = toPixeldrainAPI(link);
      if (api)
        direct_stream_urls.push({
          host: "Pixeldrain",
          quality: "Unknown",
          url: api,
        });
    });
  }
  const uniq = [];
  const seen = new Set();
  direct_stream_urls.forEach((d) => {
    if (!seen.has(d.url)) {
      seen.add(d.url);
      uniq.push(d);
    }
  });
  const ds = uniq;
  if (!stream_url && ds.length) stream_url = ds[0].url;
  return {
    title,
    stream_url,
    mirror_urls,
    download_links,
    direct_stream_urls: ds,
  };
}

export async function searchAnime(query) {
  const html = await getPage(
    `${BASE}/?s=${encodeURIComponent(query)}&post_type=anime`
  );
  const $ = cheerio.load(html);
  return parseList($);
}
