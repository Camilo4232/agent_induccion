# Segundo — Agente de Onboarding Institucional

## Stack
- **Backend**: FastAPI + SQLAlchemy + pgvector + Anthropic SDK
- **Frontend**: React 18 + Vite + Tailwind CSS + Zustand
- **DB**: PostgreSQL 15 + pgvector (Supabase)
- **Deploy**: Railway (backend) · Vercel (frontend)

---

## Setup local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edita .env con tus credenciales

# Migraciones
alembic upgrade head

# Servidor
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8000
npm run dev
```

---

## Variables de entorno (backend)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/segundo` |
| `ANTHROPIC_API_KEY` | Tu API key de Anthropic |
| `JWT_SECRET` | Clave secreta para firmar tokens |
| `JWT_EXPIRE_MINUTES` | Duración del token (default: 10080 = 7 días) |
| `VOYAGE_API_KEY` | (Opcional) API key de Voyage AI para embeddings reales |
| `CORS_ORIGINS` | Origins permitidos, separados por coma |

> Si no configuras `VOYAGE_API_KEY`, el sistema usa embeddings mock determinísticos
> para desarrollo local. Para producción, obtén una clave en voyageai.com.

---

## Endpoints principales

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público | Registrar negocio + owner |
| POST | `/auth/login` | Público | Login, retorna JWT |
| POST | `/teach` | Owner | Enseñar al agente |
| GET | `/knowledge` | Owner | Ver conocimiento guardado |
| PATCH | `/knowledge/{id}` | Owner | Editar entrada |
| DELETE | `/knowledge/{id}` | Owner | Eliminar entrada |
| POST | `/ask` | Employee | Hacer una pregunta |
| GET | `/sessions/{id}/history` | Employee | Historial de chat |
| GET | `/unanswered` | Owner | Ver preguntas sin respuesta |
| POST | `/unanswered/{id}/resolve` | Owner | Resolver + guardar respuesta |
| POST | `/invite` | Owner | Invitar empleado |

Docs interactivos: `http://localhost:8000/docs`

---

## Correr el proyecto localmente (forma rápida)

Desde la raíz del proyecto, abre **dos terminales**:

**Terminal 1 — Backend:**
```bash
cd segundo/backend
source venv/bin/activate   # Windows: venv\Scripts\activate
uvicorn main:app --reload
# Disponible en http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd segundo/frontend
npm run dev
# Disponible en http://localhost:5173
```

> Asegúrate de haber completado el setup (migraciones, `.env`, dependencias) antes de correr.

---

## Arquitectura de Agentes

```
/teach
  └── Memory Agent
        ├── Extrae hechos atómicos (Claude)
        ├── Genera embedding (Voyage / mock)
        └── Guarda en knowledge_entries

/ask
  └── Orchestrator
        ├── Genera embedding de la pregunta
        ├── Búsqueda semántica top-5 (cosine > 0.75)
        ├── Response Agent (Claude con contexto)
        └── Si confidence=none → guarda en unanswered_questions
```
