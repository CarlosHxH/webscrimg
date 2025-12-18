import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import openapi from '@elysiajs/openapi';

// Configuração de bases de conhecimento
const knowledgeBases = new Map([
  ['wikipedia', 'https://pt.wikipedia.org/wiki/'],
  ['unsplash', 'https://unsplash.com/s/photos/'],
  ['pexels', 'https://www.pexels.com/search/'],
  ['flickr', 'https://www.flickr.com/search/?text='],
  ['pixabay', 'https://pixabay.com/images/search/'],
]);

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const app = new Elysia()
  .use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }))
  .use(openapi({
    documentation: {
      info: {
        title: 'API de Web Scraper de Imagens',
        version: '1.0.0',
        description: 'API para scraping de imagens do Google, Bing, DuckDuckGo e bases de conhecimento personalizadas',
      },
      servers: [
        { url: BASE_URL, description: 'Servidor Principal' },
      ],
      tags: [
        { name: 'Motores de Busca', description: 'Endpoints para scraping de imagens' },
        { name: 'Bases de Conhecimento', description: 'Gerenciamento de bases personalizadas' },
        { name: 'Multi-Fonte', description: 'Busca combinada em múltiplas fontes' },
        { name: 'Sistema', description: 'Endpoints de sistema' },
      ],
    },
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'API de Web Scraper de Imagens',
        version: '1.0.0',
        description: 'API para scraping de imagens do Google, Bing, DuckDuckGo e bases de conhecimento personalizadas',
      },
      servers: [
        { url: BASE_URL, description: 'Servidor Principal' },
      ],
      tags: [
        { name: 'Motores de Busca', description: 'Endpoints para scraping de imagens' },
        { name: 'Bases de Conhecimento', description: 'Gerenciamento de bases personalizadas' },
        { name: 'Multi-Fonte', description: 'Busca combinada em múltiplas fontes' },
        { name: 'Sistema', description: 'Endpoints de sistema' },
      ],
    },
  }))
  
  // Middleware de logging
  .onRequest(({ request }) => {
    console.log(`[${new Date().toISOString()}] ${request.method} ${new URL(request.url).pathname}`);
  })

  // Rota raiz
  .get('/', () => ({
    name: 'API de Web Scraper de Imagens',
    version: '1.0.0',
    description: 'API para scraping de imagens do Google, Bing, DuckDuckGo e bases personalizadas',
    baseUrl: BASE_URL,
    documentation: `${BASE_URL}/swagger`,
    endpoints: {
      search_engines: [
        `${BASE_URL}/api/scrape/google-images`,
        `${BASE_URL}/api/scrape/bing-images`,
        `${BASE_URL}/api/scrape/duckduckgo-images`,
        `${BASE_URL}/api/scrape/all-engines`,
      ],
      knowledge_bases: [
        `${BASE_URL}/api/knowledge-bases`,
        `${BASE_URL}/api/knowledge-base`,
        `${BASE_URL}/api/scrape/knowledge-base/:baseName`,
      ],
      system: [`${BASE_URL}/api/health`],
    },
  }), {
    detail: {
      tags: ['Sistema'],
      summary: 'Página inicial da API',
    },
  })

  // Health check
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    knowledgeBasesCount: knowledgeBases.size,
  }), {
    detail: {
      tags: ['Sistema'],
      summary: 'Verificar status da API',
    },
  })

  // Listar bases de conhecimento
  .get('/api/knowledge-bases', () => {
    const bases = Array.from(knowledgeBases.entries()).map(([name, url]) => ({
      name,
      baseUrl: url,
    }));
    return { knowledgeBases: bases };
  }, {
    detail: {
      tags: ['Bases de Conhecimento'],
      summary: 'Listar todas as bases de conhecimento',
    },
  })

  // Adicionar base de conhecimento
  .post('/api/knowledge-base', ({ body }) => {
    const { name, baseUrl } = body;
    knowledgeBases.set(name, baseUrl);
    return { message: 'Base de conhecimento adicionada', name, baseUrl };
  }, {
    body: t.Object({
      name: t.String(),
      baseUrl: t.String(),
    }),
    detail: {
      tags: ['Bases de Conhecimento'],
      summary: 'Adicionar nova base de conhecimento',
    },
  })

  // Remover base de conhecimento
  .delete('/api/knowledge-base/:name', ({ params }) => {
    const { name } = params;
    if (knowledgeBases.has(name)) {
      knowledgeBases.delete(name);
      return { message: 'Base de conhecimento removida', name };
    }
    throw new Error('Base de conhecimento não encontrada');
  }, {
    params: t.Object({
      name: t.String(),
    }),
    detail: {
      tags: ['Bases de Conhecimento'],
      summary: 'Remover uma base de conhecimento',
    },
  })

  // Scraper Google Images
  .get('/api/scrape/google-images', async ({ query }) => {
    try {
      const { 
        query: searchQuery, 
        page = '1', 
        limit = '20',
        safeSearch = 'on',
      } = query;

      if (!searchQuery) {
        throw new Error('Parâmetro "query" é obrigatório');
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const start = (pageNum - 1) * limitNum;

      console.log(`[Google] Buscando: ${searchQuery}, página: ${page}, limit: ${limit}`);

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery as string)}&tbm=isch&start=${start}&safe=${safeSearch}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const images: string[] = [];

      // Extrair URLs de imagens
      $('script').each((i, elem) => {
        const content = $(elem).html();
        if (content && content.includes('AF_initDataCallback')) {
          const matches = content.match(/"(https?:\/\/[^"]*\.(jpg|jpeg|png|gif|webp)[^"]*)"/gi);
          if (matches) {
            matches.forEach(match => {
              const url = match.replace(/"/g, '');
              if (url.startsWith('http') && !images.includes(url) && images.length < limitNum * 2) {
                images.push(url);
              }
            });
          }
        }
      });

      if (images.length < limitNum) {
        $('img[data-src]').each((i, elem) => {
          const src = $(elem).attr('data-src');
          if (src && src.startsWith('http') && !images.includes(src)) {
            images.push(src);
          }
        });
      }

      if (images.length < limitNum) {
        $('img').each((i, elem) => {
          const src = $(elem).attr('src');
          if (src && src.startsWith('http') && !images.includes(src) && !src.includes('logo')) {
            images.push(src);
          }
        });
      }

      console.log(`[Google] Imagens encontradas: ${images.length}`);

      return {
        query: searchQuery,
        engine: 'google',
        page: pageNum,
        limit: limitNum,
        total: images.length,
        images: images.slice(0, limitNum).map((url, index) => ({
          id: index + 1 + start,
          url,
          thumbnail: url,
          source: 'google',
        })),
        pagination: {
          currentPage: pageNum,
          hasNextPage: images.length >= limitNum,
          nextPage: pageNum + 1,
        },
      };
    } catch (error: any) {
      console.error('[Google] Erro:', error.message);
      throw new Error(`Erro ao fazer scraping do Google: ${error.message}`);
    }
  }, {
    query: t.Object({
      query: t.String(),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      safeSearch: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Motores de Busca'],
      summary: 'Buscar imagens no Google',
    },
  })

  // Scraper Bing Images
  .get('/api/scrape/bing-images', async ({ query }) => {
    try {
      const { 
        query: searchQuery, 
        page = '1', 
        limit = '20',
        safeSearch = 'Moderate',
      } = query;

      if (!searchQuery) {
        throw new Error('Parâmetro "query" é obrigatório');
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const first = (pageNum - 1) * limitNum;

      console.log(`[Bing] Buscando: ${searchQuery}, página: ${page}`);

      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery as string)}&first=${first}&count=${limitNum}&safeSearch=${safeSearch}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const images: any[] = [];

      $('a.iusc').each((i, elem) => {
        const m = $(elem).attr('m');
        if (m) {
          try {
            const metadata = JSON.parse(m);
            if (metadata.murl) {
              images.push({
                url: metadata.murl,
                thumbnail: metadata.turl || metadata.murl,
                title: metadata.t || '',
                width: metadata.w || 0,
                height: metadata.h || 0,
              });
            }
          } catch (e) {}
        }
      });

      console.log(`[Bing] Imagens encontradas: ${images.length}`);

      return {
        query: searchQuery,
        engine: 'bing',
        page: pageNum,
        limit: limitNum,
        total: images.length,
        images: images.slice(0, limitNum).map((img, index) => ({
          id: index + 1 + first,
          url: img.url,
          thumbnail: img.thumbnail,
          title: img.title,
          width: img.width,
          height: img.height,
          source: 'bing',
        })),
        pagination: {
          currentPage: pageNum,
          hasNextPage: images.length >= limitNum,
          nextPage: pageNum + 1,
        },
      };
    } catch (error: any) {
      console.error('[Bing] Erro:', error.message);
      throw new Error(`Erro ao fazer scraping do Bing: ${error.message}`);
    }
  }, {
    query: t.Object({
      query: t.String(),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      safeSearch: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Motores de Busca'],
      summary: 'Buscar imagens no Bing',
    },
  })

  // Scraper DuckDuckGo Images
  .get('/api/scrape/duckduckgo-images', async ({ query }) => {
    try {
      const { 
        query: searchQuery, 
        page = '1', 
        limit = '20',
      } = query;

      if (!searchQuery) {
        throw new Error('Parâmetro "query" é obrigatório');
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      console.log(`[DuckDuckGo] Buscando: ${searchQuery}`);

      const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery as string)}&iax=images&ia=images`;
      
      const tokenResponse = await axios.get(tokenUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const $ = cheerio.load(tokenResponse.data);
      const images: string[] = [];

      $('img').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src && src.startsWith('http') && !src.includes('duckduckgo.com/assets')) {
          images.push(src);
        }
      });

      const start = (pageNum - 1) * limitNum;

      return {
        query: searchQuery,
        engine: 'duckduckgo',
        page: pageNum,
        limit: limitNum,
        total: images.length,
        images: images.slice(start, start + limitNum).map((url, index) => ({
          id: index + 1 + start,
          url,
          thumbnail: url,
          source: 'duckduckgo',
        })),
        pagination: {
          currentPage: pageNum,
          hasNextPage: start + limitNum < images.length,
          nextPage: pageNum + 1,
        },
      };
    } catch (error: any) {
      console.error('[DuckDuckGo] Erro:', error.message);
      throw new Error(`Erro ao fazer scraping do DuckDuckGo: ${error.message}`);
    }
  }, {
    query: t.Object({
      query: t.String(),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Motores de Busca'],
      summary: 'Buscar imagens no DuckDuckGo',
    },
  })

  // Scraper de base de conhecimento
  .get('/api/scrape/knowledge-base/:baseName', async ({ params, query }) => {
    try {
      const { baseName } = params;
      const { query: searchQuery, page = '1', limit = '20' } = query;

      if (!searchQuery) {
        throw new Error('Parâmetro "query" é obrigatório');
      }

      const baseUrl = knowledgeBases.get(baseName);
      
      if (!baseUrl) {
        throw new Error('Base de conhecimento não encontrada');
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const searchUrl = baseUrl + encodeURIComponent(searchQuery as string);
      
      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const $ = cheerio.load(response.data);
      const images: string[] = [];

      $('img').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src) {
          const fullUrl = src.startsWith('http') ? src : new URL(src, searchUrl).href;
          if (!images.includes(fullUrl)) {
            images.push(fullUrl);
          }
        }
      });

      const start = (pageNum - 1) * limitNum;
      const paginatedImages = images.slice(start, start + limitNum);

      return {
        knowledgeBase: baseName,
        query: searchQuery,
        page: pageNum,
        limit: limitNum,
        total: paginatedImages.length,
        images: paginatedImages.map((url, index) => ({
          id: index + 1 + start,
          url,
          source: baseName,
        })),
        pagination: {
          currentPage: pageNum,
          hasNextPage: start + limitNum < images.length,
          nextPage: pageNum + 1,
          totalResults: images.length,
        },
      };
    } catch (error: any) {
      throw new Error(`Erro ao fazer scraping: ${error.message}`);
    }
  }, {
    params: t.Object({
      baseName: t.String(),
    }),
    query: t.Object({
      query: t.String(),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Bases de Conhecimento'],
      summary: 'Buscar em base de conhecimento específica',
    },
  })

  // Buscar em todos os motores
  .get('/api/scrape/all-engines', async ({ query }) => {
    try {
      const { query: searchQuery, limit = '10' } = query;

      if (!searchQuery) {
        throw new Error('Parâmetro "query" é obrigatório');
      }

      const results: any = {
        query: searchQuery,
        timestamp: new Date().toISOString(),
        engines: {},
      };

      const searches = [
        axios.get(`${BASE_URL}/api/scrape/google-images?query=${encodeURIComponent(searchQuery as string)}&limit=${limit}`).catch(e => ({ data: { error: e.message } })),
        axios.get(`${BASE_URL}/api/scrape/bing-images?query=${encodeURIComponent(searchQuery as string)}&limit=${limit}`).catch(e => ({ data: { error: e.message } })),
        axios.get(`${BASE_URL}/api/scrape/duckduckgo-images?query=${encodeURIComponent(searchQuery as string)}&limit=${limit}`).catch(e => ({ data: { error: e.message } })),
      ];

      const [googleRes, bingRes, duckRes] = await Promise.all(searches);

      results.engines.google = googleRes.data;
      results.engines.bing = bingRes.data;
      results.engines.duckduckgo = duckRes.data;

      results.totalImages = 
        (googleRes.data.images?.length || 0) +
        (bingRes.data.images?.length || 0) +
        (duckRes.data.images?.length || 0);

      return results;
    } catch (error: any) {
      throw new Error(`Erro ao buscar em todos os motores: ${error.message}`);
    }
  }, {
    query: t.Object({
      query: t.String(),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Multi-Fonte'],
      summary: 'Buscar em todos os motores simultaneamente',
    },
  })

  .listen(PORT);

console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 API de Web Scraper de Imagens (Elysia)                 ║
║  📡 Servidor rodando na porta ${PORT}                         ║
╚════════════════════════════════════════════════════════════╝

📖 Documentação Swagger: ${BASE_URL}/swagger
💚 Health Check: ${BASE_URL}/api/health
🏠 Home: ${BASE_URL}/

🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}
`);