# Diseño — Segundo v3: Plataforma de Equipos de Agentes

**Fecha:** 2026-07-01
**Estado:** Aprobado para ejecución vía `MASTER_PLAN.md`

## 1. Visión

Segundo deja de ser solo un agente de onboarding para PyMEs con procesos manuales y se convierte en una **plataforma donde cualquier empresa — incluidas empresas de tecnología — tiene su propio equipo de agentes IA con subagentes**.

Cada empresa tendrá:

- **Un roster de agentes**: empleados IA con nombre, rol y persona (ej. "Reclutadora con 100 años de experiencia contratando subagentes", "Agente de Recursos Humanos"), creados desde plantillas por industria o desde cero.
- **Misiones**: el dueño lanza un objetivo ("prepara el plan de contratación del trimestre", "audita los precios del catálogo") y un **agente manager/contratador** arma el equipo, contrata subagentes si hace falta, y descompone la misión en tareas.
- **Ejecución en paralelo**: las tareas corren simultáneamente, cada agente con su persona y con acceso RAG al conocimiento de la empresa.
- **Revisión de tareas**: un **agente revisor** aprueba o rechaza cada resultado con feedback; los rechazos se reintentan.
- **Entregable final**: el manager sintetiza los resultados y notifica al dueño.

El producto actual (base de conocimiento + chat de preguntas para empleados) **se conserva** y se convierte en el sustrato sobre el que trabajan los agentes.

## 2. Diagnóstico del código actual

Lo que ya existe y se reutiliza:

| Pieza | Estado | Destino en v3 |
|---|---|---|
| `app/agents/orchestrator.py` | Orquestador con tool use (delegar/escalar/proponer conocimiento) | Se mantiene para el chat; delega a agentes del roster en vez de dominios fijos |
| `app/agents/sub_agents.py` | 4 agentes hardcodeados (ventas/operaciones/clientes/general) corriendo en paralelo con `asyncio.gather` | El diccionario `SUB_AGENTS` se reemplaza por agentes en DB; el runner paralelo es la base del ejecutor de misiones |
| `app/agents/search_tools.py` | RAG por dominio sobre pgvector | Se generaliza a `search_by_scopes()` para cualquier agente |
| `app/services/claude.py` | Abstracción LLM (ollama/claude/groq) con `complete` y `complete_with_tools` | Se reutiliza tal cual para todos los agentes nuevos |
| Auth, multi-tenant, billing, i18n, notificaciones | Funcionales | Se conservan; billing gana límites de agentes/misiones |
| `memory/extraction/consistency/briefing agents` | Agentes utilitarios del conocimiento | Sin cambios |

Lo que falta (el corazón de v3): agentes como **datos configurables** (tabla `agents`), subagentes contratados dinámicamente, un **motor de misiones** con tareas/estados/revisión, y el frontend de equipo + misiones.

## 3. Enfoques considerados

**A. Evolucionar Segundo in-place (recomendado).** Conservar auth/RAG/chat/billing y añadir la capa de agentes + misiones encima, refactorizando `sub_agents.py` para leer de DB. Máxima reutilización, el producto actual nunca deja de funcionar, cada fase entrega valor.

**B. Reescribir la plataforma desde cero.** Arquitectura limpia orientada a agentes, pero tira semanas de trabajo funcional (auth, RAG, billing, i18n, seguridad) y duplica riesgo. Descartado.

**C. Adoptar un framework de orquestación externo (LangGraph, CrewAI).** Aporta grafos de agentes listos, pero agrega dependencias pesadas, pelea con la abstracción LLM propia (que soporta Ollama local) y es más de lo que el MVP necesita. Descartado — `asyncio` + tool use propio ya demostró funcionar en este código.

## 4. Arquitectura

### 4.1 Modelo de datos (migración 006)

```
agents
  id, business_id, template_key?, name, role_title, persona,
  system_prompt, domain_scopes[], can_hire (bool), is_reviewer (bool),
  parent_agent_id? (subagente contratado por otro agente),
  status ('active'|'archived'), created_by, created_at

missions
  id, business_id, title, objective, status
  ('planning'|'running'|'reviewing'|'completed'|'failed'|'cancelled'),
  manager_agent_id, result_summary?, error?,
  created_by, created_at, started_at?, finished_at?

mission_tasks
  id, mission_id, agent_id, parent_task_id?, title, description,
  status ('pending'|'in_progress'|'review'|'rejected'|'approved'|'failed'),
  output?, review_notes?, reviewer_agent_id?, attempts, order_index

task_events   -- timeline auditable de la misión
  id, mission_id, task_id?, agent_id?, type, payload, created_at
```

Las **plantillas de agentes** viven como seeds JSON en `app/data/agent_templates/` (mismo patrón que los templates de negocio existentes): manager/contratador, revisor QA, RRHH, reclutador, ventas, operaciones, clientes, soporte, marketing, finanzas — cada una con las industrias donde aplica.

### 4.2 Motor de misiones (`app/services/mission_engine.py`)

1. **Planificación** — el agente manager (persona: reclutador con décadas de experiencia armando equipos) recibe el objetivo, el roster actual y el catálogo de plantillas. Con tool use decide: qué agentes existentes participan, qué subagentes contratar (filas nuevas en `agents` con `parent_agent_id`), y descompone la misión en 3–7 tareas.
2. **Ejecución paralela** — `asyncio.gather` sobre las tareas; cada agente corre con su `system_prompt` + persona + RAG (`search_by_scopes`) + herramientas (`search_knowledge`, `flag_new_knowledge`, `escalate_to_owner`). Timeout por tarea: 60s.
3. **Revisión** — el agente revisor evalúa cada output contra la descripción de la tarea → `{approved, feedback}`. Rechazo → reintento con el feedback inyectado (máx. 2 intentos); si sigue fallando, la tarea queda `failed` y la misión lo refleja.
4. **Síntesis** — el manager compone el entregable final; se notifica al dueño (sistema de notificaciones existente).

**Ejecución en background:** `asyncio.create_task` desde el endpoint; todo el estado se persiste en DB y el frontend hace polling (2–3s). Sin Celery ni colas en el MVP (YAGNI). Al arrancar el backend, misiones huérfanas en `running` se marcan `failed` con mensaje claro.

**Límites de costo:** máx. 5 subagentes contratados y 7 tareas por misión, 2 reintentos por tarea, y límites por plan (Fase 5).

### 4.3 API nueva

- `app/api/agents.py` — CRUD del roster, catálogo de plantillas, chat directo con un agente (`POST /agents/{id}/chat`).
- `app/api/missions.py` — crear/lanzar, listar, detalle (tareas + timeline), cancelar.
- Todo filtrado por `business_id` del JWT, como el resto del código.

### 4.4 Frontend

Navegación nueva con sidebar: **Inicio · Equipo · Misiones · Conocimiento · Chat**.

- **Equipo** (`pages/Team.jsx`): tarjetas del roster, contratar desde plantilla o crear custom, editar persona, árbol de subagentes contratados.
- **Misiones** (`pages/Missions.jsx` + `MissionDetail.jsx`): lanzar objetivo en texto libre, tablero de tareas con estados en vivo (polling), timeline de eventos, output y revisión por tarea, entregable final.
- **Chat**: se mantiene, con selector para hablar con un agente específico del equipo.
- i18n es/en/pt para todo lo nuevo; español neutro.

### 4.5 Registro y generalización de industrias

El registro pregunta la industria con lista ampliada (tecnología/software, agencia, e-commerce, servicios profesionales, además de las actuales) y crea el **equipo semilla** desde plantillas — los 4 dominios actuales (ventas/operaciones/clientes/general) se convierten en agentes semilla, así el chat existente sigue funcionando sin cambios visibles.

## 5. Manejo de errores

- Fallo de un agente en una tarea → reintento con feedback; agotados los intentos, tarea `failed` sin tumbar la misión.
- Timeout de tarea (60s) y de misión (10 min) → estados `failed` con mensaje.
- Reinicio del servidor → misiones `running` huérfanas se marcan `failed` al arrancar.
- Outputs de agentes se tratan como no confiables: se sanitizan antes de re-inyectarse en prompts de revisión/síntesis (mitigación de prompt injection, patrón ya usado en `sub_agents.py`).

## 6. Testing

- Unit tests del motor de misiones con LLM mockeado (planificación, paralelo, ciclo de revisión, reintentos, límites).
- Integration tests de las APIs nuevas (multi-tenant: un negocio no ve agentes/misiones de otro).
- Tras cada migración: `alembic upgrade head` + verificación por `curl` de los endpoints afectados (regla del proyecto).
- Smoke E2E final: registro → equipo semilla → misión → revisión → entregable.

## 7. Ejecución

El plan de ejecución por fases con tareas numeradas vive en [`MASTER_PLAN.md`](../../MASTER_PLAN.md). Cada fase es autocontenida, deja el producto funcionando y tiene criterios de terminado explícitos.
