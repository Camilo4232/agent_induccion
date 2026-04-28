# SEGUNDO — Roadmap de Mejoras

Documento de referencia para implementar cada mejora identificada en el proyecto Segundo.
Cada mejora incluye: contexto, archivos afectados, subtareas paso a paso, y criterio de aceptacion.

---

## Estado de implementacion

### Fase 1 — Seguridad + bugs criticos
- [x] **#1** SQL Injection — queries parametrizadas en search_tools.py y consistency_agent.py
- [x] **#5** Teach flush — try/except con rollback, db.refresh despues de flush
- [x] **#6** Proposals await — try/except con rollback en approve

### Fase 2 — Performance + estabilidad backend
- [x] **#2** Indices DB — indices compuestos en todos los modelos
- [x] **#3** Soft delete — DELETE endpoint ahora hace is_active=False
- [x] **#4** Campos faltantes — usage_count, last_used_at, last_login_at, is_active, industry, proposed_by
- [x] **#7** Endpoints faltantes — briefing y transcribe ya existian
- [x] **#8** Config settings — voyage_api_key, llm_provider, similarity_threshold, search_top_k, etc.
- [x] **#9** Parseo JSON robusto — funcion _parse_agent_response con 3 estrategias + logging
- [x] **#10** Sub-agentes paralelos — asyncio.gather con timeout 30s por agente
- [x] **#11** Seleccion por relevancia — orchestrator usa avg_similarity para elegir mejor respuesta
- [x] **#12** Chat history — LIMIT en SQL en vez de cargar todo
- [x] **#13** Consistency agent — parse_failed flag, logging detallado, TOP_K aumentado a 5
- [x] **#14** Re-check consistencia al editar — knowledge.py PATCH ejecuta check_consistency
- [x] **#15** Cache de embeddings — generate_embedding_cached con LRU en search_tools + admin/clear-cache
- [x] **#16** Filtrado en SQL — WHERE distance < max_distance en vez de post-fetch
- [x] **#17** Logging — middleware en main.py, logging en orchestrator, sub_agents, search_tools, teach
- [x] **#33** LLM configurable — soporte Ollama + Claude con LLM_PROVIDER env var
- [x] **#34** Connection pooling — pool_size, max_overflow, pool_pre_ping configurados

### Fase 3 — Auth + seguridad avanzada
- [x] **#18** Refresh tokens — /auth/refresh, /auth/logout, rotacion automatica
- [x] **#19** Password recovery — /auth/forgot-password (6 digits), /auth/reset-password
- [x] **#20** Rate limiting por usuario — _get_user_rate_key extrae user_id del JWT

### Fase 4 — Frontend completo
- [x] **#21** Typing indicator — dots animados, slow warning 30s, retry button
- [x] **#22** Historial — sidebar de sesiones con preview, nueva conversacion
- [x] **#23** Busqueda knowledge — search input, filtro categoria, paginacion 20/page
- [x] **#24** Accesibilidad — ARIA roles/labels, focus-visible, prefers-reduced-motion, mobile CSS, touch targets
- [x] **#25** VoiceButton cleanup — stopVolumePolling + stream.getTracks on unmount
- [x] **#35** Sources en respuestas — details/summary con lista de hechos usados

### Fase 5 — Features avanzados
- [x] **#26** Notificaciones — backend CRUD + frontend bell icon con dropdown en OwnerDashboard
- [x] **#27** Analytics — /analytics/summary + /analytics/knowledge-usage + tab Metricas en dashboard
- [x] **#28** Versionado — history + revert endpoints en knowledge.py
- [x] **#29** Templates — JSON por industria (ferreteria, restaurante, tienda_ropa) + load endpoint
- [x] **#30** Bulk upload — CSV/JSON file upload + bulk-text extraction
- [x] **#31** Export — /knowledge/export JSON y CSV con botones en dashboard
- [x] **#32** Conflictos mejorados — muestra ambos hechos, elige ganador (mantener A/B/ambos)

### Extras
- [x] usage_count + last_used_at se incrementan al usar un hecho en respuesta
- [x] last_login_at se actualiza en cada login exitoso
- [x] Forgot password flow completo en Login.jsx

---

## Indice

1. [Seguridad: SQL Injection en busqueda vectorial](#1-seguridad-sql-injection-en-busqueda-vectorial)
2. [Base de datos: Indices faltantes](#2-base-de-datos-indices-faltantes)
3. [Base de datos: Hard delete rompe foreign keys](#3-base-de-datos-hard-delete-rompe-foreign-keys)
4. [Base de datos: Campos faltantes en modelos](#4-base-de-datos-campos-faltantes-en-modelos)
5. [Backend: Teach endpoint — flush antes de consistency check](#5-backend-teach-endpoint--flush-antes-de-consistency-check)
6. [Backend: Proposals — await faltante en commit](#6-backend-proposals--await-faltante-en-commit)
7. [Backend: Endpoints no implementados (briefing, transcribe)](#7-backend-endpoints-no-implementados-briefing-transcribe)
8. [Backend: Config — voyage_api_key no declarado en Settings](#8-backend-config--voyage_api_key-no-declarado-en-settings)
9. [Agentes: Parseo JSON fragil en sub-agentes](#9-agentes-parseo-json-fragil-en-sub-agentes)
10. [Agentes: Ejecucion secuencial de sub-agentes](#10-agentes-ejecucion-secuencial-de-sub-agentes)
11. [Agentes: Seleccion de respuesta por longitud en vez de relevancia](#11-agentes-seleccion-de-respuesta-por-longitud-en-vez-de-relevancia)
12. [Agentes: Chat history carga todo de la DB](#12-agentes-chat-history-carga-todo-de-la-db)
13. [Agentes: Consistency agent falla silenciosamente](#13-agentes-consistency-agent-falla-silenciosamente)
14. [Agentes: No re-check de consistencia al editar hechos](#14-agentes-no-re-check-de-consistencia-al-editar-hechos)
15. [Agentes: Cache de embeddings y respuestas](#15-agentes-cache-de-embeddings-y-respuestas)
16. [Agentes: Filtrado de similitud post-fetch](#16-agentes-filtrado-de-similitud-post-fetch)
17. [Agentes: Logging y observabilidad](#17-agentes-logging-y-observabilidad)
18. [Auth: Refresh tokens](#18-auth-refresh-tokens)
19. [Auth: Flujo de recuperacion de contrasena](#19-auth-flujo-de-recuperacion-de-contrasena)
20. [Auth: Rate limiting por usuario en /ask](#20-auth-rate-limiting-por-usuario-en-ask)
21. [Frontend: Indicador de "escribiendo" y manejo de errores](#21-frontend-indicador-de-escribiendo-y-manejo-de-errores)
22. [Frontend: Historial de conversaciones](#22-frontend-historial-de-conversaciones)
23. [Frontend: Busqueda en base de conocimiento](#23-frontend-busqueda-en-base-de-conocimiento)
24. [Frontend: Accesibilidad y mobile](#24-frontend-accesibilidad-y-mobile)
25. [Frontend: VoiceButton memory leak](#25-frontend-voicebutton-memory-leak)
26. [Feature: Notificaciones al dueno](#26-feature-notificaciones-al-dueno)
27. [Feature: Analytics y metricas](#27-feature-analytics-y-metricas)
28. [Feature: Versionado de conocimiento](#28-feature-versionado-de-conocimiento)
29. [Feature: Templates por industria](#29-feature-templates-por-industria)
30. [Feature: Bulk upload de conocimiento](#30-feature-bulk-upload-de-conocimiento)
31. [Feature: Export/backup de conocimiento](#31-feature-exportbackup-de-conocimiento)
32. [Feature: Resolucion de conflictos con seleccion de hecho ganador](#32-feature-resolucion-de-conflictos-con-seleccion-de-hecho-ganador)
33. [Infra: Proveedor LLM configurable (Claude vs Ollama)](#33-infra-proveedor-llm-configurable-claude-vs-ollama)
34. [Infra: Connection pooling de base de datos](#34-infra-connection-pooling-de-base-de-datos)
35. [Feature: Sources/fuentes en respuestas](#35-feature-sourcesfuentes-en-respuestas)

---

## 1. Seguridad: SQL Injection en busqueda vectorial

**Severidad:** CRITICA
**Archivo:** `backend/app/agents/search_tools.py` linea 37
**Problema:** El vector de embedding se interpola directamente en la query SQL via f-string. Aunque el vector se genera internamente, este patron es peligroso y debe corregirse.

### Subtareas

- [ ] **1.1** Leer `search_tools.py` completo y mapear todas las queries con f-string (lineas 41-52, 59-69)
- [ ] **1.2** Reemplazar la interpolacion de embedding por parametros SQLAlchemy bindparam:
  ```python
  # Antes (peligroso):
  sql = text(f"... embedding_vec <=> '{embedding_str}'::vector ...")

  # Despues (seguro):
  sql = text("... embedding_vec <=> :embedding::vector ...")
  result = await db.execute(sql, {"embedding": embedding_str})
  ```
- [ ] **1.3** Hacer lo mismo para TODAS las queries raw en el archivo (buscar `text(f"`)
- [ ] **1.4** Verificar que las queries parametrizadas devuelven los mismos resultados con un test manual
- [ ] **1.5** Agregar validacion de tipo en `generate_embedding()` — verificar que retorna lista de floats antes de pasar a SQL

**Criterio de aceptacion:** Ninguna query SQL usa f-string para inyectar valores. Todas usan parametros bind.

---

## 2. Base de datos: Indices faltantes

**Severidad:** ALTA
**Archivo:** `backend/app/db/models.py`
**Problema:** Tablas principales no tienen indices compuestos. Cada query hace full table scan.

### Subtareas

- [ ] **2.1** Crear migracion Alembic: `alembic revision --autogenerate -m "add_missing_indexes"`
- [ ] **2.2** Agregar indices en `models.py`:
  ```python
  # KnowledgeEntry
  __table_args__ = (
      Index('idx_knowledge_business_domain', 'business_id', 'domain', 'is_active'),
      Index('idx_knowledge_business_sensitivity', 'business_id', 'sensitivity', 'is_active'),
  )

  # ChatMessage
  __table_args__ = (
      Index('idx_chatmsg_session', 'session_id', 'created_at'),
  )

  # UnansweredQuestion
  __table_args__ = (
      Index('idx_unanswered_business', 'business_id', 'resolved'),
  )

  # User
  __table_args__ = (
      Index('idx_user_business', 'business_id'),
      Index('idx_user_email', 'email', unique=True),
      Index('idx_user_phone', 'phone'),
  )

  # KnowledgeProposal
  __table_args__ = (
      Index('idx_proposal_business_status', 'business_id', 'status'),
  )
  ```
- [ ] **2.3** Agregar indice GIN para pgvector en embedding_vec (mejora busqueda vectorial):
  ```sql
  CREATE INDEX idx_knowledge_embedding ON knowledge_entries
  USING ivfflat (embedding_vec vector_cosine_ops) WITH (lists = 100);
  ```
- [ ] **2.4** Ejecutar migracion: `alembic upgrade head`
- [ ] **2.5** Verificar que indices se crearon: `\di+` en psql

**Criterio de aceptacion:** Todas las tablas principales tienen indices en columnas usadas como filtro. Query plans muestran Index Scan en vez de Seq Scan.

---

## 3. Base de datos: Hard delete rompe foreign keys

**Severidad:** ALTA
**Archivo:** `backend/app/api/knowledge.py` linea 78
**Problema:** `DELETE /knowledge/{entry_id}` hace hard delete. Si el entry es referenciado en `KnowledgeConflict.fact_a_id` o `fact_b_id`, la query falla o deja datos huerfanos.

### Subtareas

- [ ] **3.1** Cambiar el endpoint DELETE para hacer soft-delete (set `is_active = False`) en vez de hard delete
- [ ] **3.2** Agregar campo `deactivated_at` (DateTime, nullable) a `KnowledgeEntry` para auditoria
- [ ] **3.3** Actualizar `GET /knowledge` para que filtre por `is_active=True` por defecto, con parametro `?include_inactive=true` opcional
- [ ] **3.4** Actualizar las queries de busqueda vectorial en `search_tools.py` para excluir `is_active=False`
- [ ] **3.5** Agregar `ON DELETE SET NULL` o `ON DELETE CASCADE` a las FK de `KnowledgeConflict` como safety net
- [ ] **3.6** Crear migracion Alembic con estos cambios

**Criterio de aceptacion:** Ningun dato se borra fisicamente. Soft-delete mantiene integridad referencial. Las busquedas ignoran entries inactivos.

---

## 4. Base de datos: Campos faltantes en modelos

**Severidad:** MEDIA
**Archivo:** `backend/app/db/models.py`
**Problema:** Faltan campos utiles para analytics, auditoria y gestion.

### Subtareas

- [ ] **4.1** Agregar a `KnowledgeEntry`:
  - `last_used_at` (DateTime, nullable) — actualizar cada vez que se usa en una respuesta
  - `usage_count` (Integer, default 0) — incrementar cada vez que se usa
- [ ] **4.2** Agregar a `User`:
  - `last_login_at` (DateTime, nullable) — actualizar en login
  - `is_active` (Boolean, default True) — para desactivar sin borrar
- [ ] **4.3** Agregar a `Business`:
  - `industry` (String, nullable) — tipo de negocio (para templates futuros)
  - `plan_tier` (String, default "free") — para limites futuros
- [ ] **4.4** Agregar a `KnowledgeProposal`:
  - `proposed_by` (UUID, FK -> users.id, nullable) — quien lo genero
  - Agregar CHECK constraint en `status`: `CHECK (status IN ('pending', 'approved', 'rejected'))`
- [ ] **4.5** Actualizar schemas.py con los nuevos campos en los Pydantic models
- [ ] **4.6** Crear migracion Alembic
- [ ] **4.7** Actualizar `ask.py` / `orchestrator.py` para incrementar `usage_count` y `last_used_at` cuando se usa un hecho
- [ ] **4.8** Actualizar `auth.py` para setear `last_login_at` en login exitoso

**Criterio de aceptacion:** Nuevos campos existen, se actualizan automaticamente, y se exponen en los schemas de respuesta.

---

## 5. Backend: Teach endpoint — flush antes de consistency check

**Severidad:** ALTA
**Archivo:** `backend/app/api/teach.py` linea 50
**Problema:** Se hace `db.flush()` antes de la verificacion de consistencia, pero el flush puede no garantizar que el nuevo entry es visible para la query de consistencia en la misma transaccion.

### Subtareas

- [ ] **5.1** Revisar el flujo actual en `teach.py` lineas 39-87
- [ ] **5.2** Mover el `db.flush()` antes del `check_consistency()` y verificar que funciona con `await db.flush()`
- [ ] **5.3** Agregar `await db.refresh(entry)` despues del flush para asegurar que el entry tiene ID asignado
- [ ] **5.4** Envolver todo el flujo de teach en un bloque try/except con rollback explicito:
  ```python
  try:
      # create entry, flush, check consistency, commit
      await db.commit()
  except Exception:
      await db.rollback()
      raise
  ```
- [ ] **5.5** Agregar test: ensena hecho contradictorio y verificar que el conflicto se detecta

**Criterio de aceptacion:** La consistencia se verifica correctamente incluso con el nuevo hecho en la misma transaccion. Rollback limpio en caso de error.

---

## 6. Backend: Proposals — await faltante en commit

**Severidad:** ALTA
**Archivo:** `backend/app/api/proposals.py` linea 65
**Problema:** El commit podria no ejecutarse antes de retornar la respuesta.

### Subtareas

- [ ] **6.1** Verificar la linea exacta del commit en `proposals.py` approve endpoint
- [ ] **6.2** Asegurar que `await db.commit()` esta presente y correctamente awaited
- [ ] **6.3** Agregar bloque try/except con rollback:
  ```python
  try:
      db.add(new_entry)
      proposal.status = "approved"
      await db.commit()
  except Exception:
      await db.rollback()
      raise HTTPException(500, "Error al aprobar propuesta")
  ```
- [ ] **6.4** Hacer lo mismo para el endpoint reject
- [ ] **6.5** Verificar que la respuesta incluye el entry_id creado

**Criterio de aceptacion:** Todos los endpoints de proposals tienen commits awaited y manejo de errores con rollback.

---

## 7. Backend: Endpoints no implementados (briefing, transcribe)

**Severidad:** ALTA
**Archivo:** `frontend/src/services/api.js` lineas 70-78 (los llama), backend no los tiene
**Problema:** El frontend llama a `briefingAPI.generate()` y `transcribeAPI.transcribe()` pero estos endpoints no existen en el backend. Genera errores 404 silenciosos.

### Subtareas

- [ ] **7.1** Crear archivo `backend/app/api/briefing.py`:
  - POST `/briefing/generate` — genera resumen diario para el empleado
  - Usa Claude para resumir: ultimas preguntas sin respuesta, hechos nuevos del dia, cambios recientes
  - Filtra por `business_id` del usuario
  ```python
  @router.post("/briefing/generate")
  async def generate_briefing(
      db: AsyncSession = Depends(get_db),
      current_user: User = Depends(get_current_user)
  ):
      # Obtener hechos creados en las ultimas 24h
      # Obtener preguntas sin respuesta recientes
      # Generar resumen con Claude
      pass
  ```
- [ ] **7.2** Crear archivo `backend/app/api/transcribe.py`:
  - POST `/transcribe` — recibe audio WebM, transcribe con Whisper
  - Usar `openai.Audio.transcriptions.create()` con modelo whisper-1 o whisper local
  ```python
  @router.post("/transcribe")
  async def transcribe_audio(
      file: UploadFile = File(...),
      current_user: User = Depends(get_current_user)
  ):
      # Guardar audio temporal
      # Llamar Whisper API
      # Retornar texto transcrito
      pass
  ```
- [ ] **7.3** Registrar ambos routers en `main.py`
- [ ] **7.4** Agregar dependencias necesarias (openai/whisper) a requirements.txt
- [ ] **7.5** Probar desde el frontend: briefing carga al iniciar chat, transcribe funciona con VoiceButton

**Criterio de aceptacion:** Ambos endpoints responden correctamente. Frontend no muestra errores 404.

---

## 8. Backend: Config — voyage_api_key no declarado en Settings

**Severidad:** BAJA
**Archivo:** `backend/app/core/config.py`, `backend/app/services/embeddings.py` linea 23
**Problema:** `voyage_api_key` se carga con `getattr(settings, "voyage_api_key", None)` pero no esta declarado en la clase Settings. Rompe type safety y es confuso.

### Subtareas

- [ ] **8.1** Agregar `voyage_api_key: str | None = None` a la clase Settings en `config.py`
- [ ] **8.2** Remover el uso de `getattr` en `embeddings.py` y usar `settings.voyage_api_key` directamente
- [ ] **8.3** Remover `redis_url` de Settings si no se usa en ningun lado (verificar primero)
- [ ] **8.4** Agregar `VOYAGE_API_KEY` al `.env.example` con comentario explicativo
- [ ] **8.5** Agregar validacion: si `voyage_api_key` es None, logear warning al startup (no error — el mock funciona)

**Criterio de aceptacion:** Todos los settings estan declarados en la clase Settings. No hay `getattr` para acceder a configuracion.

---

## 9. Agentes: Parseo JSON fragil en sub-agentes

**Severidad:** ALTA
**Archivo:** `backend/app/agents/sub_agents.py` lineas 142-159
**Problema:** El parseo de respuestas JSON del LLM usa regex y tiene fallbacks fragiles. Si Claude/Ollama cambia el formato, falla silenciosamente.

### Subtareas

- [ ] **9.1** Crear funcion `parse_agent_response(raw_text: str) -> dict` robusta:
  ```python
  def parse_agent_response(raw_text: str) -> dict:
      # 1. Intentar parsear texto completo como JSON
      # 2. Si falla, buscar bloque ```json ... ```
      # 3. Si falla, buscar primer { ... } con regex
      # 4. Si falla, buscar ultimo { ... }
      # 5. Validar que tiene campos "found" y "answer"
      # 6. Si todo falla, retornar {"found": False, "answer": ""}
      pass
  ```
- [ ] **9.2** Agregar validacion con Pydantic:
  ```python
  class AgentResponse(BaseModel):
      found: bool
      answer: str = ""
  ```
- [ ] **9.3** Reemplazar la logica actual (lineas 142-159) con la nueva funcion
- [ ] **9.4** Agregar logging cuando el parseo falla (nivel WARNING con el texto raw)
- [ ] **9.5** Eliminar la logica de concatenacion de entries como fallback (linea 153) — si no hay respuesta valida, retornar found=False
- [ ] **9.6** Agregar tests unitarios con diferentes formatos de respuesta

**Criterio de aceptacion:** El parseo maneja al menos 5 formatos diferentes de respuesta. Nunca falla silenciosamente — siempre logea si usa fallback.

---

## 10. Agentes: Ejecucion secuencial de sub-agentes

**Severidad:** MEDIA
**Archivo:** `backend/app/agents/sub_agents.py` lineas 182-186
**Problema:** Los sub-agentes se ejecutan en secuencia (un for loop) cuando podrian ejecutarse en paralelo con `asyncio.gather`.

### Subtareas

- [ ] **10.1** Verificar que cada sub-agente es una coroutine independiente (no comparte estado mutable)
- [ ] **10.2** Reemplazar el loop secuencial:
  ```python
  # Antes:
  results = []
  for agent in agents:
      result = await agent.run(question, context, db)
      results.append(result)

  # Despues:
  tasks = [agent.run(question, context, db) for agent in agents]
  results = await asyncio.gather(*tasks, return_exceptions=True)
  ```
- [ ] **10.3** Manejar excepciones individuales — si un agente falla, los otros siguen:
  ```python
  valid_results = []
  for r in results:
      if isinstance(r, Exception):
          logger.warning(f"Sub-agent failed: {r}")
      else:
          valid_results.append(r)
  ```
- [ ] **10.4** Agregar timeout por agente (30 segundos max):
  ```python
  tasks = [asyncio.wait_for(agent.run(...), timeout=30.0) for agent in agents]
  ```
- [ ] **10.5** Medir diferencia de latencia antes/despues con logging

**Criterio de aceptacion:** Sub-agentes se ejecutan en paralelo. Si uno falla o expira, los demas siguen. Latencia total = max(agentes) en vez de sum(agentes).

---

## 11. Agentes: Seleccion de respuesta por longitud en vez de relevancia

**Severidad:** MEDIA
**Archivo:** `backend/app/agents/orchestrator.py` linea 223
**Problema:** Cuando multiples sub-agentes responden, se selecciona el mas largo (`max(results, key=len)`). Esto favorece verbosidad sobre precision.

### Subtareas

- [ ] **11.1** Modificar sub-agentes para que retornen un score de confianza:
  ```python
  class AgentResponse(BaseModel):
      found: bool
      answer: str
      confidence: float  # 0.0 - 1.0, basado en similarity score promedio
      sources_count: int  # cuantos hechos uso
  ```
- [ ] **11.2** Calcular confidence en cada sub-agente basado en:
  - Promedio de similarity scores de los hechos usados
  - Cantidad de hechos encontrados
  - Si la respuesta vino directamente del contexto vs fue inferida
- [ ] **11.3** Cambiar la seleccion en orchestrator.py:
  ```python
  # Antes:
  best = max(results, key=lambda r: len(r.answer))

  # Despues:
  best = max(results, key=lambda r: r.confidence)
  ```
- [ ] **11.4** Si hay empate de confianza, usar longitud como desempate
- [ ] **11.5** Logear la decision: "Selected {domain} agent (confidence={score}) over {other_domains}"

**Criterio de aceptacion:** La respuesta mas relevante gana, no la mas larga. El score de confianza se basa en datos concretos (similarity scores).

---

## 12. Agentes: Chat history carga todo de la DB

**Severidad:** MEDIA
**Archivo:** `backend/app/agents/orchestrator.py` linea 292
**Problema:** Se cargan TODOS los mensajes del chat session y luego se toman los ultimos 6 con Python slicing. Si una sesion tiene 1000 mensajes, se cargan todos.

### Subtareas

- [ ] **12.1** Modificar la query para usar LIMIT y ORDER BY en SQL:
  ```python
  # Antes:
  messages = await db.execute(select(ChatMessage).where(...))
  history = messages.scalars().all()[-6:]

  # Despues:
  messages = await db.execute(
      select(ChatMessage)
      .where(ChatMessage.session_id == session_id)
      .order_by(ChatMessage.created_at.desc())
      .limit(6)
  )
  history = list(reversed(messages.scalars().all()))
  ```
- [ ] **12.2** Hacer el limite configurable via Settings: `chat_history_limit: int = 6`
- [ ] **12.3** Verificar que el orden cronologico se mantiene despues del reverse

**Criterio de aceptacion:** La query SQL solo trae los ultimos N mensajes. No hay carga innecesaria de datos.

---

## 13. Agentes: Consistency agent falla silenciosamente

**Severidad:** MEDIA
**Archivo:** `backend/app/agents/consistency_agent.py` lineas 93-97
**Problema:** Si el parseo JSON de la respuesta de Claude falla, se retorna `False` (sin contradiccion) sin notificar. Contradicciones reales pueden pasar desapercibidas.

### Subtareas

- [ ] **13.1** Agregar logging estructurado cuando el parseo falla:
  ```python
  logger.error(
      "Consistency check JSON parse failed",
      extra={"raw_response": raw_text, "new_fact": new_fact, "similar_facts": similar_ids}
  )
  ```
- [ ] **13.2** En vez de retornar `False` en fallo, retornar un objeto con estado "unknown":
  ```python
  class ConsistencyResult:
      has_contradiction: bool | None  # None = no se pudo determinar
      explanation: str
      parse_failed: bool
  ```
- [ ] **13.3** En `teach.py`, si `parse_failed=True`, agregar warning en la respuesta:
  ```python
  if result.parse_failed:
      response.conflict_warning = "No se pudo verificar consistencia. Revisa manualmente."
  ```
- [ ] **13.4** Aumentar TOP_K de 3 a 5 para buscar mas hechos similares
- [ ] **13.5** Agregar retry (1 intento adicional) antes de declarar fallo

**Criterio de aceptacion:** El dueno siempre sabe si la verificacion fue exitosa, fallida, o inconclusa. Los fallos se logean con detalle.

---

## 14. Agentes: No re-check de consistencia al editar hechos

**Severidad:** MEDIA
**Archivo:** `backend/app/api/knowledge.py` lineas 29-58
**Problema:** Cuando un hecho se edita via PATCH, se regenera el embedding pero NO se re-verifica consistencia. El dueno podria introducir contradicciones editando.

### Subtareas

- [ ] **14.1** Importar `check_consistency` en `knowledge.py`
- [ ] **14.2** Despues de actualizar el embedding (linea 50), llamar a `check_consistency()`:
  ```python
  if req.processed_fact and req.processed_fact != entry.processed_fact:
      entry.processed_fact = req.processed_fact
      entry.embedding_vec = await generate_embedding(req.processed_fact)
      conflict = await check_consistency(req.processed_fact, entry.business_id, db, exclude_id=entry.id)
      if conflict:
          # crear KnowledgeConflict, retornar warning
  ```
- [ ] **14.3** Agregar parametro `exclude_id` a `check_consistency()` para que no compare el hecho consigo mismo
- [ ] **14.4** Retornar `conflict_warning` en la respuesta del PATCH si se detecta
- [ ] **14.5** Actualizar el schema de respuesta del PATCH para incluir `conflict_warning`

**Criterio de aceptacion:** Editar un hecho dispara verificacion de consistencia. El hecho editado no se compara consigo mismo.

---

## 15. Agentes: Cache de embeddings y respuestas

**Severidad:** MEDIA
**Archivo:** `backend/app/services/embeddings.py`, `backend/app/agents/search_tools.py`
**Problema:** La misma pregunta genera un embedding nuevo cada vez. No hay cache para preguntas frecuentes ni para resultados de busqueda.

### Subtareas

- [ ] **15.1** Implementar cache en memoria (LRU) para embeddings de preguntas:
  ```python
  from functools import lru_cache
  import hashlib

  _embedding_cache: dict[str, list[float]] = {}
  MAX_CACHE_SIZE = 500

  async def generate_embedding_cached(text: str) -> list[float]:
      key = hashlib.sha256(text.encode()).hexdigest()
      if key in _embedding_cache:
          return _embedding_cache[key]
      embedding = await generate_embedding(text)
      if len(_embedding_cache) >= MAX_CACHE_SIZE:
          # Evict oldest
          _embedding_cache.pop(next(iter(_embedding_cache)))
      _embedding_cache[key] = embedding
      return embedding
  ```
- [ ] **15.2** Usar `generate_embedding_cached()` en `search_tools.py` para queries (no para knowledge entries que se guardan)
- [ ] **15.3** Implementar cache de respuestas completas (opcional, mas agresivo):
  ```python
  # Cache key = hash(question + business_id)
  # TTL = 5 minutos
  # Invalidar cuando se ensenan nuevos hechos
  ```
- [ ] **15.4** Agregar endpoint para limpiar cache manualmente (admin/debug)
- [ ] **15.5** Agregar metricas: cache hits vs misses (log cada 100 queries)

**Criterio de aceptacion:** Preguntas repetidas en ventana de 5 min no generan nuevos embeddings. Cache hit rate > 20% en uso normal.

---

## 16. Agentes: Filtrado de similitud post-fetch

**Severidad:** MEDIA
**Archivo:** `backend/app/agents/search_tools.py` linea 85
**Problema:** Se traen TOP_K=5 resultados de la DB y DESPUES se filtran por threshold 0.75. Resultados irrelevantes (similarity 0.5) viajan por la red y consumen memoria.

### Subtareas

- [ ] **16.1** Mover el filtro de similitud a la query SQL:
  ```sql
  -- Antes:
  SELECT ... ORDER BY embedding_vec <=> :embedding LIMIT 5

  -- Despues:
  SELECT ...
  WHERE (embedding_vec <=> :embedding) < 0.25  -- cosine distance < 0.25 = similarity > 0.75
  ORDER BY embedding_vec <=> :embedding
  LIMIT 5
  ```
- [ ] **16.2** Ajustar el threshold: `<=>` retorna distancia (0 = identico, 2 = opuesto). `1 - threshold` = distancia maxima
- [ ] **16.3** Hacer el threshold configurable en Settings: `similarity_threshold: float = 0.75`
- [ ] **16.4** Remover el filtrado post-fetch en Python
- [ ] **16.5** Verificar que los resultados son equivalentes antes y despues del cambio

**Criterio de aceptacion:** Solo se traen de la DB resultados que pasan el threshold. Sin filtrado Python post-fetch.

---

## 17. Agentes: Logging y observabilidad

**Severidad:** MEDIA
**Archivos:** Todos los archivos en `backend/app/agents/`, `backend/main.py`
**Problema:** No hay logging estructurado en el flujo de agentes. Si algo falla, no hay forma de diagnosticarlo.

### Subtareas

- [ ] **17.1** Configurar logging JSON en `main.py`:
  ```python
  import logging
  import json

  class JSONFormatter(logging.Formatter):
      def format(self, record):
          log_data = {
              "timestamp": self.formatTime(record),
              "level": record.levelname,
              "module": record.module,
              "message": record.getMessage(),
              **getattr(record, "extra", {})
          }
          return json.dumps(log_data)
  ```
- [ ] **17.2** Agregar logging al **Orchestrator** (`orchestrator.py`):
  - Al recibir pregunta: `logger.info("Question received", extra={"business_id": ..., "question_length": ...})`
  - Al decidir agentes: `logger.info("Routing to agents", extra={"domains": [...], "escalated": bool})`
  - Al recibir respuestas: `logger.info("Agent responses", extra={"agents_responded": N, "selected": domain})`
  - Tiempo total: `logger.info("Orchestration complete", extra={"duration_ms": ...})`
- [ ] **17.3** Agregar logging a **Sub-agentes** (`sub_agents.py`):
  - Tiempo de busqueda vectorial
  - Tiempo de llamada LLM
  - Cantidad de hechos encontrados
  - Si parseo JSON fallo
- [ ] **17.4** Agregar logging a **Consistency agent**:
  - Cuantos hechos similares encontro
  - Si detecto contradiccion o no
  - Si parseo fallo
- [ ] **17.5** Agregar middleware de request logging en `main.py`:
  ```python
  @app.middleware("http")
  async def log_requests(request, call_next):
      start = time.time()
      response = await call_next(request)
      duration = (time.time() - start) * 1000
      logger.info("Request", extra={
          "method": request.method,
          "path": request.url.path,
          "status": response.status_code,
          "duration_ms": round(duration, 2)
      })
      return response
  ```
- [ ] **17.6** Agregar timing decorator reutilizable:
  ```python
  def timed(func):
      async def wrapper(*args, **kwargs):
          start = time.time()
          result = await func(*args, **kwargs)
          logger.info(f"{func.__name__}", extra={"duration_ms": round((time.time()-start)*1000, 2)})
          return result
      return wrapper
  ```

**Criterio de aceptacion:** Cada pregunta genera un trace completo en los logs: routing decision, agents called, response times, result selection. Los logs son JSON parseables.

---

## 18. Auth: Refresh tokens

**Severidad:** MEDIA
**Archivo:** `backend/app/core/security.py`
**Problema:** El JWT expira en 24h sin mecanismo de renovacion. El usuario debe re-loguearse diariamente.

### Subtareas

- [ ] **18.1** Crear modelo `RefreshToken` en `models.py`:
  ```python
  class RefreshToken(Base):
      __tablename__ = "refresh_tokens"
      id = Column(UUID, primary_key=True, default=uuid4)
      user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
      token_hash = Column(String, nullable=False)  # bcrypt hash del token
      expires_at = Column(DateTime, nullable=False)
      revoked = Column(Boolean, default=False)
      created_at = Column(DateTime, default=func.now())
  ```
- [ ] **18.2** En login, generar access_token (30 min) + refresh_token (7 dias):
  ```python
  access_token = create_access_token(user_id, expires=30)  # minutos
  refresh_token = create_refresh_token(user_id, expires=7*24*60)  # 7 dias
  ```
- [ ] **18.3** Crear endpoint POST `/auth/refresh`:
  ```python
  @router.post("/auth/refresh")
  async def refresh(refresh_token: str, db: AsyncSession):
      # Validar refresh token
      # Verificar no revocado
      # Generar nuevos access + refresh tokens
      # Revocar refresh token anterior (rotation)
      pass
  ```
- [ ] **18.4** Actualizar frontend `api.js` para:
  - Guardar refresh_token en localStorage
  - En interceptor 401: intentar refresh antes de redirigir a login
  ```javascript
  api.interceptors.response.use(null, async (error) => {
      if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          const { data } = await api.post('/auth/refresh', { refresh_token: ... });
          localStorage.setItem('token', data.access_token);
          return api(error.config);  // retry original request
      }
      // redirect to login
  });
  ```
- [ ] **18.5** Agregar endpoint POST `/auth/logout` que revoque el refresh token
- [ ] **18.6** Crear migracion Alembic para tabla refresh_tokens

**Criterio de aceptacion:** Access token dura 30 min. Refresh token renueva transparentemente. Logout revoca refresh. No se pierde la sesion diariamente.

---

## 19. Auth: Flujo de recuperacion de contrasena

**Severidad:** MEDIA
**Archivo:** `backend/app/api/auth.py`, frontend nuevo componente
**Problema:** Si un empleado olvida su contrasena, no hay forma de recuperarla (solo el change-password endpoint que requiere la contrasena actual).

### Subtareas

- [ ] **19.1** Crear tabla `password_reset_tokens` o reusar patron de refresh tokens:
  ```python
  class PasswordResetToken(Base):
      __tablename__ = "password_reset_tokens"
      id = Column(UUID, primary_key=True, default=uuid4)
      user_id = Column(UUID, ForeignKey("users.id"))
      token_hash = Column(String, nullable=False)
      expires_at = Column(DateTime, nullable=False)  # 15 min
      used = Column(Boolean, default=False)
  ```
- [ ] **19.2** Crear endpoint POST `/auth/forgot-password`:
  - Acepta email (owner) o phone (employee)
  - Genera token aleatorio de 6 digitos
  - Guarda hash del token en DB con expiracion 15 min
  - Para owners: envia email (o logea en consola para MVP)
  - Para employees: envia SMS/WhatsApp (o logea en consola)
- [ ] **19.3** Crear endpoint POST `/auth/reset-password`:
  ```python
  @router.post("/auth/reset-password")
  async def reset_password(token: str, new_password: str, db: AsyncSession):
      # Validar token, no expirado, no usado
      # Actualizar password_hash del usuario
      # Marcar token como usado
      pass
  ```
- [ ] **19.4** Crear pagina frontend `ForgotPassword.jsx`:
  - Step 1: ingresar email/telefono
  - Step 2: ingresar codigo de 6 digitos
  - Step 3: ingresar nueva contrasena
- [ ] **19.5** Agregar link "Olvide mi contrasena" en la pagina de Login
- [ ] **19.6** Crear migracion Alembic

**Criterio de aceptacion:** Un usuario puede recuperar su cuenta sin intervencion del dueno. Tokens expiran en 15 min y son de un solo uso.

---

## 20. Auth: Rate limiting por usuario en /ask

**Severidad:** MEDIA
**Archivo:** `backend/app/api/ask.py`
**Problema:** El rate limiting actual es por IP (slowapi). Un usuario autenticado podria spamear preguntas y generar costos excesivos de LLM.

### Subtareas

- [ ] **20.1** Agregar rate limiting por `user_id` en el endpoint `/ask`:
  ```python
  from slowapi import Limiter
  from slowapi.util import get_remote_address

  def get_user_key(request: Request) -> str:
      # Extraer user_id del JWT token
      token = request.headers.get("Authorization", "").replace("Bearer ", "")
      payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
      return f"user:{payload['sub']}"

  limiter = Limiter(key_func=get_user_key)

  @router.post("/ask")
  @limiter.limit("10/minute")  # 10 preguntas por minuto por usuario
  async def ask_question(...):
      pass
  ```
- [ ] **20.2** Agregar rate limiting por `business_id` (limite global del negocio):
  - Free tier: 100 preguntas/dia
  - Si se implementa `plan_tier` en Business (mejora #4), usar para determinar limite
- [ ] **20.3** Retornar header `X-RateLimit-Remaining` en cada respuesta
- [ ] **20.4** Manejar error 429 en frontend — mostrar mensaje amigable:
  ```
  "Has hecho muchas preguntas seguidas. Espera un momento."
  ```
- [ ] **20.5** Agregar configuracion de limites en Settings

**Criterio de aceptacion:** Un usuario no puede hacer mas de 10 preguntas/min. El negocio tiene limite diario. Frontend muestra mensaje cuando se alcanza el limite.

---

## 21. Frontend: Indicador de "escribiendo" y manejo de errores

**Severidad:** MEDIA
**Archivo:** `frontend/src/pages/EmployeeChat.jsx`
**Problema:** No hay feedback claro mientras el agente procesa. Si la API falla, se muestra un error generico sin opcion de reintentar.

### Subtareas

- [ ] **21.1** Agregar estado `isTyping` que se muestre inmediatamente al enviar pregunta:
  ```jsx
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
      setIsTyping(true);
      try {
          const res = await askAPI.ask({ question, session_id });
          // agregar respuesta
      } catch (err) {
          // guardar pregunta fallida para retry
          setFailedMessage({ question, error: err.message });
      } finally {
          setIsTyping(false);
      }
  };
  ```
- [ ] **21.2** Crear componente `TypingIndicator` con animacion de 3 puntos:
  ```jsx
  const TypingIndicator = () => (
      <div className="typing-indicator">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="text">Segundo esta pensando...</span>
      </div>
  );
  ```
- [ ] **21.3** Agregar boton de reintentar en mensajes fallidos:
  ```jsx
  {failedMessage && (
      <div className="error-message">
          <p>No se pudo enviar tu pregunta</p>
          <button onClick={() => handleRetry(failedMessage.question)}>
              Reintentar
          </button>
      </div>
  )}
  ```
- [ ] **21.4** Mostrar error especifico segun status code:
  - 429: "Demasiadas preguntas, espera un momento"
  - 500: "Error del servidor, intenta de nuevo"
  - Network error: "Sin conexion a internet"
- [ ] **21.5** Agregar timeout visual — si pasan mas de 30 seg sin respuesta, mostrar:
  "Esta tardando mas de lo normal. Puedes esperar o reintentar."

**Criterio de aceptacion:** El usuario siempre sabe que su pregunta fue recibida. Si falla, puede reintentar con un click. Errores especificos segun el tipo de fallo.

---

## 22. Frontend: Historial de conversaciones

**Severidad:** MEDIA
**Archivo:** `frontend/src/pages/EmployeeChat.jsx`, nuevo endpoint backend
**Problema:** El empleado no puede ver conversaciones anteriores. Al refrescar la pagina, pierde todo el historial visual.

### Subtareas

- [ ] **22.1** Crear endpoint GET `/sessions` en el backend:
  ```python
  @router.get("/sessions")
  async def list_sessions(db: AsyncSession, current_user: User):
      sessions = await db.execute(
          select(ChatSession)
          .where(ChatSession.user_id == current_user.id)
          .order_by(ChatSession.started_at.desc())
          .limit(20)
      )
      return sessions.scalars().all()
  ```
- [ ] **22.2** Agregar preview del primer mensaje de cada sesion en la respuesta
- [ ] **22.3** Crear componente `SessionSidebar` en el frontend:
  ```jsx
  const SessionSidebar = ({ sessions, activeSession, onSelect }) => (
      <aside className="session-sidebar">
          <h3>Conversaciones</h3>
          {sessions.map(s => (
              <div key={s.id} onClick={() => onSelect(s.id)}
                   className={s.id === activeSession ? 'active' : ''}>
                  <span>{s.preview}</span>
                  <small>{formatDate(s.started_at)}</small>
              </div>
          ))}
      </aside>
  );
  ```
- [ ] **22.4** Al seleccionar una sesion, cargar su historial con `GET /sessions/{id}/history`
- [ ] **22.5** Agregar boton "Nueva conversacion" que limpie el session_id actual
- [ ] **22.6** Hacer responsive: sidebar colapsable en mobile

**Criterio de aceptacion:** El empleado ve sus ultimas 20 conversaciones. Puede navegar entre ellas. El historial persiste al refrescar.

---

## 23. Frontend: Busqueda en base de conocimiento

**Severidad:** BAJA
**Archivo:** `frontend/src/pages/OwnerDashboard.jsx`, `backend/app/api/knowledge.py`
**Problema:** El dueno solo puede scrollear la lista completa de hechos. No puede buscar, filtrar por categoria/dominio, ni paginar.

### Subtareas

- [ ] **23.1** Agregar query params al endpoint GET `/knowledge`:
  ```python
  @router.get("/knowledge")
  async def list_knowledge(
      search: str | None = None,
      category: str | None = None,
      domain: str | None = None,
      page: int = 1,
      page_size: int = 20,
      db: AsyncSession, current_user: User
  ):
      query = select(KnowledgeEntry).where(...)
      if search:
          query = query.where(KnowledgeEntry.processed_fact.ilike(f"%{search}%"))
      if category:
          query = query.where(KnowledgeEntry.category == category)
      if domain:
          query = query.where(KnowledgeEntry.domain == domain)
      query = query.offset((page-1)*page_size).limit(page_size)
      # Tambien retornar total count para paginacion
  ```
- [ ] **23.2** Crear componente `KnowledgeFilters` en el frontend:
  ```jsx
  <div className="knowledge-filters">
      <input placeholder="Buscar..." value={search} onChange={...} />
      <select value={category} onChange={...}>
          <option value="">Todas las categorias</option>
          <option value="precios">Precios</option>
          <option value="procesos">Procesos</option>
          ...
      </select>
      <select value={domain}>...</select>
  </div>
  ```
- [ ] **23.3** Agregar paginacion con botones Anterior/Siguiente
- [ ] **23.4** Debounce en la busqueda (300ms) para no hacer request por cada tecla
- [ ] **23.5** Mostrar contador de resultados: "Mostrando 1-20 de 150 hechos"

**Criterio de aceptacion:** El dueno puede buscar por texto, filtrar por categoria/dominio, y navegar paginas. La busqueda es responsiva.

---

## 24. Frontend: Accesibilidad y mobile

**Severidad:** BAJA
**Archivos:** Todos los componentes en `frontend/src/`
**Problema:** Faltan aria-labels, navegacion por teclado, HTML semantico. Layout se aprieta en mobile.

### Subtareas

- [ ] **24.1** Agregar `aria-label` a todos los botones interactivos:
  - VoiceButton: `aria-label="Grabar mensaje de voz"`
  - Send button: `aria-label="Enviar mensaje"`
  - Tab buttons: `role="tab" aria-selected={active}`
- [ ] **24.2** Usar HTML semantico:
  - Chat messages: `<article role="log" aria-live="polite">`
  - Navigation tabs: `<nav role="tablist">`
  - Input area: `<form role="search">`
- [ ] **24.3** Agregar navegacion por teclado en tabs del dashboard:
  - Arrow keys para mover entre tabs
  - Enter/Space para seleccionar
- [ ] **24.4** Responsive mobile layout:
  - Chat input: stack vertical en pantallas < 640px
  - Dashboard tabs: scroll horizontal en mobile
  - KnowledgeCards: full width en mobile
- [ ] **24.5** Agregar `<meta name="viewport" content="width=device-width, initial-scale=1">` si no existe
- [ ] **24.6** Test con screen reader (NVDA/VoiceOver) en flujos principales

**Criterio de aceptacion:** Score de Lighthouse Accessibility > 90. Todos los flujos navegables con teclado. Layout correcto en 375px.

---

## 25. Frontend: VoiceButton memory leak

**Severidad:** BAJA
**Archivo:** `frontend/src/components/VoiceButton.jsx` linea 30
**Problema:** Se crea un nuevo `AudioContext()` cada vez que se graba pero nunca se cierra. Cada grabacion consume recursos del sistema.

### Subtareas

- [ ] **25.1** Almacenar el AudioContext en un ref y reutilizarlo:
  ```jsx
  const audioCtxRef = useRef(null);

  const getAudioContext = () => {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioCtxRef.current;
  };
  ```
- [ ] **25.2** Cerrar el AudioContext en cleanup del componente:
  ```jsx
  useEffect(() => {
      return () => {
          if (audioCtxRef.current) {
              audioCtxRef.current.close();
          }
      };
  }, []);
  ```
- [ ] **25.3** Tambien limpiar el MediaStream al parar grabacion:
  ```jsx
  stream.getTracks().forEach(track => track.stop());
  ```
- [ ] **25.4** Verificar que no hay leaks con Chrome DevTools Memory panel

**Criterio de aceptacion:** Solo un AudioContext existe a la vez. Se cierra al desmontar el componente. No hay media streams huerfanos.

---

## 26. Feature: Notificaciones al dueno

**Severidad:** MEDIA
**Archivos:** Nuevo sistema de notificaciones
**Problema:** Cuando se escala una pregunta urgente, el dueno solo lo ve si abre manualmente el dashboard. No hay push notifications.

### Subtareas

- [ ] **26.1** Crear modelo `Notification` en `models.py`:
  ```python
  class Notification(Base):
      __tablename__ = "notifications"
      id = Column(UUID, primary_key=True, default=uuid4)
      user_id = Column(UUID, ForeignKey("users.id"))
      type = Column(String)  # escalation, proposal, conflict
      title = Column(String)
      body = Column(String)
      read = Column(Boolean, default=False)
      created_at = Column(DateTime, default=func.now())
  ```
- [ ] **26.2** Crear endpoint GET `/notifications` (lista no leidas) y PATCH `/notifications/{id}/read`
- [ ] **26.3** En `orchestrator.py`, cuando se escala una pregunta, crear notificacion:
  ```python
  notification = Notification(
      user_id=owner.id,
      type="escalation",
      title="Pregunta urgente",
      body=f"Un empleado pregunto: {question[:100]}..."
  )
  db.add(notification)
  ```
- [ ] **26.4** Agregar badge de notificaciones en el dashboard del dueno
- [ ] **26.5** Implementar polling cada 30 seg en el frontend (o WebSocket si se quiere real-time):
  ```jsx
  useEffect(() => {
      const interval = setInterval(async () => {
          const { data } = await api.get('/notifications?unread=true');
          setNotificationCount(data.length);
      }, 30000);
      return () => clearInterval(interval);
  }, []);
  ```
- [ ] **26.6** (Futuro) Agregar email notification para escalaciones criticas

**Criterio de aceptacion:** El dueno ve un badge con la cantidad de notificaciones pendientes. Las escalaciones generan notificacion automatica.

---

## 27. Feature: Analytics y metricas

**Severidad:** BAJA
**Archivos:** Nuevos endpoints + componente dashboard
**Problema:** No hay visibilidad de como se usa el sistema. El dueno no sabe que preguntan mas, que hechos son utiles, ni cuantos empleados usan el sistema.

### Subtareas

- [ ] **27.1** Crear endpoint GET `/analytics/summary`:
  ```python
  {
      "total_questions_today": 45,
      "total_questions_week": 280,
      "resolution_rate": 0.85,  # % respondidas sin escalation
      "top_categories": [{"category": "precios", "count": 120}, ...],
      "top_unanswered_topics": [...],
      "active_employees_today": 8,
      "knowledge_entries_count": 150,
      "knowledge_growth_week": 12  # nuevos hechos esta semana
  }
  ```
- [ ] **27.2** Crear endpoint GET `/analytics/top-questions`:
  - Agrupa preguntas similares (por embedding clustering o keyword extraction)
  - Retorna top 10 temas mas preguntados
- [ ] **27.3** Crear endpoint GET `/analytics/knowledge-usage`:
  - Top 10 hechos mas usados (requiere `usage_count` de mejora #4)
  - Hechos nunca usados (candidatos a revisar/eliminar)
- [ ] **27.4** Crear componente `AnalyticsDashboard` en el frontend:
  - Cards con metricas clave
  - Grafico simple de preguntas por dia (ultimos 7 dias)
  - Lista de top preguntas y top hechos
- [ ] **27.5** Agregar tab "Estadisticas" en el OwnerDashboard
- [ ] **27.6** (Requiere mejora #4 primero) Actualizar `usage_count` y `last_used_at` en cada respuesta

**Criterio de aceptacion:** El dueno tiene visibilidad de uso del sistema. Puede identificar gaps de conocimiento y hechos inactivos.

---

## 28. Feature: Versionado de conocimiento

**Severidad:** BAJA
**Archivos:** Nuevo modelo + modificacion de knowledge CRUD
**Problema:** Cuando un hecho se edita, la version anterior se pierde. No hay auditoria ni rollback.

### Subtareas

- [ ] **28.1** Crear modelo `KnowledgeVersion` en `models.py`:
  ```python
  class KnowledgeVersion(Base):
      __tablename__ = "knowledge_versions"
      id = Column(UUID, primary_key=True, default=uuid4)
      entry_id = Column(UUID, ForeignKey("knowledge_entries.id"))
      processed_fact = Column(Text)
      category = Column(String)
      domain = Column(String)
      changed_by = Column(UUID, ForeignKey("users.id"))
      created_at = Column(DateTime, default=func.now())
  ```
- [ ] **28.2** En `knowledge.py` PATCH endpoint, antes de editar, guardar version:
  ```python
  version = KnowledgeVersion(
      entry_id=entry.id,
      processed_fact=entry.processed_fact,  # valor anterior
      category=entry.category,
      domain=entry.domain,
      changed_by=current_user.id
  )
  db.add(version)
  # luego aplicar cambios al entry
  ```
- [ ] **28.3** Crear endpoint GET `/knowledge/{entry_id}/history`:
  - Retorna todas las versiones de un hecho, ordenadas por fecha
- [ ] **28.4** Crear endpoint POST `/knowledge/{entry_id}/revert/{version_id}`:
  - Restaura el hecho a una version anterior (creando nueva version como auditoria)
- [ ] **28.5** Agregar boton "Ver historial" en `KnowledgeCard` del frontend
- [ ] **28.6** Crear migracion Alembic

**Criterio de aceptacion:** Cada edicion guarda la version anterior. Se puede ver el historial completo. Se puede revertir a cualquier version.

---

## 29. Feature: Templates por industria

**Severidad:** BAJA
**Archivos:** Nuevo sistema de templates
**Problema:** Cada dueno empieza con una base de conocimiento vacia. Para negocios comunes, podriamos proveer un punto de partida.

### Subtareas

- [ ] **29.1** Crear archivo `backend/app/data/templates/` con JSONs por industria:
  ```
  templates/
    restaurante.json
    tienda_ropa.json
    ferreteria.json
    salon_belleza.json
    taller_mecanico.json
  ```
- [ ] **29.2** Cada template contiene hechos de ejemplo:
  ```json
  {
      "industry": "restaurante",
      "name": "Restaurante",
      "facts": [
          {
              "text": "El horario de atencion es de 8am a 10pm de lunes a sabado",
              "category": "horarios",
              "domain": "operaciones"
          },
          {
              "text": "El descuento maximo sin autorizacion del gerente es 10%",
              "category": "precios",
              "domain": "ventas"
          }
      ]
  }
  ```
- [ ] **29.3** Crear endpoint POST `/knowledge/load-template`:
  ```python
  @router.post("/knowledge/load-template")
  async def load_template(industry: str, db: AsyncSession, current_user: User):
      # Cargar JSON
      # Para cada hecho: extraer con memory_agent, generar embedding, guardar
      pass
  ```
- [ ] **29.4** Agregar selector de industria en el registro (o en el dashboard al iniciar)
- [ ] **29.5** Marcar hechos de template como editables ("Personaliza estos ejemplos para tu negocio")
- [ ] **29.6** Requiere campo `industry` en Business (mejora #4)

**Criterio de aceptacion:** Al registrarse, el dueno puede elegir una industria y cargar hechos de ejemplo. Los hechos son editables.

---

## 30. Feature: Bulk upload de conocimiento

**Severidad:** BAJA
**Archivos:** Nuevo endpoint + componente frontend
**Problema:** El dueno solo puede ensenar un texto a la vez. Para negocios con mucha informacion, esto es lento.

### Subtareas

- [ ] **30.1** Crear endpoint POST `/knowledge/bulk-upload`:
  - Acepta archivo CSV o JSON con multiples hechos
  - Formato CSV: `text,category,domain`
  - Formato JSON: `[{"text": "...", "category": "...", "domain": "..."}, ...]`
  ```python
  @router.post("/knowledge/bulk-upload")
  async def bulk_upload(file: UploadFile, db: AsyncSession, current_user: User):
      # Parsear archivo
      # Para cada linea: extraer hechos, generar embedding, guardar
      # Retornar resumen: N hechos guardados, N errores, N conflictos
  ```
- [ ] **30.2** Agregar endpoint POST `/knowledge/bulk-text`:
  - Acepta un texto largo (hasta 20,000 chars)
  - Usa memory_agent para extraer multiples hechos
  - Ideal para pegar manuales de operacion completos
- [ ] **30.3** Crear componente `BulkUpload` en el frontend:
  - Drag & drop de archivo CSV/JSON
  - O textarea para pegar texto largo
  - Barra de progreso durante procesamiento
  - Resumen al terminar: "15 hechos guardados, 2 conflictos detectados"
- [ ] **30.4** Agregar tab o boton "Carga masiva" en el dashboard
- [ ] **30.5** Limitar a 100 hechos por carga (para no explotar costos de embedding)

**Criterio de aceptacion:** El dueno puede subir archivo o pegar texto largo. Se extraen y guardan multiples hechos en una sola operacion.

---

## 31. Feature: Export/backup de conocimiento

**Severidad:** BAJA
**Archivos:** Nuevo endpoint + boton frontend
**Problema:** No hay forma de exportar la base de conocimiento. Si el dueno quiere migrar o hacer backup, pierde todo.

### Subtareas

- [ ] **31.1** Crear endpoint GET `/knowledge/export`:
  ```python
  @router.get("/knowledge/export")
  async def export_knowledge(
      format: str = "json",  # json o csv
      db: AsyncSession, current_user: User
  ):
      entries = await db.execute(
          select(KnowledgeEntry)
          .where(KnowledgeEntry.business_id == current_user.business_id, KnowledgeEntry.is_active == True)
      )
      if format == "csv":
          # Retornar StreamingResponse con CSV
      else:
          # Retornar JSON
  ```
- [ ] **31.2** Incluir en export: processed_fact, category, domain, raw_input, created_at
- [ ] **31.3** Excluir: embeddings (pesados y regenerables), IDs internos
- [ ] **31.4** Agregar boton "Exportar" en la tab Manual del dashboard
- [ ] **31.5** Opciones: JSON (para re-importar) o CSV (para abrir en Excel)

**Criterio de aceptacion:** El dueno puede descargar toda su base de conocimiento en JSON o CSV con un click.

---

## 32. Feature: Resolucion de conflictos con seleccion de hecho ganador

**Severidad:** MEDIA
**Archivo:** `frontend/src/pages/OwnerDashboard.jsx` seccion conflictos, `backend/app/api/proposals.py`
**Problema:** Al resolver un conflicto, solo se marca como "resuelto" sin indicar cual hecho es correcto. No hay opcion de elegir, editar, o eliminar el hecho perdedor.

### Subtareas

- [ ] **32.1** Modificar endpoint POST `/knowledge/conflicts/{id}/resolve`:
  ```python
  class ResolveConflictRequest(BaseModel):
      winner_id: UUID  # ID del hecho que se mantiene
      action_on_loser: str  # "deactivate" | "edit" | "keep_both"
      edited_fact: str | None = None  # si action_on_loser == "edit"

  @router.post("/knowledge/conflicts/{conflict_id}/resolve")
  async def resolve_conflict(conflict_id: UUID, req: ResolveConflictRequest, ...):
      # Marcar conflicto como resuelto
      # Si deactivate: soft-delete el perdedor
      # Si edit: actualizar processed_fact + re-embed
      # Si keep_both: solo marcar resuelto (no son contradictorios)
  ```
- [ ] **32.2** Actualizar UI de conflictos en el dashboard:
  - Mostrar ambos hechos lado a lado
  - Boton "Mantener este" en cada uno
  - Boton "Editar y mantener"
  - Boton "Ambos son correctos" (no son contradictorios)
- [ ] **32.3** Agregar diff visual entre los dos hechos (highlight diferencias)

**Criterio de aceptacion:** El dueno puede elegir que hecho mantener, editar el incorrecto, o indicar que ambos son validos. La accion se refleja en la base de conocimiento.

---

## 33. Infra: Proveedor LLM configurable (Claude vs Ollama)

**Severidad:** ALTA
**Archivo:** `backend/app/services/claude.py`
**Problema:** El archivo se llama `claude.py` pero usa Ollama con llama3.2 (linea 11, 19). El proveedor esta hardcodeado sin forma de cambiar a Claude real.

### Subtareas

- [ ] **33.1** Renombrar `claude.py` a `llm.py` (o `llm_service.py`)
- [ ] **33.2** Crear interfaz abstracta:
  ```python
  class LLMProvider(ABC):
      @abstractmethod
      async def complete(self, prompt: str, system: str, max_tokens: int) -> str: ...

      @abstractmethod
      async def complete_with_tools(self, prompt: str, system: str, tools: list, max_tokens: int) -> ToolResponse: ...
  ```
- [ ] **33.3** Implementar `OllamaProvider` (lo que hay ahora) y `ClaudeProvider` (usando Anthropic SDK):
  ```python
  class ClaudeProvider(LLMProvider):
      def __init__(self):
          self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
          self.model = "claude-sonnet-4-6"

      async def complete(self, prompt, system, max_tokens=512):
          response = self.client.messages.create(
              model=self.model,
              max_tokens=max_tokens,
              system=system,
              messages=[{"role": "user", "content": prompt}]
          )
          return response.content[0].text

      async def complete_with_tools(self, prompt, system, tools, max_tokens=1024):
          # Usar tool_use nativo de Claude
          response = self.client.messages.create(
              model=self.model,
              max_tokens=max_tokens,
              system=system,
              tools=tools,  # Claude soporta tool_use nativo
              messages=[{"role": "user", "content": prompt}]
          )
          return response
  ```
- [ ] **33.4** Agregar setting `LLM_PROVIDER` en config.py: `"claude"` | `"ollama"`
- [ ] **33.5** Factory function que retorna el provider correcto:
  ```python
  def get_llm_provider() -> LLMProvider:
      if settings.llm_provider == "claude":
          return ClaudeProvider()
      return OllamaProvider()
  ```
- [ ] **33.6** Actualizar todas las importaciones en los agentes (orchestrator, sub_agents, memory_agent, consistency_agent)
- [ ] **33.7** Con Claude, aprovechar tool_use nativo en vez de emularlo via JSON en el prompt (elimina el parseo fragil)

**Criterio de aceptacion:** Se puede cambiar entre Claude y Ollama con una variable de entorno. Claude usa tool_use nativo. Ollama mantiene la emulacion actual.

---

## 34. Infra: Connection pooling de base de datos

**Severidad:** BAJA
**Archivo:** `backend/app/db/session.py`
**Problema:** La conexion a PostgreSQL no tiene pool_size configurado. En produccion con multiples requests concurrentes, puede agotar las conexiones.

### Subtareas

- [ ] **34.1** Configurar pool en `create_async_engine`:
  ```python
  engine = create_async_engine(
      settings.database_url,
      pool_size=10,        # conexiones base
      max_overflow=20,     # conexiones extra en picos
      pool_timeout=30,     # segundos esperando conexion
      pool_recycle=1800,   # reciclar conexiones cada 30 min
      pool_pre_ping=True,  # verificar conexion antes de usar
  )
  ```
- [ ] **34.2** Agregar estos valores como settings configurables:
  ```python
  db_pool_size: int = 10
  db_max_overflow: int = 20
  db_pool_timeout: int = 30
  ```
- [ ] **34.3** Agregar health check endpoint que muestre estado del pool:
  ```python
  @app.get("/health")
  async def health():
      pool = engine.pool
      return {
          "status": "ok",
          "db_pool_size": pool.size(),
          "db_pool_checkedout": pool.checkedout(),
          "db_pool_overflow": pool.overflow()
      }
  ```
- [ ] **34.4** Verificar que funciona con multiples requests concurrentes (wrk o similar)

**Criterio de aceptacion:** El pool de conexiones esta configurado. El health check muestra metricas del pool. No hay agotamiento bajo carga.

---

## 35. Feature: Sources/fuentes en respuestas

**Severidad:** MEDIA
**Archivos:** `backend/app/agents/orchestrator.py` linea 349, `backend/app/agents/sub_agents.py`, `frontend/src/components/ChatMessage.jsx`
**Problema:** El schema `AskResponse` tiene campo `sources` pero siempre retorna array vacio. Los hechos usados para generar la respuesta nunca se pasan al frontend.

### Subtareas

- [ ] **35.1** Modificar sub-agentes para retornar los IDs de hechos usados:
  ```python
  class AgentResponse(BaseModel):
      found: bool
      answer: str
      source_ids: list[UUID] = []  # IDs de knowledge_entries usados
  ```
- [ ] **35.2** En `search_tools.py`, retornar IDs junto con los textos de hechos
- [ ] **35.3** En `orchestrator.py`, pasar los source_ids a la respuesta final:
  ```python
  return AskResponse(
      response=answer,
      sources=[
          SourceEntry(entry_id=sid, fact=fact_text)
          for sid, fact_text in zip(source_ids, source_texts)
      ],
      confidence=confidence,
      ...
  )
  ```
- [ ] **35.4** Actualizar `ChatMessage` en `models.py` para guardar `knowledge_used` correctamente
- [ ] **35.5** En el frontend, mostrar fuentes colapsables debajo de cada respuesta:
  ```jsx
  {message.sources?.length > 0 && (
      <details className="sources">
          <summary>Basado en {message.sources.length} hecho(s)</summary>
          <ul>
              {message.sources.map(s => <li key={s.entry_id}>{s.fact}</li>)}
          </ul>
      </details>
  )}
  ```
- [ ] **35.6** Esto alimenta `usage_count` (mejora #4) — incrementar cada entry usado

**Criterio de aceptacion:** Cada respuesta muestra las fuentes en las que se baso. El empleado puede expandirlas para ver los hechos exactos.

---

## Orden de implementacion sugerido

### Fase 1 — Critico (seguridad + bugs)
1. Mejora #1 — SQL Injection
2. Mejora #5 — Flush en teach
3. Mejora #6 — Await en proposals
4. Mejora #7 — Endpoints faltantes
5. Mejora #33 — LLM provider configurable

### Fase 2 — Performance + estabilidad
6. Mejora #2 — Indices DB
7. Mejora #3 — Soft delete
8. Mejora #8 — Config settings
9. Mejora #9 — Parseo JSON robusto
10. Mejora #12 — Chat history query
11. Mejora #16 — Filtrado en SQL
12. Mejora #17 — Logging

### Fase 3 — Auth + UX
13. Mejora #18 — Refresh tokens
14. Mejora #19 — Recuperacion password
15. Mejora #20 — Rate limiting usuario
16. Mejora #21 — Typing indicator + errores
17. Mejora #25 — VoiceButton memory leak

### Fase 4 — Features de producto
18. Mejora #10 — Sub-agentes paralelos
19. Mejora #11 — Seleccion por relevancia
20. Mejora #13 — Consistency agent robusto
21. Mejora #14 — Re-check al editar
22. Mejora #35 — Sources en respuestas
23. Mejora #22 — Historial conversaciones
24. Mejora #32 — Resolucion conflictos mejorada

### Fase 5 — Producto avanzado
25. Mejora #4 — Campos faltantes modelos
26. Mejora #15 — Cache embeddings
27. Mejora #23 — Busqueda conocimiento
28. Mejora #26 — Notificaciones
29. Mejora #27 — Analytics
30. Mejora #34 — Connection pooling

### Fase 6 — Nice to have
31. Mejora #24 — Accesibilidad
32. Mejora #28 — Versionado conocimiento
33. Mejora #29 — Templates industria
34. Mejora #30 — Bulk upload
35. Mejora #31 — Export/backup
