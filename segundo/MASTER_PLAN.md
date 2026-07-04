# MASTER PLAN — Segundo v3: Equipos de Agentes para Toda Empresa

> Diseño de referencia: [`docs/plans/2026-07-01-equipos-de-agentes-design.md`](docs/plans/2026-07-01-equipos-de-agentes-design.md)
>
> **Cómo usar este plan:** las fases se ejecutan en orden. Cada tarea se marca `[x]` al completarse. Una fase no se cierra sin cumplir sus **criterios de terminado**. El producto queda funcional al final de cada fase.

**Objetivo:** convertir Segundo en una plataforma donde cualquier empresa (comercio tradicional o empresa de tecnología) tiene su equipo de agentes IA: un agente manager/contratador que arma equipos, subagentes especialistas que ejecutan tareas en paralelo, y agentes revisores que aprueban o rechazan cada resultado.

---

## Fase 1 — Cimientos: agentes como datos (backend)

El roster de agentes deja de estar hardcodeado y pasa a ser configurable por empresa.

- [x] **1.1** Migración Alembic `006`: tablas `agents`, `missions`, `mission_tasks`, `task_events` + modelos SQLAlchemy en `app/db/models.py` + schemas Pydantic en `app/db/schemas.py`.
- [x] **1.2** Catálogo de plantillas de agentes en `app/data/agent_templates/` (JSON): manager/contratador (persona "100 años de experiencia armando equipos"), revisor QA, RRHH, reclutador, ventas, operaciones, clientes, soporte técnico, marketing, finanzas — cada una con `industries[]`, `domain_scopes[]`, `can_hire`, `is_reviewer`.
- [x] **1.3** `app/api/agents.py`: `GET/POST/PATCH/DELETE /agents`, `GET /agents/templates` (filtrable por industria). Solo `owner` puede contratar/editar/archivar. Aislamiento multi-tenant por `business_id` del JWT.
- [x] **1.4** Equipo semilla al registrar negocio: manager + revisor + los 4 especialistas de dominio actuales como agentes en DB. Endpoint `POST /agents/seed` para negocios existentes.
- [x] **1.5** Refactor `search_tools.py`: función genérica `search_by_scopes(scopes, ...)`; las funciones por dominio pasan a ser wrappers.
- [x] **1.6** Refactor `sub_agents.py` y `orchestrator.py`: los agentes del chat se cargan desde DB (roster del negocio) en vez del diccionario `SUB_AGENTS`. El chat existente se comporta igual que antes.
- [x] **1.7** Migrar DB en Supabase + probar por `curl`: crear agente, listar plantillas, seed, y una pregunta al chat que verifique que nada se rompió.

**Criterios de terminado:** migración aplicada; CRUD de agentes probado por curl; el chat de empleados responde igual que antes del refactor; un negocio no puede ver agentes de otro.

---

## Fase 2 — Motor de misiones: equipos en paralelo + revisión

El corazón de v3: lanzar un objetivo y que un equipo de agentes lo resuelva.

- [x] **2.1** `app/services/mission_engine.py` — **planificación**: el agente manager recibe objetivo + roster + catálogo, y vía tool use (a) selecciona agentes existentes, (b) contrata subagentes desde plantillas (filas en `agents` con `parent_agent_id`), (c) descompone la misión en 3–7 tareas (`mission_tasks`).
- [x] **2.2** **Ejecución paralela**: `asyncio.gather` sobre tareas; cada agente corre con persona + RAG (`search_by_scopes`) + herramientas (`search_knowledge`, `flag_new_knowledge`, `escalate_to_owner`). Timeout 60s/tarea. Límites: máx. 5 subagentes y 7 tareas por misión.
- [x] **2.3** **Ciclo de revisión**: el agente revisor evalúa cada output → `{approved, feedback}`. Rechazo → reintento con feedback inyectado (máx. 2). Agotados → tarea `failed` sin tumbar la misión.
- [x] **2.4** **Síntesis y cierre**: el manager compone `result_summary`; notificación al dueño vía sistema existente; estados finales `completed`/`failed`.
- [x] **2.5** Timeline: registrar `task_events` en cada transición (misión creada, equipo contratado, tarea iniciada, output, revisión, reintento, cierre).
- [x] **2.6** `app/api/missions.py`: `POST /missions` (crea y lanza en background con `asyncio.create_task`), `GET /missions`, `GET /missions/{id}` (tareas + eventos), `POST /missions/{id}/cancel`. Al arrancar el backend, misiones huérfanas en `running` → `failed`.
- [x] **2.7** Sanitizar outputs de agentes antes de re-inyectarlos en prompts de revisión/síntesis (mitigar prompt injection).
- [x] **2.8** Prueba E2E por `curl`: lanzar una misión real (ej. "prepara el plan de contratación de un vendedor"), verificar contratación de subagentes, paralelo, revisión con al menos un rechazo simulado, y entregable final.

**Criterios de terminado:** una misión completa corre de punta a punta por curl; el timeline registra todos los eventos; una misión con tarea fallida termina en estado coherente; cancelación funciona.

---

## Fase 3 — Frontend: equipo y misiones

- [x] **3.1** Navegación nueva: sidebar con **Inicio · Equipo · Misiones · Conocimiento · Chat** + rutas en `App.jsx`. El dashboard actual se reorganiza bajo "Inicio" y "Conocimiento".
- [x] **3.2** `pages/Team.jsx`: roster en tarjetas (nombre, rol, persona, dominios), modal de contratación (plantillas filtradas por industria + creación custom), editar/archivar, vista de subagentes contratados por agente (árbol).
- [x] **3.3** `pages/Missions.jsx`: lanzar misión (objetivo en texto libre) + lista con estados.
- [x] **3.4** `pages/MissionDetail.jsx`: tablero de tareas en vivo (polling 2–3s), timeline de eventos, output y revisión por tarea, entregable final destacado.
- [x] **3.5** Chat con agente individual: selector de agente en el chat existente → `POST /agents/{id}/chat`.
- [x] **3.6** Store (Zustand slices para agents/missions), cliente API (`services/api.js`) e i18n es/en/pt para todas las vistas nuevas (español neutro).

**Criterios de terminado:** desde el navegador se puede contratar un agente, lanzar una misión, ver las tareas moverse en vivo y leer el entregable; todo traducido en los 3 idiomas.

---

## Fase 4 — Generalización: de PyMEs manuales a toda empresa

- [x] **4.1** Registro con industrias ampliadas: tecnología/software, agencia digital, e-commerce, servicios profesionales, salud + las actuales (ferretería, restaurante, tienda de ropa).
- [x] **4.2** Plantillas de negocio nuevas en `app/data/templates/` para empresas tech (ej. `startup_software.json`, `agencia_digital.json`) con conocimiento inicial + equipo semilla acorde (reclutador técnico, soporte, ventas B2B).
- [x] **4.3** Onboarding actualizado: al registrarse, se propone el equipo de agentes según la industria elegida y el dueño confirma con un clic.
- [x] **4.4** Reposicionamiento de copy: de "agente de onboarding institucional" a "tu equipo de agentes" en README, i18n, login/registro y `docs/BRAND.md`/`docs/MARKETING.md`.

**Criterios de terminado:** una empresa de software puede registrarse, recibir un equipo relevante y lanzar una misión útil en su contexto sin tocar configuración manual.

---

## Fase 5 — Límites, métricas y calidad

- [x] **5.1** Límites por plan en `billing.py` (nº de agentes activos, misiones/mes) + enforcement en los endpoints con mensajes claros de upgrade.
- [x] **5.2** Analytics de misiones en `analytics.py`: misiones por mes, tasa de aprobación de tareas, agentes más usados, tiempo promedio.
- [x] **5.3** Tests automatizados: unit del motor de misiones con LLM mockeado (planificación, paralelo, revisión, reintentos, límites) + integration de `/agents` y `/missions` incluyendo aislamiento multi-tenant.
- [x] **5.4** Revisión de seguridad: multi-tenant en todas las queries nuevas, rate limits en `/missions`, sanitización de outputs, permisos owner/employee en agentes y misiones. Actualizar `docs/seguridad/SECURITY.md`. (Revisión adversarial ejecutada: V3-1..V3-5 y V3-7..V3-9 + V3-11 corregidos; V3-6 y V3-10 aplazados como bloqueantes/config de launch — ver SECURITY.md.)

**Criterios de terminado:** suite de tests en verde; límites de plan verificados por curl; checklist de seguridad documentado.

---

## Fase 6 — Despliegue y validación final

- [x] **6.1** Migración aplicada en Supabase producción.
- [ ] **6.2** Deploy del frontend en Vercel. (Preparado: `frontend/vercel.json` + `VITE_API_URL`; falta autenticar Vercel y la URL pública del backend.)
- [ ] **6.3** Smoke test E2E en producción: registro → equipo semilla → contratar agente → misión → revisión → entregable → notificación. (Bloqueado por hosting del backend: requiere host persistente, no serverless; ver bloqueantes de launch en SECURITY.md.)
- [x] **6.4** Documentación final: `README.md`, `docs/README.md` (endpoints nuevos), `INSTALL.md`.

**Criterios de terminado:** flujo completo funcionando en producción; documentación al día.

---

## Decisiones ya tomadas (no re-discutir al ejecutar)

1. **Evolución in-place**, no reescritura: se conserva auth, RAG, billing, i18n y el chat actual.
2. **Sin frameworks de orquestación externos** ni colas (Celery): `asyncio` + tool use propio + estado en DB + polling.
3. **Jerarquía de subagentes de 1 nivel** (agente → subagentes) con límites duros por misión para controlar costos.
4. La **base de conocimiento** existente es el sustrato RAG de todos los agentes.
5. Los 4 dominios actuales del chat se convierten en **agentes semilla** — compatibilidad total hacia atrás.
