import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { file } from 'bun'

// =====================================================
// Configurações
// =====================================================

const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = `http://localhost:${PORT}`

const http = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
  }
})

// =====================================================
// Tipos
// =====================================================

type ImageResult = {
  id: number
  url: string
  thumbnail?: string
  title?: string
  source: string
}

// =====================================================
// Engines
// =====================================================

const knowledgeBases = new Map<string, string>([
  ['wikipedia', 'https://pt.wikipedia.org/wiki/{query}'],
  ['unsplash', 'https://unsplash.com/s/photos/{query}'],
  ['pexels', 'https://www.pexels.com/search/{query}'],
  ['pixabay', 'https://pixabay.com/images/search/{query}'],
  ['bing', 'https://www.bing.com/images/search?q={query}'],
  ['duckduckgo', 'https://duckduckgo.com/?q={query}'],
  ['brave', 'https://search.brave.com/images?q={query}'],
  ['gaprisa', 'https://www.gaprisa.com.br/catalogsearch/result/?q={query}'],
  ['google', 'https://www.google.com/search?q={query}&tbm=isch'],
  ['autoexperts', 'https://www.autoexperts.parts/pt/br/search?q={query}'],
  ['cuiaba', 'https://www.cuiabadistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['alagoas', 'https://www.alagoasdistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['bahia', 'https://www.bahiadistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['ceara', 'https://www.cearadistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['espirito-santo', 'https://www.espiritosantodistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['goias', 'https://www.goiasedistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['maranhao', 'https://www.maranhaodistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['mato-grosso', 'https://www.matogrossodistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['mato-grosso-do-sul', 'https://www.matogrossodosuldistribuidora.com.br/produtos/bp.asp?busca={query}'],
  ['hipervarejo', 'https://www.hipervarejo.com.br/search?paged={page}&q={query}'],
  ['jbs', 'https://www.jbs.com.br/produtos/bp.asp?busca={query}'],
  ['jocar', 'https://www.jocar.com.br/{query}']
])

// =====================================================
// Utils – filtros fortes
// =====================================================

function isSystemImage(url: string): boolean {
  const u = url.toLowerCase()

  if (u.startsWith('data:image')) return true
  if (u.endsWith('.svg') || u.endsWith('.ico')) return true

  const blocked = [
    'logo',
    'icon',
    'icons',
    'sprite',
    'ui',
    'header',
    'footer',
    'menu',
    'navbar',
    'brand',
    'favicon',
    '_next',
    'static',
    'assets',
    'gif',
    'tia.png',
    'google.com/images'
  ]

  return blocked.some(b => u.includes(b))
}

function normalizeUrl(src: string, base: string) {
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('http')) return src
  try {
    return new URL(src, base).href
  } catch {
    return null
  }
}

const unique = <T,>(arr: T[]) => [...new Set(arr)]

// =====================================================
// Google Images — JSON interno REAL
// =====================================================
function extractGoogleUrls(script: string, bucket: Set<string>) {
  const regex = /https?:\/\/[^"'\\\s]+/g
  const matches = script.match(regex)
  if (!matches) return

  for (const url of matches) {
    const u = url.toLowerCase()

    if (
      u.includes('gstatic') &&
      u.includes('encrypted') &&
      !u.includes('logo') &&
      !u.includes('icon') &&
      !u.includes('sprite') &&
      !u.endsWith('.svg')
    ) {
      bucket.add(url)
    }

    if (
      (u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png')) &&
      !isSystemImage(u)
    ) {
      bucket.add(url)
    }
  }
}

function isValidImage(url) {
  if (!url) return false

  const blockedKeywords = [
    'favicon',
    'icon',
    'logo',
    'sprite',
    'placeholder',
    'ui',
    'menu',
    'button',
    'svg',
    '32x32',
    '16x16'
  ]

  const lower = url.toLowerCase()

  if (blockedKeywords.some(k => lower.includes(k))) {
    return false
  }

  // só imagens reais
  if (!lower.match(/\.(jpg|jpeg|png|webp)$/)) {
    return false
  }

  return true
}


async function scrapeGoogleImages(query: string, limit = 20) {
  const url =
    'https://www.google.com/async/imagelist' +
    `?q=${encodeURIComponent(query)}` +
    '&ijn=0&async=_id:rg_s,_pms:s,_fmt:json'

  const { data } = await http.get(url)
  const html = data?.data

  if (!html) {
    return {
      engine: 'google',
      url,
      images: [],
      pagination: {
        currentPage: 1,
        hasNextPage: false,
        nextPage: 2,
        total: 0
      }
    }
  }

  const $ = cheerio.load(html)
  const images: ImageResult[] = []
  const seen = new Set<string>()

  $('img').each((_, el) => {
    if (images.length >= limit) return

    const src =
      $(el).attr('data-src') ||
      $(el).attr('src')

    if (!src) return
    if (!src.startsWith('http')) return
    if (isSystemImage(src)) return
    if (seen.has(src)) return

    seen.add(src)

    images.push({
      id: images.length + 1,
      url: src,
      thumbnail: src,
      source: 'google'
    })
  })

  return {
    engine: 'google',
    url,
    images,
    pagination: {
      currentPage: 1,
      hasNextPage: false,
      nextPage: 2,
      total: images.length
    }
  }
}



function walkGoogleJSON(
  node: any,
  images: ImageResult[],
  nextId: () => number,
  limit: number
) {
  if (!node || images.length >= limit) return

  if (Array.isArray(node)) {
    if (
      typeof node[0] === 'string' &&
      node[0].startsWith('http') &&
      Array.isArray(node[1])
    ) {
      const original = node[0]
      const thumb = node[1][0]

      if (!isSystemImage(original)) {
        images.push({
          id: nextId(),
          url: original,
          thumbnail: thumb,
          source: 'google'
        })
      }
    }

    for (const item of node) {
      walkGoogleJSON(item, images, nextId, limit)
    }
  }
}

// =====================================================
// Scraper genérico (Bing, Brave, etc)
// =====================================================

async function scrapeGeneric(
  engine: string,
  query: string,
  limit = 20
) {
  const template = knowledgeBases.get(engine)!
  const url = template.replace('{query}', encodeURIComponent(query))

  const { data } = await http.get(url)
  const $ = cheerio.load(data)

  const urls = unique(
    $('img')
      .map((_, el) => {
        const raw =
          $(el).attr('src') ||
          $(el).attr('data-src') ||
          $(el).attr('data-lazy')

        if (!raw) return null

        const normalized = normalizeUrl(raw, url)
        if (!normalized) return null
        if (isSystemImage(normalized)) return null

        return normalized
      })
      .get()
      .filter(Boolean)
  )

  return {
    engine,
    url,
    images: urls.slice(0, limit).map((u, i) => ({
      id: i + 1,
      url: u,
      thumbnail: u,
      source: engine
    })),
    pagination: {
      currentPage: 1,
      hasNextPage: false,
      nextPage: 2,
      total: urls.length
    }
  }
}

// =====================================================
// Paralelização
// =====================================================

async function scrapeAll(
  engines: string[],
  query: string,
  limit = 10,
  concurrency = 4
) {
  const queue = [...engines]
  const results: any[] = []

  const workers = Array.from({ length: concurrency }).map(async () => {
    while (queue.length) {
      const engine = queue.shift()
      if (!engine) return

      try {
        const res =
          engine === 'google'
            ? await scrapeGoogleImages(query, limit)
            : await scrapeGeneric(engine, query, limit)

        results.push(res)
      } catch (e: any) {
        results.push({ engine, error: e.message })
      }
    }
  })

  await Promise.all(workers)
  return results
}

// =====================================================
// API
// =====================================================

const app = new Elysia()
  .use(cors({ origin: '*' }))
  .use(
    swagger({
      documentation: {
        info: {
          title: 'WebScrImg API',
          version: '3.0.0'
        },
        servers: [{ url: BASE_URL }]
      }
    })
  )

  .get('/', () => () => file('./index.html'))/*({
    name: 'WebScrImg',
    version: '3.0.0',
    engines: [...knowledgeBases.keys()],
    swagger: `${BASE_URL}/swagger`
  }))*/

  .get('/api/health', () => ({
    status: 'ok',
    engines: knowledgeBases.size,
    timestamp: new Date().toISOString()
  }))

  .get('/api/engines', () => [...knowledgeBases.keys()])

  .get(
    '/api/scrape/:engine',
    async ({ params, query }) => {
      const limit = Number(query.limit ?? 10)

      if (params.engine === 'google') {
        return scrapeGoogleImages(query.query, limit)
      }

      return scrapeGeneric(params.engine, query.query, limit)
    },
    {
      params: t.Object({ engine: t.String() }),
      query: t.Object({
        query: t.String(),
        limit: t.Optional(t.String())
      })
    }
  )

  .get(
    '/api/scrape/all',
    async ({ query }) => {
      const engines = query.engines
        ? query.engines.split(',').map(e => e.trim())
        : [...knowledgeBases.keys()]

      const limit = Number(query.limit ?? 10)

      const results = await scrapeAll(engines, query.query, limit)

      return {
        query: query.query,
        engines,
        totalEngines: engines.length,
        results
      }
    },
    {
      query: t.Object({
        query: t.String(),
        engines: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  .listen(PORT)

console.log(`🚀 WebScrImg rodando em ${BASE_URL}`)
