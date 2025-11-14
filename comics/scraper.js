import axios from "axios";
import * as cheerio from "cheerio";
import { SocksProxyAgent } from "socks-proxy-agent";

const BASE = "https://komikindo.ch";
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
  const base = proxyBase();
  const target = `${base}/proxy?url=${encodeURIComponent(url)}`;
  try {
    const resp = await axios.get(target, {
      timeout: 15000,
      httpAgent: agent,
      httpsAgent: agent,
      validateStatus: () => true,
    });
    if (resp.status >= 400 || !resp.data) throw new Error(String(resp.status));
    return resp.data;
  } catch {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      Referer: url,
    };
    try {
      const u = new URL(url);
      headers["Host"] = u.hostname;
    } catch {}
    if (process.env.PROXY_COOKIES) headers["Cookie"] = process.env.PROXY_COOKIES;
    const resp2 = await axios.get(url, {
      timeout: 15000,
      httpAgent: agent,
      httpsAgent: agent,
      headers,
      validateStatus: () => true,
    });
    if (resp2.status >= 400) throw new Error(String(resp2.status));
    return resp2.data;
  }
}

export async function getLatestComics(page = 1) {
  const url =
    page === 1
      ? `${BASE}/komik-terbaru/`
      : `${BASE}/komik-terbaru/page/${page}/`;
  const html = await getPage(url);
  const $ = cheerio.load(html);
  const out = [];
  $(".animepost").each((i, el) => {
    const link = $(el).find('a[itemprop="url"]').first();
    if (!link.length) return;
    const title = link.attr("title")?.replace("Komik ", "") || "";
    const href = link.attr("href") || "";
    const image_url = $(el).find('img[itemprop="image"]').attr("src") || "";
    const typeflag =
      $(el).find('span[class*="typeflag"]').attr("class")?.split(" ").pop() ||
      "Unknown";
    const is_colored = !!$(el).find("div.warnalabel").length;
    const is_hot = !!$(el).find("span.hot").length;
    const ch = $(el).find("div.lsch a").first();
    const latest_chapter = ch.text().trim() || "N/A";
    const chapter_url = ch.attr("href") || "";
    const update_time = $(el).find("span.datech").text().trim() || "N/A";
    out.push({
      title,
      url: href,
      image_url,
      type: typeflag,
      is_colored,
      is_hot,
      latest_chapter,
      chapter_url,
      update_time,
    });
  });
  let total_pages = 1;
  $(".pagination a.page-numbers").each((i, a) => {
    const t = $(a).text().trim();
    if (/^\d+$/.test(t)) total_pages = Math.max(total_pages, Number(t));
  });
  return { comic_list: out, current_page: page, total_pages };
}

export async function getPopularComics() {
  const html = await getPage(`${BASE}/komik-terbaru/`);
  const $ = cheerio.load(html);
  const out = [];
  const section = $(".serieslist.pop");
  section.find("li").each((i, li) => {
    const a = $(li).find("a.series").first();
    if (!a.length) return;
    const title = a.attr("title")?.replace("Komik ", "") || "";
    const href = a.attr("href") || "";
    const image_url = $(li).find('img[itemprop="image"]').attr("src") || "";
    const author = $(li).find("span.author").text().trim() || "Unknown";
    const rating =
      $(li).find("span.loveviews").text().replace("♥", "").trim() || "N/A";
    const rank = $(li).find('div[class*="ctr"]').text().trim() || "N/A";
    out.push({ title, url: href, image_url, author, rating, rank });
  });
  return out;
}

export async function getLatestCollections() {
  const html = await getPage(`${BASE}/`);
  const $ = cheerio.load(html);
  const out = [];
  let section = $("div.widget").first();
  let list = section.nextAll("div.serieslist").first();
  if (!list.length)
    list = $("div.serieslist, section.serieslist, div.serieslist.pop").first();
  if (list.length) {
    list.find("li").each((i, li) => {
      const a = $(li).find("a.series").first();
      if (!a.length) return;
      const title =
        a.attr("title")?.replace("Manga ", "").replace("Komik ", "") || "";
      const href = a.attr("href") || "";
      const image_url =
        $(li).find('img[itemprop="image"]').attr("src") ||
        $(li).find("img").attr("src") ||
        "";
      const genres = ($(li).find("span.genre").text().trim() || "")
        .split(", ")
        .filter(Boolean);
      const rating =
        $(li).find("span.loveviews").text().replace("♥", "").trim() || "N/A";
      out.push({ title, url: href, image_url, genres, rating });
    });
  }
  if (!out.length) {
    $("a.series").each((i, a) => {
      const el = $(a);
      const title =
        el.attr("title")?.replace("Manga ", "").replace("Komik ", "") ||
        el.text().trim();
      const href = el.attr("href") || "";
      const li = el.closest("li");
      const image_url =
        li.find('img[itemprop="image"]').attr("src") ||
        li.find("img").attr("src") ||
        el.find("img").attr("src") ||
        "";
      const genres = (li.find("span.genre").text().trim() || "")
        .split(", ")
        .filter(Boolean);
      const rating =
        li.find("span.loveviews").text().replace("♥", "").trim() || "N/A";
      if (title && href)
        out.push({ title, url: href, image_url, genres, rating });
    });
  }
  return out;
}

export async function getComicDetails(detailUrl) {
  const html = await getPage(detailUrl);
  const $ = cheerio.load(html);
  const title =
    $("h1.entry-title").text().replace("Komik", "").trim() || "Unknown Title";
  const image_url = $("div.thumb img").attr("src") || "";
  const rating = $('i[itemprop="ratingValue"]').text().trim() || "N/A";
  const spe = $("div.spe");
  const alt = [];
  let status = "Unknown",
    author = "Unknown",
    illustrator = "Unknown",
    demographic = "Unknown",
    type = "Unknown",
    themes = [];
  spe.find("span").each((i, span) => {
    const b = $(span).find("b").first();
    if (!b.length) return;
    const label = b.text().trim().toLowerCase().replace(":", "");
    const value = $(span).text().replace(b.text(), "").trim();
    if (label === "judul alternatif")
      alt.push(
        ...value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    else if (label === "status") status = value;
    else if (label === "pengarang") author = value;
    else if (label === "ilustrator") illustrator = value;
    else if (label === "grafis")
      demographic = $(span).find("a").first().text().trim() || value;
    else if (label === "tema")
      themes = $(span)
        .find("a")
        .map((i, a) => $(a).text().trim())
        .get()
        .filter(Boolean);
    else if (label === "jenis komik")
      type = $(span).find("a").first().text().trim() || value;
  });
  const genres = $("div.genre-info a")
    .map((i, a) => $(a).text().trim())
    .get()
    .filter(Boolean);
  const synopsis =
    $('div.entry-content[itemprop="description"]').text().trim() ||
    "No synopsis available";
  const chapters = [];
  $("div.listeps ul li").each((i, li) => {
    const a = $(li).find("a").first();
    const title = a.text().trim() || "Unknown Chapter";
    const href = a.attr("href") || "";
    const update_time = $(li).find("span.dt").text().trim() || "N/A";
    chapters.append;
    chapters.push({ title, url: href, update_time });
  });
  const related_comics = [];
  $("#mirip li").each((i, li) => {
    const a = $(li).find("a.series").first();
    const title = a.attr("title")?.replace("Komik", "").trim() || "";
    const href = a.attr("href") || "";
    const image_url = $(li).find("img").attr("src") || "";
    related_comics.push({ title, url: href, image_url });
  });
  const last_updated = chapters.length ? chapters[0].update_time : "Unknown";
  return {
    title,
    image_url,
    rating,
    alternative_titles: alt,
    status,
    author,
    illustrator,
    demographic,
    type,
    genres,
    themes,
    synopsis,
    chapters,
    related_comics,
    last_updated,
  };
}

export async function getChapterImages(url) {
  const html = await getPage(
    url.startsWith("https://") ? url : `${BASE}/${url.replace(/^\/*/, "")}/`
  );
  const $ = cheerio.load(html);
  const title =
    $("h1.entry-title").text().replace("Komik", "").trim() || "Unknown Chapter";
  const description =
    $("div.chapter-desc").text().trim() || "No description available";
  const images = $("div.chapter-image img")
    .map((i, img) => ({
      url: $(img).attr("src") || "",
      alt: $(img).attr("alt") || title,
    }))
    .get()
    .filter((it) => it.url);
  const navigation = {};
  $("div.navig div.nextprev").each((i, nv) => {
    const chapter_list = $(nv).find('a[href*="/komik/"]').attr("href") || "";
    const next_chapter = $(nv).find('a[rel="next"]').attr("href") || "";
    const prev_chapter = $(nv).find('a[rel="prev"]').attr("href") || "";
    Object.assign(navigation, { chapter_list, next_chapter, prev_chapter });
  });
  const related_chapters = [];
  $("div.listeps li a").each((i, a) =>
    related_chapters.push({ title: $(a).text().trim(), url: $(a).attr("href") })
  );
  return { title, description, images, navigation, related_chapters };
}

export async function searchComics(query) {
  const html = await getPage(`${BASE}/?s=${encodeURIComponent(query)}`);
  const $ = cheerio.load(html);
  const out = [];
  $(".animepost").each((i, el) => {
    const a = $(el).find('a[itemprop="url"]').first();
    if (!a.length) return;
    const title = a.attr("title")?.replace("Komik ", "") || "";
    const href = a.attr("href") || "";
    const image_url = $(el).find('img[itemprop="image"]').attr("src") || "";
    const typeflag =
      $(el).find('span[class*="typeflag"]').attr("class")?.split(" ").pop() ||
      "Unknown";
    const rating = $(el).find("i").first().text().trim() || "N/A";
    out.push({ title, url: href, image_url, type: typeflag, rating });
  });
  return out;
}
