# Segundo — Tu Equipo de Agentes IA

## Stack
- **Backend**: FastAPI + SQLAlchemy + pgvector + Anthropic SDK
- **Frontend**: React 18 + Vite + Tailwind CSS + Zustand
- **DB**: PostgreSQL 15 + pgvector (Supabase)
- **Deploy**: Vercel (frontend) · backend en host persistente — **no serverless**: el motor de misiones ejecuta tareas `asyncio` en background que un runtime serverless mataría

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

### Equipo de agentes (v3)

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/agents` | Ambos | Roster del negocio (empleados no ven `system_prompt`) |
| GET | `/agents/templates` | Ambos | Catálogo de plantillas, filtrable por `?industry=` |
| POST | `/agents/seed` | Owner | Crear equipo semilla (idempotente) |
| POST | `/agents` | Owner | Contratar agente (plantilla o custom) — límite por plan |
| GET | `/agents/{id}` | Ambos | Detalle de un agente |
| PATCH | `/agents/{id}` | Owner | Editar/archivar/reactivar (reactivar chequea límite) |
| DELETE | `/agents/{id}` | Owner | Archivar (borrado suave) |
| POST | `/agents/{id}/chat` | Ambos | Chat directo con un agente (rate limit 10/min por usuario) |
| POST | `/missions` | Owner | Crear y lanzar misión en background — límite mensual por plan |
| GET | `/missions` | Owner | Listar misiones |
| GET | `/missions/{id}` | Owner | Detalle: tareas + timeline + equipo |
| POST | `/missions/{id}/cancel` | Owner | Cancelar misión en curso |
| GET | `/analytics/missions` | Owner | Misiones/mes, tasa de aprobación, top agentes, duración |
| GET | `/billing/plans` | Público | Planes con `max_agents` y `max_missions_per_month` |

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

POST /missions  (motor de misiones v3 — app/services/mission_engine.py)
  └── Manager (agente can_hire del roster)
        ├── Planifica: selecciona agentes, contrata subagentes (máx. 5),
        │   descompone en 3–7 tareas (mission_tasks)
        ├── Ejecución en paralelo (asyncio.gather, timeout 60s/tarea)
        │     └── Cada agente corre con persona + RAG (search_by_scopes)
        ├── Revisor (is_reviewer) aprueba/rechaza cada output
        │     └── Rechazo → reintento con feedback (máx. 2 intentos)
        └── Síntesis del manager → result_summary + notificación al dueño
```

---

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest -m "not integration"   # unitarios (motor, plantillas, schemas, billing)
pytest                        # suite completa — integración contra la DB real (.env)
```
