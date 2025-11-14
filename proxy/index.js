import express from "express";
import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";

const router = express.Router();

const ALLOWED_HOSTS = ["otakudesu", "bosnime", "animeindo", "komikindo"];

function isAllowed(target) {
  try {
    const u = new URL(target);
    const host = u.hostname.toLowerCase();
    return (
      ALLOWED_HOSTS.some((h) => host.includes(h)) &&
      ["http:", "https:"].includes(u.protocol)
    );
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
  };
}

router.options("/proxy", (req, res) => {
  const origin = req.headers.origin;
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
  res.status(204).end();
});

router.get("/proxy", async (req, res) => {
  const origin = req.headers.origin;
  const target = req.query.url;
  if (!target)
    return res.status(400).json({ error: "Parameter 'url' wajib diisi" });
  if (!isAllowed(target))
    return res
      .status(403)
      .json({ error: "Host tidak diizinkan atau URL tidak valid" });
  try {
    const u = new URL(target);
    const headers = {
      "User-Agent":
        req.headers["user-agent"] ||
        process.env.PROXY_UA ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept:
        req.headers["accept"] ||
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language":
        req.headers["accept-language"] || "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      Referer: req.headers["referer"] || `${u.protocol}//${u.hostname}/`,
      "Sec-Fetch-Site": req.headers["sec-fetch-site"] || "same-origin",
      "Sec-Fetch-Mode": req.headers["sec-fetch-mode"] || "navigate",
      "Sec-Fetch-Dest": req.headers["sec-fetch-dest"] || "document",
      "Sec-Ch-Ua":
        req.headers["sec-ch-ua"] || '"Chromium";v="123", "Not(A:Brand)";v="8"',
      "Sec-Ch-Ua-Platform": req.headers["sec-ch-ua-platform"] || '"Windows"',
      "Sec-Ch-Ua-Mobile": req.headers["sec-ch-ua-mobile"] || "?0",
      Host: u.hostname,
    };
    const extraCookies = process.env.PROXY_COOKIES || "";
    const clientCookies = req.headers.cookie || "";
    const cookieHeader = [clientCookies, extraCookies]
      .filter(Boolean)
      .join("; ");
    if (cookieHeader) headers["Cookie"] = cookieHeader;
    const rp =
      process.env.RES_PROXY ||
      (process.env.RES_PROXY_HOST && process.env.RES_PROXY_PORT
        ? `${process.env.RES_PROXY_TYPE || "socks5h"}://${
            process.env.RES_PROXY_HOST
          }:${process.env.RES_PROXY_PORT}`
        : null);
    const agent = rp ? new SocksProxyAgent(rp) : undefined;
    const resp = await axios.get(target, {
      headers,
      maxRedirects: 5,
      timeout: 15000,
      httpAgent: agent,
      httpsAgent: agent,
      validateStatus: () => true,
      responseType: "text",
    });
    if (resp.status >= 400)
      return res.status(502).json({ error: `Upstream error ${resp.status}` });
    const ct = resp.headers["content-type"] || "text/html; charset=utf-8";
    res.status(resp.status);
    res.setHeader("Content-Type", ct);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) =>
      res.setHeader(k, v)
    );
    res.send(resp.data);
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
});

export default router;
