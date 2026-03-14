# Segundo — Guía de Setup y Tecnologías

## Requisitos del sistema

Antes de correr el proyecto, necesitas tener instalado:

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| Python | 3.10+ | Backend (FastAPI) |
| Node.js | 18+ | Frontend (React + Vite) |
| npm | 9+ | Gestión de paquetes frontend |
| Git | cualquier | Clonar el repo |
| PostgreSQL | 15+ | Base de datos (o usar Supabase) |

> Si usas Supabase como base de datos (recomendado para empezar rápido), **no necesitas instalar PostgreSQL localmente**. El proyecto ya está configurado para conectarse a Supabase.

---

## Verificar que tienes todo

```bash
python --version    # debe ser 3.10+
node --version      # debe ser 18+
npm --version       # debe ser 9+
git --version
```

---

## Cómo instalar lo que te falte

### Python 3.10+
- **Windows**: Descargar desde [python.org/downloads](https://www.python.org/downloads/). Marcar la opción "Add Python to PATH" al instalar.
- **Mac**: `brew install python@3.12` (requiere Homebrew)
- **Linux**: `sudo apt install python3.12 python3.12-venv` (Ubuntu/Debian)

### Node.js 18+
- **Todos los sistemas**: Descargar desde [nodejs.org](https://nodejs.org/) (versión LTS recomendada)
- **Alternativa con nvm**: `nvm install 20 && nvm use 20`

### Git
- **Windows**: Descargar desde [git-scm.com](https://git-scm.com/)
- **Mac**: `brew install git`
- **Linux**: `sudo apt install git`

---

## Variables de entorno

### Backend — `segundo/backend/.env`

Copia el archivo de ejemplo y completa los valores:

```bash
cp segundo/backend/.env.example segundo/backend/.env
```

| Variable | Requerida | Valor de ejemplo | Para qué |
|---|---|---|---|
| `DATABASE_URL` | Sí | `postgresql+asyncpg://user:pass@host:5432/db` | Conexión a PostgreSQL |
| `ANTHROPIC_API_KEY` | Sí | `sk-ant-api03-...` | LLM (Claude) — obtener en console.anthropic.com |
| `JWT_SECRET` | Sí | cualquier string largo y aleatorio | Firmar tokens de sesión |
| `JWT_EXPIRE_MINUTES` | No | `10080` (7 días) | Cuánto dura la sesión |
| `VOYAGE_API_KEY` | No | `pa-...` | Embeddings reales — obtener en voyageai.com |
| `CORS_ORIGINS` | Sí | `http://localhost:5173` | URLs permitidas para el frontend |

> **`VOYAGE_API_KEY` es opcional.** Si no la configuras, el sistema usa embeddings mock determinísticos. Sirven para desarrollo local, pero en producción conviene usar embeddings reales para mejor precisión en búsquedas.

### Frontend — `segundo/frontend/.env`

```bash
cp segundo/frontend/.env.example segundo/frontend/.env
```

| Variable | Requerida | Valor |
|---|---|---|
| `VITE_API_URL` | Sí | `http://localhost:8000` (local) o la URL del backend en producción |

---

## Setup paso a paso

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd agent-induccion
```

### 2. Configurar el backend

```bash
cd segundo/backend

# Crear entorno virtual de Python
python -m venv venv

# Activar el entorno virtual
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales (al menos DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET)

# Aplicar migraciones de base de datos
alembic upgrade head
```

### 3. Configurar el frontend

```bash
# En otra terminal, desde la raíz del proyecto
cd segundo/frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# El valor por defecto (http://localhost:8000) ya sirve para desarrollo local
```

---

## Cómo correr el proyecto

Una vez completado el setup, necesitas **dos terminales abiertas**:

**Terminal 1 — Backend:**
```bash
cd segundo/backend
source venv/bin/activate      # Windows: venv\Scripts\activate
uvicorn main:app --reload
```
El backend queda disponible en `http://localhost:8000`
Documentación interactiva (Swagger): `http://localhost:8000/docs`

**Terminal 2 — Frontend:**
```bash
cd segundo/frontend
npm run dev
```
El frontend queda disponible en `http://localhost:5173`

---

## Verificar que todo funciona

```bash
# Verificar que el backend responde
curl http://localhost:8000/health

# Debe retornar: {"status": "ok"} o similar
```

Abre `http://localhost:5173` en el navegador. Deberías ver la pantalla de login.

---

## Stack tecnológico completo

### Backend
| Tecnología | Versión | Para qué |
|---|---|---|
| FastAPI | 0.111 | Framework web async |
| Uvicorn | 0.29 | Servidor ASGI |
| SQLAlchemy | 2.0 | ORM (async) |
| asyncpg | 0.29 | Driver de PostgreSQL async |
| pgvector | 0.2.5 | Búsqueda vectorial (RAG) |
| Alembic | 1.13 | Migraciones de BD |
| Pydantic | 2.7 | Validación de datos |
| python-jose | 3.3 | JWT (autenticación) |
| httpx | 0.27 | Cliente HTTP async |

### Frontend
| Tecnología | Versión | Para qué |
|---|---|---|
| React | 18.3 | UI |
| Vite | 5.2 | Build tool y dev server |
| React Router | 6.23 | Navegación entre páginas |
| Axios | 1.7 | Llamadas HTTP al backend |
| Zustand | 4.5 | Estado global |
| Tailwind CSS | 3.4 | Estilos |

### Servicios externos
| Servicio | Para qué | Requerido |
|---|---|---|
| Anthropic (Claude) | LLM — cerebro del agente | Sí |
| Supabase | PostgreSQL + pgvector en la nube | Para producción (o local) |
| Voyage AI | Embeddings de alta calidad | No (hay mock) |

---

## Estructura del proyecto

```
agent-induccion/
├── segundo/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── agents/       # Lógica de agentes (orquestador, memoria, etc.)
│   │   │   ├── api/          # Endpoints REST
│   │   │   ├── db/           # Modelos y sesión de BD
│   │   │   ├── core/         # Configuración y seguridad (JWT)
│   │   │   └── services/     # Claude, embeddings, auth
│   │   ├── alembic/          # Migraciones de base de datos
│   │   ├── main.py           # Entry point del servidor
│   │   ├── requirements.txt  # Dependencias Python
│   │   └── .env.example      # Plantilla de variables de entorno
│   └── frontend/
│       ├── src/
│       │   ├── pages/        # Login, Dashboard Owner, Chat Employee
│       │   ├── components/   # Componentes reutilizables
│       │   ├── services/     # Cliente Axios
│       │   └── store/        # Estado global (Zustand)
│       ├── package.json      # Dependencias Node
│       └── .env.example      # Plantilla de variables de entorno
├── SETUP.md                  # Este archivo
├── SEGUNDO_VISION.md         # Visión del producto
└── PROMPT_SEGUNDO_V2.md      # Plan de implementación v2.0
```

---

## Problemas comunes

**Error: `asyncpg` no encuentra la base de datos**
- Verifica que `DATABASE_URL` en `.env` tenga el formato correcto: `postgresql+asyncpg://...`
- Verifica que la base de datos esté accesible (si es Supabase, revisa el connection string en tu dashboard)

**Error: `ModuleNotFoundError` al correr uvicorn**
- Asegúrate de haber activado el entorno virtual: `source venv/bin/activate`
- Verifica que corriste `pip install -r requirements.txt` con el venv activo

**Error: `CORS` en el frontend**
- Verifica que `CORS_ORIGINS` en el backend incluya la URL exacta de tu frontend (con puerto)
- Ejemplo: `CORS_ORIGINS=http://localhost:5173`

**El frontend carga pero las llamadas al backend fallan**
- Verifica que `VITE_API_URL` en `segundo/frontend/.env` apunte al backend correcto
- Verifica que el backend esté corriendo en el puerto 8000

**`alembic upgrade head` falla**
- Verifica que `DATABASE_URL` esté configurada en `.env`
- Verifica que la base de datos exista y el usuario tenga permisos para crear tablas

---

## Deploy en producción

### Base de datos
Usar **Supabase** (ya configurado). Asegurarse de que la extensión `pgvector` esté habilitada en el proyecto de Supabase.

### Backend
Opciones recomendadas:
- **Render**: Conectar el repo, configurar build command (`pip install -r requirements.txt`) y start command (`uvicorn main:app --host 0.0.0.0 --port $PORT`)
- **Railway**: Similar a Render, detecta automáticamente Python

Variables de entorno a configurar en producción:
```
DATABASE_URL=postgresql+asyncpg://<supabase-connection-string>
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<string-largo-y-aleatorio>
VOYAGE_API_KEY=pa-...
CORS_ORIGINS=https://<tu-frontend>.vercel.app
```

### Frontend
Usar **Vercel** (ya conectado). Configurar variable de entorno:
```
VITE_API_URL=https://<tu-backend>.render.com
```
