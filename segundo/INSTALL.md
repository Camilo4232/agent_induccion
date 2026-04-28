# Guía de instalación y configuración — Segundo

Guía completa para levantar Segundo en una PC nueva, configurar el modelo de IA y resolver problemas comunes.

---

## 1. Modelo de IA

Segundo soporta **dos proveedores de LLM** y se cambia con una sola variable de entorno.

| Proveedor | Variable | Costo | Calidad | Requisitos |
|---|---|---|---|---|
| **Ollama** (default) | `LLM_PROVIDER=ollama` | Gratis | Media | Servidor Ollama local + modelo descargado |
| **Claude** (Anthropic) | `LLM_PROVIDER=claude` | Pago | Alta | API key de Anthropic |

### Modelos por defecto

- **Ollama** → `llama3.2` (definido en `backend/app/services/claude.py`)
- **Claude** → `claude-sonnet-4-6` (definido en `backend/app/services/claude.py`)

### Cambiar el modelo de Ollama

Si quieres usar otro modelo (por ejemplo `llama3.1`, `mistral`, `qwen2.5`), edita la constante en `backend/app/services/claude.py`:

```python
OLLAMA_MODEL = "llama3.2"   # cambia aquí
```

Luego descárgalo con `ollama pull <modelo>`.

### Cambiar entre proveedores

Solo edita el `.env` del backend y reinicia uvicorn:

```env
# Para Ollama (gratis)
LLM_PROVIDER=ollama

# Para Claude (pago, mejor calidad)
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

> **Nota técnica**: el código está diseñado para ser provider-agnostic. Todos los agentes llaman a `app.services.claude.complete()` que despacha al provider activo. Cambiar de provider **no requiere modificar agentes ni endpoints**.

---

## 2. Requisitos del sistema

### Software base (todos los casos)

| Software | Versión mínima | Link |
|---|---|---|
| Python | 3.11+ | https://www.python.org/downloads/ |
| Node.js | 20 LTS | https://nodejs.org/ |
| Git | cualquiera reciente | https://git-scm.com/ |

> No necesitas instalar PostgreSQL local: Segundo usa Supabase (gestionado en la nube).

### Si vas a usar Ollama (default)

| Software | Para qué |
|---|---|
| [Ollama](https://ollama.com/) | Servidor local de LLMs |
| Modelo `llama3.2` | `ollama pull llama3.2` (~2 GB) |

### Si vas a usar Claude

- Una **API key de Anthropic** ([console.anthropic.com](https://console.anthropic.com/))

### Servicios opcionales

| Servicio | Si lo activas |
|---|---|
| **Voyage AI** ([voyageai.com](https://voyageai.com)) | Embeddings reales (mejor búsqueda semántica) |
| **Groq** ([console.groq.com](https://console.groq.com/)) | Transcripción de voz (botón de micrófono) |

---

## 3. Instalación paso a paso

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/Camilo4232/agent_induccion.git
cd agent_induccion/segundo
```

### Paso 2 — Base de datos (Supabase)

Segundo usa **Supabase** como base de datos gestionada (Postgres + pgvector en la nube). **No instalas Postgres local** — la DB vive en los servidores de Supabase y todas las PCs se conectan a la misma.

#### Si el proyecto Supabase ya existe

Caso típico cuando se agrega una nueva PC al equipo:

1. Pide la connection string al admin del proyecto, o cópiala desde **Project Settings → Database → Connection pooling → Transaction**.
2. Pégala en `backend/.env` cambiando el prefijo `postgresql://` por `postgresql+asyncpg://`:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.xxx:password@aws-0-us-east-2.pooler.supabase.com:6543/postgres
   ```
3. **No corras `alembic upgrade head`** — las tablas ya existen. Salta directo a `uvicorn` en el paso 3.

> **Si el proyecto está pausado** (el plan free se pausa tras 7 días sin uso), entra al dashboard de Supabase y haz clic en **"Restore project"**. Tarda 1-2 minutos.

#### Si arrancas desde cero (proyecto Supabase nuevo)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. SQL editor → `CREATE EXTENSION IF NOT EXISTS vector;`
3. Copia la connection string como en el caso anterior.
4. **Esta vez sí** ejecuta `alembic upgrade head` después de configurar el `.env` — crea las 12 tablas.

### Paso 3 — Backend

```bash
cd backend

# Crear virtualenv
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar y editar .env
cp .env.example .env
# editar .env con tus credenciales

# Levantar el servidor
uvicorn main:app --reload
```

API disponible en `http://localhost:8000`. Documentación interactiva en `http://localhost:8000/docs`.

### Paso 4 — Frontend

```bash
cd ../frontend

# Crear el .env apuntando al backend
echo "VITE_API_URL=http://localhost:8000" > .env

# Instalar y levantar
npm install
npm run dev
```

Aplicación disponible en `http://localhost:5173`.

### Paso 5 — Si elegiste Ollama

```bash
# En otra terminal (Ollama corre como servicio)
ollama serve

# Descargar el modelo
ollama pull llama3.2
```

Verifica que Ollama está corriendo: `curl http://localhost:11434/api/tags`

---

## 4. Configuración mínima del `.env`

### Setup gratis (Ollama + mock embeddings)

```env
DATABASE_URL=postgresql+asyncpg://postgres.xxx:password@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=usar-secrets-token-urlsafe-de-48-caracteres-aqui-min
LLM_PROVIDER=ollama
CORS_ORIGINS=http://localhost:5173
```

> Funciona, pero los embeddings son un mock determinístico — la búsqueda semántica es pobre. Sirve para desarrollo y pruebas.

### Setup recomendado (Claude + Voyage + Groq)

```env
DATABASE_URL=postgresql+asyncpg://postgres.xxx:password@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=usar-secrets-token-urlsafe-de-48-caracteres-aqui-min
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
GROQ_API_KEY=gsk_...
CORS_ORIGINS=http://localhost:5173
```

### Generar `JWT_SECRET`

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## 5. Arquitectura

```
Frontend (Vite/React :5173)
    │
    │ HTTP + JWT
    ▼
Backend FastAPI (:8000)
    │
    ├── /auth, /teach, /ask, /knowledge, /transcribe, ...
    │
    ├── agents/
    │   ├── orchestrator   ← decide qué sub-agentes llamar (tool use)
    │   ├── sub_agents     ← ventas / operaciones / clientes / general
    │   ├── memory_agent   ← extrae hechos del owner
    │   └── consistency    ← detecta conflictos
    │
    └── services/
        ├── claude.py      ← switch Ollama / Claude
        └── embeddings.py  ← Voyage / mock

Supabase (Postgres + pgvector)  ← almacena hechos + embeddings 1536-d
```

Detalles completos en [`docs/README.md`](docs/README.md).

---

## 6. Comandos útiles

```bash
# Ver Swagger / probar endpoints
http://localhost:8000/docs

# Health check
curl http://localhost:8000/health

# Login demo (sin registrarse)
curl -X POST http://localhost:8000/auth/demo \
  -H "Content-Type: application/json" \
  -d '{"role":"owner"}'

# Ver modelo de Ollama activo
curl http://localhost:11434/api/tags

# Limpiar cache de embeddings
curl -X POST http://localhost:8000/admin/clear-cache
```

---

## 7. Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| `ModuleNotFoundError: No module named 'fastapi'` | venv no activado | `source venv/bin/activate` |
| `ModuleNotFoundError: No module named 'anthropic'` | Falta dependencia | `pip install -r requirements.txt` |
| `extension "vector" does not exist` | pgvector no instalado en la DB | `CREATE EXTENSION vector;` en SQL editor de Supabase |
| `JWT_SECRET debe tener al menos 32 caracteres` | Validación de config | Generar con `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `Connection refused` al hacer `/ask` con Ollama | Ollama no está corriendo | `ollama serve` en otra terminal |
| `model 'llama3.2' not found` | Modelo no descargado | `ollama pull llama3.2` |
| `401 Unauthorized` en `/ask` | JWT expirado | Hacer login de nuevo en el frontend |
| `psycopg2` falla al instalar (Linux/Mac) | Falta `libpq-dev` | Linux: `sudo apt install libpq-dev` · Mac: `brew install postgresql` |
| Búsqueda semántica devuelve cualquier cosa | Estás usando mock embeddings | Configurar `VOYAGE_API_KEY` |
| Botón de voz no transcribe | Falta `GROQ_API_KEY` | Configurar la key en `.env` |
| `RateLimitExceeded` en `/ask` | Pasaste el límite (10/min default) | Esperar 1 minuto o subir `ASK_RATE_LIMIT` |
| CORS error en navegador | Origen del frontend no listado | Agregar URL a `CORS_ORIGINS` (separar con coma) |
| `No se pudo iniciar el modo demo` en el frontend | `VITE_API_URL` apunta al puerto incorrecto | Verificar que `frontend/.env` tenga `VITE_API_URL=http://localhost:8000` |
| Proyecto Supabase pausado | Inactividad > 7 días en plan free | Restaurar desde dashboard de Supabase |

---

## 8. Estructura del repositorio

```
segundo/
├── README.md             ← overview corto
├── INSTALL.md            ← este archivo
├── docs/                 ← documentación detallada (endpoints, security, mejoras)
├── backend/
│   ├── main.py           ← FastAPI app
│   ├── requirements.txt
│   ├── alembic/          ← migraciones
│   └── app/
│       ├── core/         ← config + JWT
│       ├── db/           ← modelos + schemas
│       ├── services/     ← claude.py (switch LLM), embeddings.py
│       ├── agents/       ← orchestrator + sub-agents
│       └── api/          ← routers HTTP
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── pages/        ← Login, Register, OwnerDashboard, EmployeeChat
        ├── components/   ← ChatInput, VoiceButton, KnowledgeCard, ...
        ├── services/     ← api.js (axios + auto-refresh JWT)
        └── store/        ← Zustand (auth)
```

---

## 9. Deployment

- **Frontend** → Vercel: `vercel --prod` desde `segundo/frontend/`
- **Backend** → cualquier host con Python (Render, Fly.io, Railway, VPS). Necesita Postgres con pgvector.
- **DB** → Supabase es la opción más rápida (pgvector ya viene).

> Si despliegas Ollama en producción, necesitas una VM con suficiente RAM (mínimo 8 GB para `llama3.2`). Para producción real, **se recomienda Claude** por velocidad y calidad.
