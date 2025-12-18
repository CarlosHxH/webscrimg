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
  title?: string
  width?: number
  height?: number
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

const BLOCKED_EXTENSIONS = [
  '.svg',
  '.ico'
]

function isBase64Image(url: string) {
  return url.startsWith('data:image')
}

function isTooSmall(url: string) {
  const matchW = url.match(/[?&]w=(\d+)/i)
  const matchH = url.match(/[?&]h=(\d+)/i)

  const w = matchW ? Number(matchW[1]) : null
  const h = matchH ? Number(matchH[1]) : null

  if (w !== null && w < 100) return true
  if (h !== null && h < 100) return true

  return false
}

function isSystemImage(
  url: string,
  $el?: cheerio.Cheerio<any>
): boolean {
  const lowerUrl = url.toLowerCase()

  // ❌ base64 (placeholder)
  if (lowerUrl.startsWith('data:image')) {
    return true
  }

  // ❌ extensões ruins
  if (lowerUrl.endsWith('.svg') || lowerUrl.endsWith('.ico')) {
    return true
  }

  // ❌ paths de sistema
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
    'branding',
    'flag',
    'flags',
    'region',
    'regions',
    '_next',
    'static',
    'assets',
    'favicon',
    'gif'
  ]

  if (blocked.some(k => lowerUrl.includes(k))) {
    return true
  }

  // ❌ imagens muito pequenas (query string)
  if (isTooSmall(lowerUrl)) {
    return true
  }

  if ($el) {
    const cls = ($el.attr('class') || '').toLowerCase()
    const alt = ($el.attr('alt') || '').toLowerCase()
    const role = ($el.attr('role') || '').toLowerCase()

    if (
      cls.includes('logo') ||
      cls.includes('icon') ||
      alt.includes('logo') ||
      role === 'presentation'
    ) {
      return true
    }
  }

  return false
}


function buildUrl(
  template: string,
  query: string,
  page: number
) {
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


// =============================
// Utils
// =============================

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
        if (raw.startsWith('data:image')) return null

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
    images: images.map((url, i) => ({
      id: i + 1,
      url,
      thumbnail: url,
      source: engine
    })),
    pagination
  }
}
async function parallelScrape(
  engines: string[],
  query: string,
  page = 1,
  limit = 20,
  concurrency = 3
) {
  const results: any[] = []
  const queue = [...engines]

  const workers = Array.from({ length: concurrency }).map(async () => {
    while (queue.length) {
      const engine = queue.shift()
      if (!engine) return

      try {
        const result = await scrapeEngine(engine, query, page, limit)
        results.push(result)
      } catch (err: any) {
        results.push({
          engine,
          error: err.message ?? 'Erro desconhecido'
        })
      }
    }
  })

  await Promise.all(workers)
  return results
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
          version: '2.0.0'
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
      `[${new Date().toISOString()}] ${request.method} ${new URL(request.url).pathname}`
    )
  })

  .get('/', () => ({
    message: 'API de Web Scraper de Imagens',
    version: '2.0.0',
    description: 'Scraping de imagens com múltiplas fontes',
    baseUrl: BASE_URL,
    documentation: `${BASE_URL}/swagger`,
    //endpoints: {search_engines: [...knowledgeBases.keys()].map(engine => `${BASE_URL}/api/scrape/${engine}`)},
    engines: [...knowledgeBases.keys()].map((engine: string) => engine),
    usage_examples: {
      description: `Buscar imagens`,
      url: `${BASE_URL}/api/scrape/google?query=gato&limit=10`,
      parameters: {
        query: 'gato',
        limit: '10'
      }
    }
  }))

  // =============================
  // Health
  // =============================
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    knowledgeBases: knowledgeBases.size
  }))

  // =============================
  // Knowledge Bases
  // =============================
  .get('/api/knowledge-bases', () => ({
    data: [...knowledgeBases.entries()].map(([name, url]) => ({ name, url }))
  }))

  .post(
    '/api/knowledge-base',
    ({ body }) => {
      knowledgeBases.set(body.name, body.baseUrl)
      return { message: 'Base adicionada', ...body }
    },
    {
      body: t.Object({
        name: t.String(),
        baseUrl: t.String()
      })
    }
  )

  // =============================
  // Scraper Genérico
  // =============================
  .get(
    '/api/scrape/:engine',
    async ({ params, query }) => {
      const template = knowledgeBases.get(params.engine)
      if (!template) throw new Error('Engine não encontrada')
  
      const page = Number(query.page ?? 1)
      const limit = Number(query.limit ?? 20)
  
      const url = buildUrl(template, query.query, page)
  
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
      
            // ❌ corta base64 na origem
            if (raw.startsWith('data:image')) return null
      
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
        engine: params.engine,
        query: query.query,
        url,
        images: images.map((url, i): ImageResult => ({
          id: i + 1,
          url,
          thumbnail: url,
          source: params.engine
        })),
        pagination
      }
    },
    {
      params: t.Object({
        engine: t.String()
      }),
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
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
  
      const page = Number(query.page ?? 1)
      const limit = Number(query.limit ?? 10)
  
      const results = await parallelScrape(
        engines,
        query.query,
        page,
        limit,
        4 // concorrência
      )
  
      return {
        query: query.query,
        engines,
        totalEngines: engines.length,
        success: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        results
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
