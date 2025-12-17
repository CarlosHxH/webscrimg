# 🚀 API de Web Scraper de Imagens

API completa para scraping de imagens do Google, Bing, DuckDuckGo e bases de conhecimento personalizadas com paginação e documentação Swagger.

## 📦 Instalação

```bash
npm install express axios cheerio swagger-ui-express swagger-jsdoc cors
```

## 🎯 Iniciar o Servidor

```bash
node server.js
# ou
node index.js
```

O servidor estará disponível em `http://localhost:3000`

## 📖 Documentação

Acesse a documentação interativa do Swagger:
- **Swagger UI**: http://localhost:3000/api-docs
- **JSON Schema**: http://localhost:3000/api-docs.json
- **Informações da API**: http://localhost:3000/

## 🔍 Endpoints Disponíveis

### Motores de Busca

#### 1. Google Images
```bash
GET /api/scrape/google-images?query=gatos&page=1&limit=20&safeSearch=on
```

**Parâmetros:**
- `query` (obrigatório): Termo de busca
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Resultados por página (padrão: 20)
- `safeSearch` (opcional): `on` ou `off` (padrão: on)

**Exemplo de resposta:**
```json
{
  "query": "gatos",
  "engine": "google",
  "page": 1,
  "limit": 20,
  "total": 20,
  "images": [
    {
      "id": 1,
      "url": "https://...",
      "thumbnail": "https://...",
      "source": "google"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "hasNextPage": true,
    "nextPage": 2
  }
}
```

#### 2. Bing Images
```bash
GET /api/scrape/bing-images?query=cachorro&page=1&limit=20&safeSearch=Moderate
```

**Parâmetros:**
- `query` (obrigatório): Termo de busca
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Resultados por página (padrão: 20)
- `safeSearch` (opcional): `Off`, `Moderate`, `Strict` (padrão: Moderate)

#### 3. DuckDuckGo Images
```bash
GET /api/scrape/duckduckgo-images?query=paisagem&page=1&limit=20
```

**Parâmetros:**
- `query` (obrigatório): Termo de busca
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Resultados por página (padrão: 20)
- `safeSearch` (opcional): `on`, `moderate`, `off` (padrão: moderate)

#### 4. Buscar em Todos os Motores
```bash
GET /api/scrape/all-engines?query=natureza&limit=10
```

Retorna resultados de Google, Bing e DuckDuckGo simultaneamente.

### Bases de Conhecimento

#### 5. Listar Bases
```bash
GET /api/knowledge-bases
```

**Resposta:**
```json
{
  "knowledgeBases": [
    {
      "name": "wikipedia",
      "baseUrl": "https://pt.wikipedia.org/wiki/"
    },
    {
      "name": "unsplash",
      "baseUrl": "https://unsplash.com/s/photos/"
    }
  ]
}
```

#### 6. Adicionar Base
```bash
POST /api/knowledge-base
Content-Type: application/json

{
  "name": "pixabay",
  "baseUrl": "https://pixabay.com/images/search/"
}
```

#### 7. Remover Base
```bash
DELETE /api/knowledge-base/pixabay
```

#### 8. Buscar em Base Específica
```bash
GET /api/scrape/knowledge-base/wikipedia?query=tecnologia&page=1&limit=20
```

#### 9. Multi-Fonte
```bash
GET /api/scrape/multi-source?query=arte&sources=wikipedia,unsplash,pexels&limit=10
```

### Sistema

#### 10. Health Check
```bash
GET /api/health
```

## 🧪 Exemplos de Uso

### Com cURL

```bash
# Buscar no Google
curl "http://localhost:3000/api/scrape/google-images?query=gatos%20fofos&limit=5"

# Buscar no Bing
curl "http://localhost:3000/api/scrape/bing-images?query=cachorro&page=1&limit=10"

# Adicionar base de conhecimento
curl -X POST http://localhost:3000/api/knowledge-base \
  -H "Content-Type: application/json" \
  -d '{"name":"flickr","baseUrl":"https://www.flickr.com/search/?text="}'

# Health check
curl http://localhost:3000/api/health
```

### Com JavaScript/Fetch

```javascript
// Buscar imagens
async function searchImages(query, engine = 'google') {
  const response = await fetch(
    `http://localhost:3000/api/scrape/${engine}-images?query=${encodeURIComponent(query)}&limit=10`
  );
  const data = await response.json();
  return data;
}

// Usar
searchImages('gatinhos', 'google').then(data => {
  console.log('Imagens encontradas:', data.images.length);
  data.images.forEach(img => {
    console.log(img.url);
  });
});
```

### Com Python/Requests

```python
import requests

# Buscar imagens
response = requests.get(
    'http://localhost:3000/api/scrape/google-images',
    params={'query': 'gatos', 'limit': 10}
)

data = response.json()
print(f"Total de imagens: {data['total']}")

for img in data['images']:
    print(img['url'])
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
PORT=3000  # Porta do servidor (padrão: 3000)
```

### CORS

A API está configurada para aceitar requisições de qualquer origem:

```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH']
}));
```

## ⚠️ Limitações e Considerações

### Rate Limiting
Motores de busca podem bloquear requisições excessivas. Recomendações:
- Adicione delays entre requisições
- Use proxies rotativos para produção
- Considere APIs oficiais para uso comercial

### APIs Oficiais Recomendadas
- **Google**: [Custom Search API](https://developers.google.com/custom-search)
- **Bing**: [Bing Image Search API](https://www.microsoft.com/en-us/bing/apis/bing-image-search-api)
- **Unsplash**: [Unsplash API](https://unsplash.com/developers)

### Bloqueios
Se você receber respostas vazias ou erros:
1. Verifique os logs do console
2. Tente com diferentes User-Agents
3. Adicione delays entre requisições
4. Use proxies ou VPNs

## 🔧 Troubleshooting

### Erro: "Failed to fetch"
- Verifique se o servidor está rodando
- Confirme a URL correta (http://localhost:3000)
- Teste com cURL direto no terminal

### Nenhuma imagem retornada
- O site pode estar bloqueando scraping
- Tente outro motor de busca
- Verifique os logs do console para detalhes

### Erro de CORS
- CORS já está habilitado
- Se persistir, verifique se há firewall/proxy bloqueando

## 📝 Estrutura do Projeto

```
.
├── server.js (ou index.js)    # Arquivo principal da API
├── package.json                 # Dependências
└── README.md                    # Esta documentação
```

## 🤝 Contribuindo

1. Adicione novos motores de busca
2. Melhore os seletores de scraping
3. Adicione cache para resultados
4. Implemente rate limiting
5. Adicione autenticação

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar.

## 🎯 Roadmap

- [ ] Cache Redis para resultados
- [ ] Rate limiting por IP
- [ ] Autenticação JWT
- [ ] Suporte a mais motores (Yahoo, Yandex)
- [ ] Download automático de imagens
- [ ] Filtros avançados (tamanho, cor, tipo)
- [ ] Websocket para streaming de resultados
- [ ] Dashboard web para visualização

## 💡 Dicas de Uso

### Paginação Eficiente
```javascript
// Buscar múltiplas páginas
async function getAllPages(query, maxPages = 3) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await fetch(
      `http://localhost:3000/api/scrape/google-images?query=${query}&page=${page}&limit=20`
    ).then(r => r.json());
    results.push(...data.images);
    await new Promise(r => setTimeout(r, 2000)); // Delay de 2s
  }
  return results;
}
```

### Busca Agregada
```javascript
// Buscar em todos os motores e combinar resultados
async function aggregateSearch(query) {
  const response = await fetch(
    `http://localhost:3000/api/scrape/all-engines?query=${query}&limit=10`
  );
  const data = await response.json();
  
  const allImages = [
    ...data.engines.google.images || [],
    ...data.engines.bing.images || [],
    ...data.engines.duckduckgo.images || []
  ];
  
  return allImages;
}
```

## 📧 Suporte

Para questões e sugestões, abra uma issue no repositório ou entre em contato.

---

**Desenvolvido com ❤️ usando Node.js, Express e Cheerio**