# 🔍 API de Web Scraper de Imagens

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Elysia](https://img.shields.io/badge/Elysia-Framework-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)

API moderna e performática para scraping de imagens de múltiplos motores de busca (Google, Bing, DuckDuckGo) e bases de conhecimento personalizadas. Construída com **Elysia** para máxima performance.

## ✨ Características

- 🚀 **Alta Performance** - Construída com Elysia (até 18x mais rápido que Express)
- 🔎 **Múltiplos Motores** - Google, Bing e DuckDuckGo
- 📚 **Bases Personalizadas** - Wikipedia, Unsplash, Pexels, Flickr, Pixabay e mais
- 🔄 **Busca Combinada** - Pesquise em todos os motores simultaneamente
- 📖 **Documentação Swagger** - Interface interativa completa
- 🛡️ **TypeScript** - Totalmente tipado e seguro
- 🌐 **CORS Habilitado** - Pronto para uso em qualquer aplicação
- ⚡ **Paginação** - Suporte completo para navegação de resultados

## 📋 Pré-requisitos

- **Bun** >= 1.0.0 (recomendado) ou **Node.js** >= 18.0.0
- **NPM** ou **Yarn** ou **Bun**

## 🚀 Instalação

### Usando Bun (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/web-scraper-api.git
cd web-scraper-api

# Instale as dependências
bun install

# Inicie o servidor
bun run src/index.ts
```

### Usando NPM/Yarn

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/web-scraper-api.git
cd web-scraper-api

# Instale as dependências
npm install
# ou
yarn install

# Inicie o servidor
npm run dev
# ou
yarn dev
```

## 📦 Dependências

```json
{
  "dependencies": {
    "elysia": "^1.0.0",
    "@elysiajs/swagger": "^1.0.0",
    "@elysiajs/cors": "^1.0.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
BASE_URL=http://localhost:3000
```

## 📚 Uso

### Iniciando o Servidor

```bash
bun run src/index.ts
```

O servidor iniciará em `http://localhost:3000`

### Acessando a Documentação

Acesse `http://localhost:3000/swagger` para a documentação interativa Swagger UI.

## 🛣️ Endpoints

### 🏠 Sistema

#### GET `/`
Informações gerais da API

**Resposta:**
```json
{
  "name": "API de Web Scraper de Imagens",
  "version": "1.0.0",
  "baseUrl": "http://localhost:3000",
  "documentation": "http://localhost:3000/swagger"
}
```

#### GET `/api/health`
Verificar status da API

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "knowledgeBasesCount": 5
}
```

---

### 🔍 Motores de Busca

#### GET `/api/scrape/google-images`
Buscar imagens no Google

**Parâmetros:**
- `query` (string, obrigatório) - Termo de busca
- `page` (number, opcional) - Número da página (padrão: 1)
- `limit` (number, opcional) - Resultados por página (padrão: 20)
- `safeSearch` (string, opcional) - on/off (padrão: on)

**Exemplo:**
```bash
curl "http://localhost:3000/api/scrape/google-images?query=gatos&limit=10"
```

**Resposta:**
```json
{
  "query": "gatos",
  "engine": "google",
  "page": 1,
  "limit": 10,
  "total": 10,
  "images": [
    {
      "id": 1,
      "url": "https://example.com/image1.jpg",
      "thumbnail": "https://example.com/thumb1.jpg",
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

#### GET `/api/scrape/bing-images`
Buscar imagens no Bing

**Parâmetros:**
- `query` (string, obrigatório)
- `page` (number, opcional)
- `limit` (number, opcional)
- `safeSearch` (string, opcional) - Off/Moderate/Strict

**Exemplo:**
```bash
curl "http://localhost:3000/api/scrape/bing-images?query=paisagens&limit=10"
```

#### GET `/api/scrape/duckduckgo-images`
Buscar imagens no DuckDuckGo

**Parâmetros:**
- `query` (string, obrigatório)
- `page` (number, opcional)
- `limit` (number, opcional)

**Exemplo:**
```bash
curl "http://localhost:3000/api/scrape/duckduckgo-images?query=natureza&limit=10"
```

#### GET `/api/scrape/all-engines`
Buscar em todos os motores simultaneamente

**Parâmetros:**
- `query` (string, obrigatório)
- `limit` (number, opcional) - Limite por motor

**Exemplo:**
```bash
curl "http://localhost:3000/api/scrape/all-engines?query=tecnologia&limit=5"
```

**Resposta:**
```json
{
  "query": "tecnologia",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalImages": 15,
  "engines": {
    "google": { "images": [...] },
    "bing": { "images": [...] },
    "duckduckgo": { "images": [...] }
  }
}
```

---

### 📚 Bases de Conhecimento

#### GET `/api/knowledge-bases`
Listar todas as bases de conhecimento disponíveis

**Exemplo:**
```bash
curl "http://localhost:3000/api/knowledge-bases"
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

#### POST `/api/knowledge-base`
Adicionar nova base de conhecimento

**Body:**
```json
{
  "name": "pixabay",
  "baseUrl": "https://pixabay.com/images/search/"
}
```

**Exemplo:**
```bash
curl -X POST "http://localhost:3000/api/knowledge-base" \
  -H "Content-Type: application/json" \
  -d '{"name":"pixabay","baseUrl":"https://pixabay.com/images/search/"}'
```

#### DELETE `/api/knowledge-base/:name`
Remover uma base de conhecimento

**Exemplo:**
```bash
curl -X DELETE "http://localhost:3000/api/knowledge-base/pixabay"
```

#### GET `/api/scrape/knowledge-base/:baseName`
Buscar imagens em base específica

**Parâmetros:**
- `query` (string, obrigatório)
- `page` (number, opcional)
- `limit` (number, opcional)

**Exemplo:**
```bash
curl "http://localhost:3000/api/scrape/knowledge-base/wikipedia?query=tecnologia&limit=10"
```

---

## 💡 Exemplos de Uso

### JavaScript/TypeScript

```typescript
// Buscar imagens no Google
const response = await fetch(
  'http://localhost:3000/api/scrape/google-images?query=gatos&limit=10'
);
const data = await response.json();
console.log(data.images);

// Buscar em todos os motores
const allEngines = await fetch(
  'http://localhost:3000/api/scrape/all-engines?query=paisagens&limit=5'
);
const results = await allEngines.json();
console.log(results.totalImages);
```

### Python

```python
import requests

# Buscar imagens no Bing
response = requests.get(
    'http://localhost:3000/api/scrape/bing-images',
    params={'query': 'natureza', 'limit': 10}
)
data = response.json()
print(data['images'])
```

### cURL

```bash
# Buscar no DuckDuckGo
curl "http://localhost:3000/api/scrape/duckduckgo-images?query=animais&limit=15"

# Adicionar base de conhecimento
curl -X POST "http://localhost:3000/api/knowledge-base" \
  -H "Content-Type: application/json" \
  -d '{"name":"flickr","baseUrl":"https://www.flickr.com/search/?text="}'
```

## 🐳 Docker

### Dockerfile

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - BASE_URL=http://localhost:3000
    restart: unless-stopped
```

### Executar com Docker

```bash
# Build
docker build -t web-scraper-api .

# Run
docker run -p 3000:3000 web-scraper-api

# Ou com docker-compose
docker-compose up -d
```

## ⚠️ Avisos Importantes

### Limitações de Web Scraping

- **Rate Limiting**: Motores de busca podem bloquear requisições excessivas
- **Bloqueios**: Google e Bing podem detectar e bloquear scraping
- **Legalidade**: Verifique os termos de serviço antes de usar em produção
- **APIs Oficiais**: Considere usar APIs oficiais para uso comercial

### Recomendações

Para uso em produção, considere:
- **Google**: [Custom Search API](https://developers.google.com/custom-search)
- **Bing**: [Bing Image Search API](https://www.microsoft.com/en-us/bing/apis/bing-image-search-api)
- **Unsplash**: [Unsplash API](https://unsplash.com/developers)
- **Pexels**: [Pexels API](https://www.pexels.com/api/)

## 🔒 Segurança

- Não exponha a API publicamente sem autenticação
- Implemente rate limiting para evitar abuso
- Use HTTPS em produção
- Valide e sanitize todas as entradas do usuário

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

Desenvolvido com ❤️ usando Elysia

## 📞 Suporte

- 📧 Email: support@webscraper.com
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/web-scraper-api/issues)
- 📖 Documentação: [Swagger UI](http://localhost:3000/swagger)

## 🙏 Agradecimentos

- [Elysia](https://elysiajs.com/) - Framework web moderno
- [Cheerio](https://cheerio.js.org/) - jQuery para Node.js
- [Axios](https://axios-http.com/) - Cliente HTTP

---

⭐ Se este projeto foi útil, considere dar uma estrela no GitHub!