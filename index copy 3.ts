import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import axios from 'axios'
import * as cheerio from 'cheerio'

// =============================
// Configurações
// =============================

const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = `http://localhost:${PORT}`

const http = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
  }
})

// =============================
// Tipos
// =============================

type ImageResult = {
  id: number
  url: string
  thumbnail?: string
  source: string
}

// =============================
// Bases de Conhecimento
// =============================

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
// =============================
// Filtros de Imagem
// =============================

function isTrackingPixel(url: string) {
  return (
    url.startsWith('data:image') &&
    (url.length < 200 || url.includes('AAAAEAAAAB'))
  )
}

function isTooSmall(url: string) {
  const w = url.match(/[?&]w=(\d+)/i)?.[1]
  const h = url.match(/[?&]h=(\d+)/i)?.[1]
  return (w && Number(w) < 100) || (h && Number(h) < 100)
}

function isSystemImage(url: string, $el?: cheerio.Cheerio<any>) {
  const u = url.toLowerCase()

  if (isTrackingPixel(u)) return true
  if (u.endsWith('.svg') || u.endsWith('.ico') || u.endsWith('.gif')) return true
  if (isTooSmall(u)) return true

  const blocked = [
    'logo',
    'icon',
    'sprite',
    'favicon',
    'flag',
    'flags',
    '_next',
    'static',
    'assets',
    'branding',
    'header',
    'footer',
    'menu',
    'navbar',
    'mm.bing.net'
  ]

  if (blocked.some(k => u.includes(k))) return true

  if ($el) {
    const cls = ($el.attr('class') || '').toLowerCase()
    const alt = ($el.attr('alt') || '').toLowerCase()
    if (cls.includes('logo') || alt.includes('logo')) return true
  }

  return false
}

// =============================
// Utils
// =============================

function buildUrl(template: string, query: string, page: number) {
  return template
    .replace('{query}', encodeURIComponent(query))
    .replace('{page}', String(page))
}

function normalizeImageUrl(src: string, base: string) {
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('http')) return src
  try {
    return new URL(src, base).href
  } catch {
    return null
  }
}

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit
  return {
    data: items.slice(start, start + limit),
    pagination: {
      currentPage: page,
      hasNextPage: start + limit < items.length,
      nextPage: page + 1,
      total: items.length
    }
  }
}

const unique = <T,>(arr: T[]) => [...new Set(arr)]

// =============================
// Scraper
// =============================

async function scrapeEngine(
  engine: string,
  query: string,
  page = 1,
  limit = 20
) {
  const template = knowledgeBases.get(engine)
  if (!template) throw new Error(`Engine inválida: ${engine}`)

  const url = buildUrl(template, query, page)
  const { data } = await http.get(url)
  const $ = cheerio.load(data)

  const urls = unique(
    $('img')
      .map((_, el) => {
        const $el = $(el)
        const raw =
          $el.attr('src') ||
          $el.attr('data-src') ||
          $el.attr('data-lazy')

        if (!raw) return null
        if (isTrackingPixel(raw)) return null

        const normalized = normalizeImageUrl(raw, url)
        if (!normalized) return null
        if (isSystemImage(normalized, $el)) return null

        return normalized
      })
      .get()
      .filter(Boolean)
  )

  const { data: images, pagination } = paginate(urls, page, limit)

  return {
    engine,
    url,
    images: images.map((url, i): ImageResult => ({
      id: i + 1,
      url,
      thumbnail: url,
      source: engine
    })),
    pagination
  }
}

// =============================
// Paralelização
// =============================

async function parallelScrape(
  engines: string[],
  query: string,
  page = 1,
  limit = 20
) {
  return Promise.all(
    engines.map(engine =>
      scrapeEngine(engine, query, page, limit).catch(err => ({
        engine,
        error: err.message ?? 'Erro'
      }))
    )
  )
}

// =============================
// App
// =============================

const app = new Elysia()
  .use(cors({ origin: '*' }))
  .use(
    swagger({
      documentation: {
        info: {
          title: 'API Web Scraper de Imagens',
          version: '2.1.0'
        },
        servers: [{ url: BASE_URL }]
      }
    })
  )

  // =============================
  // Middleware Log
  // =============================
  .onRequest(({ request }) => {
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${
        new URL(request.url).pathname
      }`
    )
  })

  // =============================
  // Root
  // =============================
  .get('/', () => ({
    message: 'API Web Scraper de Imagens',
    version: '2.1.0',
    engines: [...knowledgeBases.keys()],
    docs: `${BASE_URL}/swagger`
  }))

  // =============================
  // Health
  // =============================
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    engines: knowledgeBases.size
  }))

  // =============================
  // Knowledge Bases
  // =============================
  .get('/api/knowledge-bases', () => ({
    data: [...knowledgeBases.entries()].map(([name, url]) => ({
      name,
      url
    }))
  }))

  .post(
    '/api/knowledge-base',
    ({ body }) => {
      knowledgeBases.set(body.name, body.baseUrl)
      return {
        message: 'Base adicionada com sucesso',
        name: body.name,
        baseUrl: body.baseUrl
      }
    },
    {
      body: t.Object({
        name: t.String(),
        baseUrl: t.String()
      })
    }
  )

  // =============================
  // Scrape individual
  // =============================
  .get(
    '/api/scrape/:engine',
    async ({ params, query }) =>
      scrapeEngine(
        params.engine,
        query.query,
        Number(query.page ?? 1),
        Number(query.limit ?? 20)
      ),
    {
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  // =============================
  // Scrape paralelo
  // =============================
  .get(
    '/api/scrape/all',
    async ({ query }) => {
      const engines = query.engines
        ? query.engines.split(',').map(e => e.trim())
        : [...knowledgeBases.keys()]

      return {
        query: query.query,
        engines,
        total: engines.length,
        results: await parallelScrape(
          engines,
          query.query,
          Number(query.page ?? 1),
          Number(query.limit ?? 20)
        )
      }
    },
    {
      query: t.Object({
        query: t.String(),
        engines: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  .listen(PORT)

console.log(`🚀 API rodando em ${BASE_URL}`)