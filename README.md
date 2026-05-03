# Aukén Sistema — Agencia de Automatización IA

Sistema completo de atención automática para negocios locales chilenos.

## Stack
- React 18 + Vite
- React Router DOM v6
- Claude API (Anthropic) como cerebro del chatbot
- Estilos 100% inline (sin Tailwind ni CSS externo)

## Instalación

```bash
npm install
cp .env.example .env
# Edita .env y agrega tu API key de Anthropic
npm run dev
```

## Rutas

| Ruta | Módulo |
|------|--------|
| `/` | Aukén OS — App Shell principal |
| `/landing` | Landing genérica 5 nichos |
| `/dashboard` | Dashboard agencia |
| `/widget` | Widget chatbot con Claude API |
| `/optica` | Sistema óptica completo |
| `/optica/landing` | Landing de venta ópticas |
| `/optica/dashboard` | Dashboard especializado ópticas |
| `/integrations` | Panel n8n + WhatsApp |

## Deploy en Vercel

```bash
npm install -g vercel
vercel env add VITE_ANTHROPIC_API_KEY
vercel --prod
```

## Obtener API Key

1. Ir a https://console.anthropic.com/settings/keys
2. Create Key → copiar
3. Pegar en .env como VITE_ANTHROPIC_API_KEY=sk-ant-...

---
Construido desde el bosque. Santiago, Chile.
# auken-sistema
