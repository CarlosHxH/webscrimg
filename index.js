const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.use(express.json());

// Configuração de bases de conhecimento
const knowledgeBases = new Map([
  ['wikipedia', 'https://pt.wikipedia.org/wiki/'],
  ['unsplash', 'https://unsplash.com/s/photos/'],
  ['pexels', 'https://www.pexels.com/search/'],
]);

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

// Listar bases de conhecimento
app.get('/api/knowledge-bases', (req, res) => {
  const bases = Array.from(knowledgeBases.entries()).map(([name, url]) => ({
    name,
    baseUrl: url
  }));
  res.json({ knowledgeBases: bases });
});

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

    const start = (page - 1) * limit;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&start=${start}&safe=${safeSearch}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const images = [];

    // Extrair URLs de imagens dos scripts JSON
    $('script').each((i, elem) => {
      const content = $(elem).html();
      if (content && content.includes('AF_initDataCallback')) {
        const matches = content.match(/"(https:\/\/[^"]*\.(jpg|jpeg|png|gif|webp)[^"]*)"/gi);
        if (matches) {
          matches.forEach(match => {
            const url = match.replace(/"/g, '');
            if (url.startsWith('http') && !images.includes(url) && images.length < limit) {
              images.push(url);
            }
          });
        }
      }
    });

    // Fallback: extrair de tags img
    if (images.length < limit) {
      $('img').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && src.startsWith('http') && !images.includes(src) && images.length < limit) {
          images.push(src);
        }
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
    res.status(500).json({ 
      error: 'Erro ao fazer scraping',
      message: error.message 
    });
  }
});

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

    const first = (page - 1) * limit;
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${first}&count=${limit}&safeSearch=${safeSearch}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    const $ = cheerio.load(response.data);
    const images = [];

    // Extrair de atributos m (metadata do Bing)
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

    // Fallback: extrair de tags img
    if (images.length === 0) {
      $('img.mimg').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src && src.startsWith('http')) {
          images.push({
            url: src,
            thumbnail: src,
            title: $(elem).attr('alt') || ''
          });
        }
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
    res.status(500).json({ 
      error: 'Erro ao fazer scraping do Bing',
      message: error.message 
    });
  }
});

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    knowledgeBasesCount: knowledgeBases.size
  });
});

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
app.listen(PORT, () => {
  console.log(`🚀 API de Web Scraper rodando na porta ${PORT}`);
  console.log(`\n📍 Endpoints disponíveis:\n`);
  console.log(`🔍 Motores de Busca:`);
  console.log(`   GET  ${BASE_URL}/api/scrape/google-images?query=gatos&page=1&limit=20`);
  console.log(`   GET  ${BASE_URL}/api/scrape/bing-images?query=gatos&page=1&limit=20`);
  console.log(`   GET  ${BASE_URL}/api/scrape/duckduckgo-images?query=gatos&page=1&limit=20`);
  console.log(`   GET  ${BASE_URL}/api/scrape/all-engines?query=gatos&limit=10`);
  console.log(`\n📚 Bases de Conhecimento:`);
  console.log(`   GET  ${BASE_URL}/api/scrape/knowledge-base/:baseName?query=exemplo`);
  console.log(`   GET  ${BASE_URL}/api/scrape/multi-source?query=exemplo&sources=wikipedia,unsplash`);
  console.log(`   GET  ${BASE_URL}/api/knowledge-bases`);
  console.log(`   POST ${BASE_URL}/api/knowledge-base`);
  console.log(`   DELETE ${BASE_URL}/api/knowledge-base/:name`);
  console.log(`\n💡 Suporte para: Google, Bing, DuckDuckGo + bases personalizadas`);
});

module.exports = app;