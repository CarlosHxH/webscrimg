const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Web Scraper de Imagens',
      version: '1.0.0',
      description: 'API para scraping de imagens do Google, Bing, DuckDuckGo e bases de conhecimento personalizadas',
      contact: {
        name: 'API Support',
        email: 'support@webscraper.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://q00cc84kgc4o0o0skcw4cgwg.37.27.45.54.sslip.io',
        description: 'Servidor de Produção'
      },
      {
        url: 'https://q00cc84kgc4o0o0skcw4cgwg.37.27.45.54.sslip.io',
        description: 'Servidor de Produção (HTTPS)'
      },
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local'
      }
    ],
    tags: [
      {
        name: 'Motores de Busca',
        description: 'Endpoints para scraping de imagens em motores de busca'
      },
      {
        name: 'Bases de Conhecimento',
        description: 'Gerenciamento de bases de conhecimento personalizadas'
      },
      {
        name: 'Multi-Fonte',
        description: 'Busca combinada em múltiplas fontes'
      },
      {
        name: 'Sistema',
        description: 'Endpoints de sistema e monitoramento'
      }
    ]
  },
  apis: ['./server.js', './index.js', './*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuração customizada do Swagger UI
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Web Scraper - Documentação',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3
  }
};

// Rota do Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Rota para obter o JSON do Swagger
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Configuração de bases de conhecimento
const knowledgeBases = new Map([
  ['wikipedia', 'https://pt.wikipedia.org/wiki/'],
  ['unsplash', 'https://unsplash.com/s/photos/'],
  ['pexels', 'https://www.pexels.com/search/'],
]);

/**
 * @swagger
 * components:
 *   schemas:
 *     Image:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único da imagem
 *         url:
 *           type: string
 *           description: URL completa da imagem
 *         thumbnail:
 *           type: string
 *           description: URL da miniatura
 *         title:
 *           type: string
 *           description: Título ou descrição da imagem
 *         width:
 *           type: integer
 *           description: Largura da imagem em pixels
 *         height:
 *           type: integer
 *           description: Altura da imagem em pixels
 *         source:
 *           type: string
 *           description: Fonte da imagem (google, bing, duckduckgo, etc)
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: integer
 *         hasNextPage:
 *           type: boolean
 *         nextPage:
 *           type: integer
 *         totalResults:
 *           type: integer
 *     
 *     KnowledgeBase:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nome da base de conhecimento
 *         baseUrl:
 *           type: string
 *           description: URL base da fonte
 *       required:
 *         - name
 *         - baseUrl
 *     
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/knowledge-base:
 *   post:
 *     summary: Adicionar nova base de conhecimento
 *     tags: [Bases de Conhecimento]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KnowledgeBase'
 *           example:
 *             name: "pixabay"
 *             baseUrl: "https://pixabay.com/images/search/"
 *     responses:
 *       200:
 *         description: Base de conhecimento adicionada com sucesso
 *       400:
 *         description: Dados inválidos
 */
// Adicionar nova base de conhecimento
app.post('/api/knowledge-base', (req, res) => {
  const { name, baseUrl } = req.body;
  
  if (!name || !baseUrl) {
    return res.status(400).json({ 
      error: 'Nome e URL base são obrigatórios' 
    });
  }
  
  knowledgeBases.set(name, baseUrl);
  res.json({ 
    message: 'Base de conhecimento adicionada',
    name,
    baseUrl 
  });
});

/**
 * @swagger
 * /api/knowledge-bases:
 *   get:
 *     summary: Listar todas as bases de conhecimento
 *     tags: [Bases de Conhecimento]
 *     responses:
 *       200:
 *         description: Lista de bases de conhecimento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 knowledgeBases:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/KnowledgeBase'
 */
// Listar bases de conhecimento
app.get('/api/knowledge-bases', (req, res) => {
  const bases = Array.from(knowledgeBases.entries()).map(([name, url]) => ({
    name,
    baseUrl: url
  }));
  res.json({ knowledgeBases: bases });
});

/**
 * @swagger
 * /api/scrape/google-images:
 *   get:
 *     summary: Buscar imagens no Google
 *     tags: [Motores de Busca]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *         example: "gatos fofos"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Quantidade de resultados por página
 *       - in: query
 *         name: safeSearch
 *         schema:
 *           type: string
 *           enum: [on, off]
 *           default: on
 *         description: Filtro de conteúdo seguro
 *     responses:
 *       200:
 *         description: Lista de imagens encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 engine:
 *                   type: string
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 images:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Image'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro no servidor
 */
// Scraper de imagens do Google
app.get('/api/scrape/google-images', async (req, res) => {
  try {
    const { 
      query, 
      page = 1, 
      limit = 20,
      safeSearch = 'on',
      imageSize = 'medium'
    } = req.query;

    if (!query) {
      return res.status(400).json({ 
        error: 'Parâmetro "query" é obrigatório' 
      });
    }

    console.log(`[Google] Buscando: ${query}, página: ${page}, limit: ${limit}`);

    const start = (page - 1) * limit;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&start=${start}&safe=${safeSearch}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });

    console.log(`[Google] Status da resposta: ${response.status}`);

    const $ = cheerio.load(response.data);
    const images = [];

    // Método 1: Extrair URLs de imagens dos scripts JSON
    $('script').each((i, elem) => {
      const content = $(elem).html();
      if (content && content.includes('AF_initDataCallback')) {
        const matches = content.match(/"(https?:\/\/[^"]*\.(jpg|jpeg|png|gif|webp)[^"]*)"/gi);
        if (matches) {
          matches.forEach(match => {
            const url = match.replace(/"/g, '');
            if (url.startsWith('http') && !images.includes(url) && images.length < limit * 2) {
              images.push(url);
            }
          });
        }
      }
    });

    // Método 2: Extrair de data attributes
    if (images.length < limit) {
      $('img[data-src]').each((i, elem) => {
        const src = $(elem).attr('data-src');
        if (src && src.startsWith('http') && !images.includes(src)) {
          images.push(src);
        }
      });
    }

    // Método 3: Fallback - extrair de tags img
    if (images.length < limit) {
      $('img').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && src.startsWith('http') && !images.includes(src) && !src.includes('logo')) {
          images.push(src);
        }
      });
    }

    console.log(`[Google] Imagens encontradas: ${images.length}`);

    // Se não encontrou imagens suficientes
    if (images.length === 0) {
      return res.json({
        query,
        engine: 'google',
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        images: [],
        pagination: {
          currentPage: parseInt(page),
          hasNextPage: false,
          nextPage: parseInt(page) + 1
        },
        warning: 'Nenhuma imagem encontrada. O Google pode estar bloqueando o scraping. Considere usar a API oficial do Google Custom Search.'
      });
    }

    res.json({
      query,
      engine: 'google',
      page: parseInt(page),
      limit: parseInt(limit),
      total: images.length,
      images: images.slice(0, limit).map((url, index) => ({
        id: index + 1 + start,
        url,
        thumbnail: url,
        source: 'google'
      })),
      pagination: {
        currentPage: parseInt(page),
        hasNextPage: images.length >= limit,
        nextPage: parseInt(page) + 1
      }
    });

  } catch (error) {
    console.error('[Google] Erro:', error.message);
    res.status(500).json({ 
      error: 'Erro ao fazer scraping do Google',
      message: error.message,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText
      } : null
    });
  }
});

/**
 * @swagger
 * /api/scrape/bing-images:
 *   get:
 *     summary: Buscar imagens no Bing
 *     tags: [Motores de Busca]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: safeSearch
 *         schema:
 *           type: string
 *           enum: [Off, Moderate, Strict]
 *           default: Moderate
 *     responses:
 *       200:
 *         description: Lista de imagens do Bing
 *       400:
 *         description: Parâmetros inválidos
 */
// Scraper de imagens do Bing
app.get('/api/scrape/bing-images', async (req, res) => {
  try {
    const { 
      query, 
      page = 1, 
      limit = 20,
      safeSearch = 'Moderate',
      imageSize = 'Medium'
    } = req.query;

    if (!query) {
      return res.status(400).json({ 
        error: 'Parâmetro "query" é obrigatório' 
      });
    }

    console.log(`[Bing] Buscando: ${query}, página: ${page}, limit: ${limit}`);

    const first = (page - 1) * limit;
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${first}&count=${limit}&safeSearch=${safeSearch}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    console.log(`[Bing] Status da resposta: ${response.status}`);

    const $ = cheerio.load(response.data);
    const images = [];

    // Método 1: Extrair de atributos m (metadata do Bing)
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
              height: metadata.h || 0
            });
          }
        } catch (e) {
          // Ignorar erros de parse
        }
      }
    });

    // Método 2: Extrair de data attributes
    if (images.length === 0) {
      $('.imgpt').each((i, elem) => {
        const parent = $(elem).parent();
        const img = $(elem).find('img');
        const dataUrl = parent.attr('href') || img.attr('src');
        
        if (dataUrl) {
          images.push({
            url: dataUrl,
            thumbnail: img.attr('src') || dataUrl,
            title: img.attr('alt') || ''
          });
        }
      });
    }

    // Método 3: Fallback - extrair de tags img
    if (images.length === 0) {
      $('img').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src && src.startsWith('http') && !src.includes('bing.com/th')) {
          images.push({
            url: src,
            thumbnail: src,
            title: $(elem).attr('alt') || ''
          });
        }
      });
    }

    console.log(`[Bing] Imagens encontradas: ${images.length}`);

    // Se não encontrou imagens, retornar dados de exemplo para teste
    if (images.length === 0) {
      console.log('[Bing] Nenhuma imagem encontrada, retornando resposta vazia');
      return res.json({
        query,
        engine: 'bing',
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        images: [],
        pagination: {
          currentPage: parseInt(page),
          hasNextPage: false,
          nextPage: parseInt(page) + 1
        },
        warning: 'Nenhuma imagem encontrada. O Bing pode estar bloqueando o scraping. Considere usar a API oficial do Bing.'
      });
    }

    res.json({
      query,
      engine: 'bing',
      page: parseInt(page),
      limit: parseInt(limit),
      total: images.length,
      images: images.slice(0, limit).map((img, index) => ({
        id: index + 1 + first,
        url: img.url,
        thumbnail: img.thumbnail,
        title: img.title,
        width: img.width,
        height: img.height,
        source: 'bing'
      })),
      pagination: {
        currentPage: parseInt(page),
        hasNextPage: images.length >= limit,
        nextPage: parseInt(page) + 1
      }
    });

  } catch (error) {
    console.error('[Bing] Erro:', error.message);
    res.status(500).json({ 
      error: 'Erro ao fazer scraping do Bing',
      message: error.message,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText
      } : null
    });
  }
});

/**
 * @swagger
 * /api/scrape/duckduckgo-images:
 *   get:
 *     summary: Buscar imagens no DuckDuckGo
 *     tags: [Motores de Busca]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: safeSearch
 *         schema:
 *           type: string
 *           enum: [on, moderate, off]
 *           default: moderate
 *     responses:
 *       200:
 *         description: Lista de imagens do DuckDuckGo
 */
// Scraper de imagens do DuckDuckGo
app.get('/api/scrape/duckduckgo-images', async (req, res) => {
  try {
    const { 
      query, 
      page = 1, 
      limit = 20,
      safeSearch = 'moderate'
    } = req.query;

    if (!query) {
      return res.status(400).json({ 
        error: 'Parâmetro "query" é obrigatório' 
      });
    }

    // DuckDuckGo usa vqd token para busca de imagens
    // Primeiro, obter o token vqd
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    
    const tokenResponse = await axios.get(tokenUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // Extrair vqd token
    const vqdMatch = tokenResponse.data.match(/vqd=['"]([^'"]+)['"]/);
    const vqd = vqdMatch ? vqdMatch[1] : '';

    if (!vqd) {
      // Fallback: scraping HTML direto
      const $ = cheerio.load(tokenResponse.data);
      const images = [];

      $('img').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src && src.startsWith('http') && !src.includes('duckduckgo.com/assets')) {
          images.push({
            url: src,
            thumbnail: src,
            title: $(elem).attr('alt') || ''
          });
        }
      });

      const start = (page - 1) * limit;
      return res.json({
        query,
        engine: 'duckduckgo',
        page: parseInt(page),
        limit: parseInt(limit),
        total: images.length,
        images: images.slice(start, start + limit).map((img, index) => ({
          id: index + 1 + start,
          url: img.url,
          thumbnail: img.thumbnail,
          title: img.title,
          source: 'duckduckgo'
        })),
        pagination: {
          currentPage: parseInt(page),
          hasNextPage: start + limit < images.length,
          nextPage: parseInt(page) + 1
        }
      });
    }

    // Usar API do DuckDuckGo com vqd token
    const offset = (page - 1) * limit;
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=${safeSearch === 'off' ? '-1' : '1'}&s=${offset}`;

    const apiResponse = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });

    const results = apiResponse.data.results || [];
    
    res.json({
      query,
      engine: 'duckduckgo',
      page: parseInt(page),
      limit: parseInt(limit),
      total: results.length,
      images: results.slice(0, limit).map((img, index) => ({
        id: index + 1 + offset,
        url: img.image,
        thumbnail: img.thumbnail,
        title: img.title,
        width: img.width,
        height: img.height,
        source: 'duckduckgo'
      })),
      pagination: {
        currentPage: parseInt(page),
        hasNextPage: results.length >= limit,
        nextPage: parseInt(page) + 1
      }
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao fazer scraping do DuckDuckGo',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/scrape/knowledge-base/{baseName}:
 *   get:
 *     summary: Buscar imagens em uma base de conhecimento específica
 *     tags: [Bases de Conhecimento]
 *     parameters:
 *       - in: path
 *         name: baseName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da base de conhecimento
 *         example: "wikipedia"
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Imagens da base de conhecimento
 *       404:
 *         description: Base de conhecimento não encontrada
 */
// Scraper de base de conhecimento específica
app.get('/api/scrape/knowledge-base/:baseName', async (req, res) => {
  try {
    const { baseName } = req.params;
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ 
        error: 'Parâmetro "query" é obrigatório' 
      });
    }

    const baseUrl = knowledgeBases.get(baseName);
    
    if (!baseUrl) {
      return res.status(404).json({ 
        error: 'Base de conhecimento não encontrada' 
      });
    }

    const searchUrl = baseUrl + encodeURIComponent(query);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const images = [];

    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : new URL(src, searchUrl).href;
        if (!images.includes(fullUrl)) {
          images.push(fullUrl);
        }
      }
    });

    const start = (page - 1) * limit;
    const paginatedImages = images.slice(start, start + limit);

    res.json({
      knowledgeBase: baseName,
      query,
      page: parseInt(page),
      limit: parseInt(limit),
      total: paginatedImages.length,
      images: paginatedImages.map((url, index) => ({
        id: index + 1 + start,
        url,
        source: baseName
      })),
      pagination: {
        currentPage: parseInt(page),
        hasNextPage: start + limit < images.length,
        nextPage: parseInt(page) + 1,
        totalResults: images.length
      }
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao fazer scraping da base de conhecimento',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/scrape/all-engines:
 *   get:
 *     summary: Buscar imagens em todos os motores simultaneamente
 *     tags: [Multi-Fonte]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *         example: "paisagens"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Limite de resultados por motor
 *     responses:
 *       200:
 *         description: Resultados agregados de todos os motores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 totalImages:
 *                   type: integer
 *                 engines:
 *                   type: object
 *                   properties:
 *                     google:
 *                       type: object
 *                     bing:
 *                       type: object
 *                     duckduckgo:
 *                       type: object
 */
// Scraper unificado - busca em todos os motores
app.get('/api/scrape/all-engines', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ 
        error: 'Parâmetro "query" é obrigatório' 
      });
    }

    const results = {
      query,
      timestamp: new Date().toISOString(),
      engines: {}
    };

    // Buscar em paralelo em todos os motores
    const searches = [
      axios.get(`http://localhost:${PORT}/api/scrape/google-images?query=${encodeURIComponent(query)}&limit=${limit}`).catch(e => ({ data: { error: e.message } })),
      axios.get(`http://localhost:${PORT}/api/scrape/bing-images?query=${encodeURIComponent(query)}&limit=${limit}`).catch(e => ({ data: { error: e.message } })),
      axios.get(`http://localhost:${PORT}/api/scrape/duckduckgo-images?query=${encodeURIComponent(query)}&limit=${limit}`).catch(e => ({ data: { error: e.message } }))
    ];

    const [googleRes, bingRes, duckRes] = await Promise.all(searches);

    results.engines.google = googleRes.data;
    results.engines.bing = bingRes.data;
    results.engines.duckduckgo = duckRes.data;

    // Contar total de imagens encontradas
    results.totalImages = 
      (googleRes.data.images?.length || 0) +
      (bingRes.data.images?.length || 0) +
      (duckRes.data.images?.length || 0);

    res.json(results);

  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar em todos os motores',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/scrape/multi-source:
 *   get:
 *     summary: Buscar em múltiplas fontes personalizadas
 *     tags: [Multi-Fonte]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: sources
 *         schema:
 *           type: string
 *           default: "google"
 *         description: Fontes separadas por vírgula
 *         example: "wikipedia,unsplash,pexels"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Resultados de múltiplas fontes
 */
// Scraper multi-fonte
app.get('/api/scrape/multi-source', async (req, res) => {
  try {
    const { query, sources = 'google', limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ 
        error: 'Parâmetro "query" é obrigatório' 
      });
    }

    const sourcesArray = sources.split(',');
    const results = {};

    for (const source of sourcesArray) {
      if (source === 'google' || source === 'bing' || source === 'duckduckgo') {
        results[source] = { message: `Use /api/scrape/${source}-images` };
      } else if (knowledgeBases.has(source)) {
        // Buscar na base de conhecimento
        try {
          const baseUrl = knowledgeBases.get(source);
          const searchUrl = baseUrl + encodeURIComponent(query);
          
          const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
          });

          const $ = cheerio.load(response.data);
          const images = [];

          $('img').each((i, elem) => {
            if (images.length >= limit) return;
            const src = $(elem).attr('src') || $(elem).attr('data-src');
            if (src) {
              const fullUrl = src.startsWith('http') ? src : new URL(src, searchUrl).href;
              images.push(fullUrl);
            }
          });

          results[source] = images.slice(0, limit);
        } catch (err) {
          results[source] = { error: err.message };
        }
      }
    }

    res.json({
      query,
      sources: sourcesArray,
      results
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao fazer scraping multi-fonte',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/knowledge-base/{name}:
 *   delete:
 *     summary: Remover uma base de conhecimento
 *     tags: [Bases de Conhecimento]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da base a ser removida
 *     responses:
 *       200:
 *         description: Base removida com sucesso
 *       404:
 *         description: Base não encontrada
 */
// Remover base de conhecimento
app.delete('/api/knowledge-base/:name', (req, res) => {
  const { name } = req.params;
  
  if (knowledgeBases.has(name)) {
    knowledgeBases.delete(name);
    res.json({ 
      message: 'Base de conhecimento removida',
      name 
    });
  } else {
    res.status(404).json({ 
      error: 'Base de conhecimento não encontrada' 
    });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verificar status da API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Status da API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 knowledgeBasesCount:
 *                   type: integer
 */
// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    knowledgeBasesCount: knowledgeBases.size
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Página inicial da API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Informações básicas da API
 */
// Rota raiz
app.get('/', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;
  
  res.json({
    name: 'API de Web Scraper de Imagens',
    version: '1.0.0',
    description: 'API para scraping de imagens do Google, Bing, DuckDuckGo e bases personalizadas',
    baseUrl: baseUrl,
    documentation: `${baseUrl}/api-docs`,
    endpoints: {
      search_engines: [
        `${baseUrl}/api/scrape/google-images`,
        `${baseUrl}/api/scrape/bing-images`,
        `${baseUrl}/api/scrape/duckduckgo-images`,
        `${baseUrl}/api/scrape/all-engines`
      ],
      knowledge_bases: [
        `${baseUrl}/api/knowledge-bases`,
        `${baseUrl}/api/knowledge-base`,
        `${baseUrl}/api/scrape/knowledge-base/:baseName`,
        `${baseUrl}/api/scrape/multi-source`
      ],
      system: [
        `${baseUrl}/api/health`
      ]
    },
    usage_examples: [
      {
        description: 'Buscar imagens no Google',
        url: `${baseUrl}/api/scrape/google-images?query=gatos&limit=10`
      },
      {
        description: 'Buscar em todos os motores',
        url: `${baseUrl}/api/scrape/all-engines?query=natureza&limit=5`
      },
      {
        description: 'Listar bases de conhecimento',
        url: `${baseUrl}/api/knowledge-bases`
      }
    ]
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const isDocker = process.env.DOCKER_CONTAINER === 'true' || process.env.KUBERNETES_SERVICE_HOST;
  const publicUrl = process.env.PUBLIC_URL || 'http://q00cc84kgc4o0o0skcw4cgwg.37.27.45.54.sslip.io';
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 API de Web Scraper de Imagens                          ║
║  📡 Servidor rodando na porta ${PORT}                         ║
╚════════════════════════════════════════════════════════════╝

${isDocker ? '🐳 Ambiente: Docker/Container' : '💻 Ambiente: Local'}

📖 Documentação Swagger: ${publicUrl}/api-docs
📄 JSON da API: ${publicUrl}/api-docs.json
💚 Health Check: ${publicUrl}/api/health
🏠 Home: ${publicUrl}/

📍 Endpoints Disponíveis:

🔍 MOTORES DE BUSCA:
   GET ${publicUrl}/api/scrape/google-images?query=gato&limit=10
   GET ${publicUrl}/api/scrape/bing-images?query=gato&limit=10
   GET ${publicUrl}/api/scrape/duckduckgo-images?query=gato&limit=10
   GET ${publicUrl}/api/scrape/all-engines?query=gato&limit=5

📚 BASES DE CONHECIMENTO:
   GET    ${publicUrl}/api/knowledge-bases
   POST   ${publicUrl}/api/knowledge-base
   DELETE ${publicUrl}/api/knowledge-base/:name
   GET    ${publicUrl}/api/scrape/knowledge-base/:baseName?query=tech
   GET    ${publicUrl}/api/scrape/multi-source?query=tech&sources=wikipedia

🔧 Teste rápido:
   curl ${publicUrl}/api/health

💡 CORS habilitado | Suporte: Google, Bing, DuckDuckGo + bases personalizadas
  `);
});

module.exports = app;