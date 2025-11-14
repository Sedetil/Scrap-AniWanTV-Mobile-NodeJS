import express from 'express'
import { getTopAnime, getLatestAnime, getAnimeDetails, getEpisodeStreams, searchAnime } from './scraper.js'

const router = express.Router()

router.get('/top-anime', async (req, res) => {
  try {
    const data = await getTopAnime()
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/latest-anime', async (req, res) => {
  try {
    const page = Number(req.query.page || 1)
    const data = await getLatestAnime(page)
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/anime-details', async (req, res) => {
  try {
    const url = req.query.url
    if (!url) return res.status(400).json({ success: false, error: "Missing 'url' parameter" })
    const data = await getAnimeDetails(url)
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/episode-streams', async (req, res) => {
  try {
    const url = req.query.url
    if (!url) return res.status(400).json({ success: false, error: "Missing 'url' parameter" })
    const data = await getEpisodeStreams(url)
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

router.get('/search', async (req, res) => {
  try {
    const query = req.query.query
    if (!query) return res.status(400).json({ success: false, error: "Missing 'query' parameter" })
    const data = await searchAnime(query)
    res.json({ success: true, data })
  } catch (e) {
    const msg = String(e)
    const code = /^\d{3}$/.test(msg) && Number(msg) >= 400 ? 502 : 500
    res.status(code).json({ success: false, error: msg })
  }
})

export default router
