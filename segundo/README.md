# Segundo — Tu Equipo de Agentes IA

Plataforma donde cualquier empresa latinoamericana — desde una ferretería hasta una startup de software — arma su equipo de agentes IA: un manager que organiza el equipo y contrata subagentes, especialistas que ejecutan tareas en paralelo y un revisor que aprueba cada entrega. La base de conocimiento y el chat para empleados se conservan como el sustrato sobre el que trabajan los agentes.

## Stack

- **Backend**: FastAPI (async) + SQLAlchemy + pgvector + Anthropic / Ollama
- **Frontend**: React 18 + Vite + Tailwind + Zustand
- **DB**: PostgreSQL 15 + pgvector (Supabase recomendado)
- **Embeddings**: Voyage AI (con fallback mock determinístico)
- **Voz**: Groq Whisper API (opcional)

## Requisitos

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ con extensión `pgvector`
- Uno de:
  - Ollama corriendo local con `llama3.2` (default, gratis), o
  - API key de Anthropic

## Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # editar variables
alembic upgrade head
uvicorn main:app --reload         # http://localhost:8000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

## Variables de entorno (`backend/.env`)

```env
# Obligatorios
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/segundo
JWT_SECRET=<32+ caracteres>

# LLM provider — elegir uno
LLM_PROVIDER=ollama               # default — requiere Ollama local
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=sk-ant-...

# Opcionales
VOYAGE_API_KEY=pa-...             # sin esto, embeddings son un mock
GROQ_API_KEY=gsk_...              # sin esto, no funciona el botón de voz
CORS_ORIGINS=http://localhost:5173
```

## Documentación

- [`docs/README.md`](docs/README.md) — referencia completa de endpoints y arquitectura
- [`docs/seguridad/SECURITY.md`](docs/seguridad/SECURITY.md) — plan de seguridad
- [`docs/mejoras/MEJORAS.md`](docs/mejoras/MEJORAS.md) — roadmap

## Endpoints útiles

- `GET /health` — status del servicio
- `GET /docs` — Swagger interactivo
- `POST /auth/demo` body `{"role":"owner"}` — login sin registrarse para probar

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest -m "not integration"   # unitarios (rápidos, sin red)
pytest                        # suite completa — integración contra la DB del .env
```

## Deploy

- **Backend — Render**: el `render.yaml` en la raíz del repo es un Blueprint listo. En [dashboard.render.com](https://dashboard.render.com) → New → Blueprint → conectar este repo, y completar en el dashboard las variables marcadas (`DATABASE_URL`, `GROQ_API_KEY`, `VOYAGE_API_KEY`, `CORS_ORIGINS`). Requiere host persistente — el motor de misiones corre tareas `asyncio` en background que un runtime serverless mataría. Mantener **un solo worker** mientras el rate limiter viva en memoria (V3-10).
- **Frontend — Vercel**: `frontend/vercel.json` ya trae el rewrite de SPA. Configurar `VITE_API_URL` con la URL pública del backend en Render.
- Antes de producción, revisar los **bloqueantes de launch** en [`docs/seguridad/SECURITY.md`](docs/seguridad/SECURITY.md) (billing mock V3-6, `debug_code` de forgot-password).
