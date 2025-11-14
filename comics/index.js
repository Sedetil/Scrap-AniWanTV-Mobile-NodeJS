import express from 'express'
import { getLatestComics, getPopularComics, getLatestCollections, getComicDetails, getChapterImages, searchComics } from './scraper.js'

const router = express.Router()

router.get('/latest-comics', async (req, res) => {
  try {
    const page = Number(req.query.page || 1)
    const data = await getLatestComics(page)
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/popular-comics', async (req, res) => {
  try {
    const data = await getPopularComics()
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/latest-collections', async (req, res) => {
  try {
    const data = await getLatestCollections()
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/comic-details', async (req, res) => {
  try {
    const url = req.query.url
    if (!url) return res.status(400).json({ success: false, error: "Missing 'url' parameter" })
    const data = await getComicDetails(url)
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/chapter-images', async (req, res) => {
  try {
    const url = req.query.url
    if (!url) return res.status(400).json({ success: false, error: "Missing 'url' parameter" })
    const data = await getChapterImages(url)
    if (!data || !Array.isArray(data.images) || !data.images.length) return res.status(500).json({ success: false, error: 'Failed to fetch chapter images', data: {} })
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg, data: {} })
  }
})

router.get('/search-comics', async (req, res) => {
  try {
    const query = req.query.query
    if (!query) return res.status(400).json({ success: false, error: "Missing 'query' parameter" })
    const data = await searchComics(query)
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

export default router
