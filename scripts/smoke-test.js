import axios from 'axios'

const BASE = process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`

async function run(name, path) {
  try {
    const url = `${BASE}${path}`
    const resp = await axios.get(url, { validateStatus: () => true, timeout: 15000 })
    const status = resp.status
    const ok = status >= 200 && status < 300
    const body = resp.data
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${status} ${url}`)
    if (!ok) console.log(JSON.stringify(body).slice(0, 300))
  } catch (e) {
    console.log(`ERROR ${name} ${String(e)}`)
  }
}

async function main() {
  await run('health', '/')
  await run('top-anime', '/top-anime')
  await run('latest-anime', '/latest-anime?page=1')
  await run('latest-comics', '/latest-comics?page=1')
  await run('popular-comics', '/popular-comics')
  await run('latest-collections', '/latest-collections')
  await run('search-anime', '/search?query=naruto')
  await run('search-comics', '/search-comics?query=naruto')
}

main()
