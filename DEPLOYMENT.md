# Deployment Guide

## Perbandingan Python vs Node
- Python: Flask + Requests, retry bawaan, header browser-like, memakai proxy internal via `PROXY_BASE` dan mudah lolos proteksi.
- Node: Express + Axios, kini ditingkatkan dengan header lengkap, fallback fetch langsung, dukungan cookies sesi (`PROXY_COOKIES`) dan SOCKS (`RES_PROXY*`).

## Persyaratan Sistem
- Node.js 18+ (disarankan 20/22)
- NPM
- Akses jaringan outbound ke domain sumber (otakudesu, komikindo)

## Instalasi
- `npm install`

## Konfigurasi Server Production
- Middleware: `helmet`, `compression`, `cors`, `trust proxy`
- Health route: `GET /` → `I am alive!`
- Error handling: 404 JSON dan error middleware
- Proxy internal: `GET /proxy?url=<target>` dengan whitelist dan header mirip browser

## Environment Variables
- `PORT`: port server (platform akan menetapkan otomatis; fallback tersedia)
- `PROXY_BASE`:
  - Vercel: set ke `https://<project>.vercel.app` (opsional, otomatis dari `VERCEL_URL`)
  - Railway/hosting server: opsional; default `http://127.0.0.1:<PORT>`
- `PROXY_COOKIES`: cookies sesi upstream (contoh: `cf_clearance=...; __cf_bm=...; PHPSESSID=...`)
- `RES_PROXY` atau `RES_PROXY_HOST`/`RES_PROXY_PORT`/`RES_PROXY_TYPE`: outbound SOCKS proxy (default `socks5h`)
- `PROXY_UA`: override User-Agent proxy (opsional)

## Deployment Platform
### Vercel
- File: `api/[...slug].js` (serverless handler), `vercel.json` (rewrite ke `/api`)
- Jangan isi `VERCEL_URL` manual; gunakan `PROXY_BASE` jika perlu override.
- Set Environment Variables di Project Settings.

### Railway
- Jalankan `npm start` (Express listen ke `PORT`).
- Domain publik: `https://<nama-proyek>.up.railway.app`.
- Env opsional: `PROXY_COOKIES`, `RES_PROXY*`. `PROXY_BASE` tidak wajib (pakai loopback).

## Langkah Testing
- Local dev: `npm start` kemudian `npm run smoke` (atau set `BASE_URL=http://127.0.0.1:<port>`)
- Production: set `BASE_URL` ke domain publik dan jalankan `npm run smoke` secara lokal untuk memverifikasi endpoint.
- Endpoint diuji: `/`, `/top-anime`, `/latest-anime?page=1`, `/latest-comics?page=1`, `/popular-comics`, `/latest-collections`, `/search?query=naruto`, `/search-comics?query=naruto`.

## Troubleshooting
- `Invalid URL`: pastikan `PROXY_BASE` adalah URL absolut (`https://...`), tanpa trailing slash, atau biarkan default (Railway).
- `403/401` dari proxy/upstream:
  - Tambahkan `PROXY_COOKIES` (cf_clearance, __cf_bm, sesi) dari browser untuk domain yang diakses.
  - Pertimbangkan `RES_PROXY` jika IP platform diblokir.
- `502 /proxy`:
  - Pastikan domain target ada di whitelist (`ALLOWED_HOSTS`).
  - Cek konektivitas ke upstream dan nilai cookies.

## Catatan
- Tidak ada database dalam proyek ini.
- Gunakan dengan bijak sesuai ketentuan situs sumber.
