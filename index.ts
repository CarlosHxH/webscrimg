// =============================
// API Web Scraper de Imagens
// Stack: Elysia + TypeScript
// =============================

import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import openapi from '@elysiajs/openapi';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

// =============================
// Configurações Gerais
// =============================

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

const http: AxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
});

// =============================
// Tipos
// =============================

type ImageResult = {
  id: number;
  url: string;
  thumbnail?: string;
  title?: string;
  width?: number;
  height?: number;
  source: string;
};

// =============================
// Bases de Conhecimento
// =============================

const knowledgeBases = new Map<string, string>([
  ['wikipedia', 'https://pt.wikipedia.org/wiki/'],
  ['unsplash', 'https://unsplash.com/s/photos/'],
  ['pexels', 'https://www.pexels.com/search/'],
  ['flickr', 'https://www.flickr.com/search/?text='],
  ['pixabay', 'https://pixabay.com/images/search/'],
]);

// =============================
// Utilitários
// =============================

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      currentPage: page,
      hasNextPage: start + limit < items.length,
      nextPage: page + 1,
      total: items.length,
    },
  };
}

function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// =============================
// App
// =============================

const app = new Elysia()
  .use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }))
  .use(openapi({
    documentation: {
      info: {
        title: 'API de Web Scraper de Imagens',
        version: '2.0.0',
        description: 'Scraping de imagens com múltiplas fontes',
      },
      servers: [{ url: BASE_URL }],
    },
  }))
  .use(swagger())

  // =============================
  // Middleware de Log
  // =============================
  .onRequest(({ request }) => {
    const { method, url } = request;
    console.log(`[${new Date().toISOString()}] ${method} ${new URL(url).pathname}`);
  })

  // =============================
  // Sistema
  // =============================

  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    knowledgeBases: knowledgeBases.size,
  }))

  // =============================
  // Bases de Conhecimento
  // =============================

  .get('/api/knowledge-bases', () => ({
    data: Array.from(knowledgeBases.entries()).map(([name, url]) => ({ name, url })),
  }))

  .post(
    '/api/knowledge-base',
    ({ body }) => {
      knowledgeBases.set(body.name, body.baseUrl);
      return { message: 'Base adicionada com sucesso', ...body };
    },
    {
      body: t.Object({ name: t.String(), baseUrl: t.String() }),
    },
  )

  .delete('/api/knowledge-base/:name', ({ params }) => {
    if (!knowledgeBases.delete(params.name)) {
      throw new Error('Base não encontrada');
    }
    return { message: 'Base removida', name: params.name };
  })

  // =============================
  // Google Images
  // =============================

  .get(
    '/api/scrape/google-images',
    async ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
        query.query,
      )}&tbm=isch&start=${(page - 1) * limit}`;

      const { data } = await http.get(searchUrl);
      const $ = cheerio.load(data);

      const urls = unique(
        $('img')
          .map((_, el) => $(el).attr('src'))
          .get()
          .filter(src => src?.startsWith('http')) as string[],
      );

      const { data: images, pagination } = paginate(urls, page, limit);

      return {
        engine: 'google',
        query: query.query,
        images: images.map<ImageResult>((url, i) => ({
          id: i + 1,
          url,
          thumbnail: url,
          source: 'google',
        })),
        pagination,
      };
    },
    {
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // =============================
  // Bing Images
  // =============================

  .get(
    '/api/scrape/bing-images',
    async ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);
      const first = (page - 1) * limit;

      const url = `https://www.bing.com/images/search?q=${encodeURIComponent(
        query.query,
      )}&first=${first}&count=${limit}`;

      const { data } = await http.get(url);
      const $ = cheerio.load(data);

      const images: ImageResult[] = [];

      $('a.iusc').each((i, el) => {
        const meta = $(el).attr('m');
        if (!meta) return;
        try {
          const parsed = JSON.parse(meta);
          images.push({
            id: i + 1,
            url: parsed.murl,
            thumbnail: parsed.turl,
            width: parsed.w,
            height: parsed.h,
            title: parsed.t,
            source: 'bing',
          });
        } catch {}
      });

      return {
        engine: 'bing',
        query: query.query,
        images,
        pagination: {
          currentPage: page,
          hasNextPage: images.length >= limit,
          nextPage: page + 1,
        },
      };
    },
    {
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // =============================
  // DuckDuckGo Images
  // =============================

  .get(
    '/api/scrape/duckduckgo-images',
    async ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);

      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query.query)}&iax=images&ia=images`;
      const { data } = await http.get(searchUrl);
      const $ = cheerio.load(data);

      const urls = unique(
        $('img')
          .map((_, el) => $(el).attr('src') || $(el).attr('data-src'))
          .get()
          .filter(src => src?.startsWith('http')) as string[],
      );

      const { data: images, pagination } = paginate(urls, page, limit);

      return {
        engine: 'duckduckgo',
        query: query.query,
        images: images.map((url, i) => ({
          id: i + 1,
          url,
          thumbnail: url,
          source: 'duckduckgo',
        })),
        pagination,
      };
    },
    {
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // =============================
  // Yandex Images
  // =============================

  .get(
    '/api/scrape/yandex-images',
    async ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);

      const url = `https://yandex.com/images/search?text=${encodeURIComponent(query.query)}`;
      const { data } = await http.get(url);
      const $ = cheerio.load(data);

      const urls = unique(
        $('img')
          .map((_, el) => $(el).attr('src'))
          .get()
          .filter(src => src?.startsWith('http')) as string[],
      );

      const { data: images, pagination } = paginate(urls, page, limit);

      return {
        engine: 'yandex',
        query: query.query,
        images: images.map((url, i) => ({
          id: i + 1,
          url,
          thumbnail: url,
          source: 'yandex',
        })),
        pagination,
      };
    },
    {
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // =============================
  // Brave Images
  // =============================

  .get(
    '/api/scrape/brave-images',
    async ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);

      const url = `https://search.brave.com/images?q=${encodeURIComponent(query.query)}`;
      const { data } = await http.get(url);
      const $ = cheerio.load(data);

      const urls = unique(
        $('img')
          .map((_, el) => $(el).attr('src'))
          .get()
          .filter(src => src?.startsWith('http')) as string[],
      );

      const { data: images, pagination } = paginate(urls, page, limit);

      return {
        engine: 'brave',
        query: query.query,
        images: images.map((url, i) => ({
          id: i + 1,
          url,
          thumbnail: url,
          source: 'brave',
        })),
        pagination,
      };
    },
    {
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // =============================
  // Knowledge Base Scraper
  // =============================

  .get(
    '/api/scrape/knowledge-base/:name',
    async ({ params, query }) => {
      const baseUrl = knowledgeBases.get(params.name);
      if (!baseUrl) throw new Error('Base não encontrada');

      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);

      const { data } = await http.get(baseUrl + encodeURIComponent(query.query));
      const $ = cheerio.load(data);

      const urls = unique(
        $('img')
          .map((_, el) => $(el).attr('src'))
          .get()
          .map(src => (src?.startsWith('http') ? src : new URL(src!, baseUrl).href)),
      );

      const { data: images, pagination } = paginate(urls, page, limit);

      return {
        base: params.name,
        query: query.query,
        images: images.map<ImageResult>((url, i) => ({
          id: i + 1,
          url,
          source: params.name,
        })),
        pagination,
      };
    },
    {
      params: t.Object({ name: t.String() }),
      query: t.Object({
        query: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  .listen(PORT);

console.log(`🚀 API rodando em ${BASE_URL}`);
