# Prompt para Claude Code — Implementación de Segundo v2.0

Pega este prompt completo en una nueva sesión de Claude Code.

---

## CONTEXTO DEL PROYECTO

Estás trabajando en **Segundo** — un agente de onboarding institucional para pequeñas empresas latinoamericanas (3-15 empleados). El MVP v1 ya existe en `segundo/`. Tu tarea es construir la **versión 2.0** encima del código existente, sin romper lo que ya funciona.

### Qué resuelve Segundo

El dueño de un negocio pierde 3-5 días capacitando a cada empleado nuevo. Si el empleado renuncia, ese conocimiento se va con él. Segundo convierte ese conocimiento en un activo digital que trabaja 24/7.

### Stack existente (NO cambiar)
- Backend: `segundo/backend/` — FastAPI + SQLAlchemy async + pgvector + Anthropic SDK
- Frontend: `segundo/frontend/` — React 18 + Vite + Tailwind + Zustand
- DB: PostgreSQL + pgvector en Supabase (columna `embedding_vec` en `knowledge_entries`)
- Embeddings: Voyage AI (voyage-3) via `VOYAGE_API_KEY`, fallback a mock
- Modelo Claude: `claude-sonnet-4-6`

### Problema con v1 (lo que vas a mejorar)
El v1 tiene tres "agentes" que son en realidad funciones secuenciales:
- `memory_agent.py` — extrae hechos con Claude, los guarda
- `response_agent.py` — genera respuesta con Claude dado contexto RAG
- `orchestrator.py` — llama a search → response en secuencia fija

No hay tool use, no hay routing inteligente, no hay agentes que se comuniquen entre sí.

---

## LO QUE VAS A CONSTRUIR — Segundo v2.0

### Visión general

```
ANTES (v1):
/ask → search_knowledge() → generate_response() → respuesta

DESPUÉS (v2):
/ask → OrchestratorAgent (Claude con tools) → decide qué hacer
         ├── tool: search_ventas()      → RAG sobre precios/descuentos
         ├── tool: search_operaciones() → RAG sobre proveedores/inventario
         ├── tool: search_clientes()    → RAG sobre clientes VIP/historial
         ├── tool: escalate_to_owner()  → tema sensible, notifica al dueño
         └── tool: save_new_knowledge() → detectó info nueva, propone guardarla
```

El orchestrator es Claude usando tool use real — no un switch/if. Claude decide qué herramientas llamar, en qué orden, y cómo sintetizar.

---

## MINI TAREAS — Orden de implementación

Implementa una tarea a la vez. Verifica que funciona antes de pasar a la siguiente. Si algo falla, diagnóstica y arregla antes de continuar.

---

### TAREA 1 — Crear categorías especializadas en la BD

**Objetivo**: Que el knowledge base tenga dominios separados para poder hacer RAG especializado.

**Archivo a modificar**: `segundo/backend/alembic/versions/` — crear nueva migración

**Qué hacer**:
1. Leer los modelos actuales en `segundo/backend/app/db/models.py`
2. Agregar campo `domain` a `knowledge_entries` con enum: `ventas`, `operaciones`, `clientes`, `legal`, `general`
3. Crear migración Alembic: `alembic revision --autogenerate -m "add_domain_to_knowledge"`
4. Verificar que la migración es correcta antes de aplicar
5. Aplicar: `alembic upgrade head`

**Regla de categorización**:
```
category existente → domain
precios            → ventas
descuentos         → ventas
proveedores        → operaciones
inventario         → operaciones
horarios           → operaciones
clientes           → clientes
procesos           → general
legal              → legal
otro               → general
```

**Verificación**: `SELECT domain, COUNT(*) FROM knowledge_entries GROUP BY domain;` debe correr sin error.

---

### TAREA 2 — Implementar search tools especializados

**Objetivo**: Funciones de búsqueda RAG separadas por dominio, que el orchestrator pueda llamar como tools.

**Archivo a crear**: `segundo/backend/app/agents/search_tools.py`

**Qué implementar**:

```python
# Cada función hace lo mismo que search_knowledge() actual
# pero filtra por domain además de business_id

async def search_ventas(question: str, business_id: UUID, db: AsyncSession) -> list[dict]:
    """Busca en knowledge entries de dominio 'ventas'."""
    # Misma query SQL que orchestrator.py:search_knowledge
    # Agregar: AND domain = 'ventas'
    pass

async def search_operaciones(question: str, business_id: UUID, db: AsyncSession) -> list[dict]:
    """Busca en knowledge entries de dominio 'operaciones'."""
    pass

async def search_clientes(question: str, business_id: UUID, db: AsyncSession) -> list[dict]:
    """Busca en knowledge entries de dominio 'clientes'."""
    pass

async def search_general(question: str, business_id: UUID, db: AsyncSession) -> list[dict]:
    """Busca en todos los dominios (fallback)."""
    # Sin filtro de domain
    pass
```

**Verificación**: Importar cada función en un script simple y verificar que no hay errores de sintaxis ni imports rotos.

---

### TAREA 3 — Implementar el Orchestrator Agent con tool use real

**Objetivo**: Reemplazar el orchestrator actual (función secuencial) con un agente Claude que usa tool use para decidir qué buscar.

**Archivo a modificar**: `segundo/backend/app/agents/orchestrator.py`

**Arquitectura del nuevo orchestrator**:

```python
# Tool definitions para Claude
TOOLS = [
    {
        "name": "search_ventas",
        "description": "Busca información sobre precios, descuentos, promociones y políticas de venta del negocio.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "La búsqueda a realizar"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "search_operaciones",
        "description": "Busca información sobre proveedores, inventario, horarios, procesos internos y turnos.",
        "input_schema": { ... }
    },
    {
        "name": "search_clientes",
        "description": "Busca información sobre clientes específicos, historial, clientes VIP y preferencias.",
        "input_schema": { ... }
    },
    {
        "name": "search_general",
        "description": "Búsqueda general cuando la pregunta no encaja claramente en ventas, operaciones o clientes.",
        "input_schema": { ... }
    },
    {
        "name": "escalate_to_owner",
        "description": "Usa esto cuando la pregunta involucra dinero que no cuadra, conflictos graves con clientes, decisiones legales, o cualquier situación que requiere decisión del dueño.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string", "description": "Por qué se escala al dueño"},
                "urgency": {"type": "string", "enum": ["alta", "media"], "description": "Urgencia del escalamiento"}
            },
            "required": ["reason", "urgency"]
        }
    },
    {
        "name": "flag_new_knowledge",
        "description": "Usa esto cuando el empleado comparte información nueva sobre cómo resolvió algo que Segundo no sabía. Propone guardar ese conocimiento.",
        "input_schema": {
            "type": "object",
            "properties": {
                "knowledge": {"type": "string", "description": "El conocimiento nuevo detectado"},
                "category": {"type": "string", "description": "Categoría del conocimiento"}
            },
            "required": ["knowledge", "category"]
        }
    }
]
```

**Flujo del orchestrator**:

```python
async def handle_ask_v2(question, user_id, business_id, business_name, session_id_str, db):
    # 1. Obtener o crear sesión (igual que v1)
    # 2. Obtener historial (igual que v1)
    # 3. Primera llamada a Claude con tools disponibles
    # 4. Loop: mientras Claude devuelva tool_use:
    #    a. Ejecutar la tool llamada
    #    b. Devolver resultado a Claude
    # 5. Claude genera respuesta final (cuando devuelve end_turn)
    # 6. Si tool escalate_to_owner fue llamada → guardar en unanswered_questions
    # 7. Si tool flag_new_knowledge fue llamada → guardar propuesta pendiente
    # 8. Guardar mensajes en BD
    # 9. Retornar respuesta
```

**System prompt del orchestrator**:

```
Eres "Segundo", el asistente interno de {business_name}.
Ayudas a los empleados nuevos respondiendo sus preguntas sobre cómo funciona el negocio.

INSTRUCCIONES:
1. Analiza la pregunta y decide qué herramienta(s) usar para buscar información relevante
2. Puedes usar múltiples herramientas si la pregunta toca varios dominios
3. Si la pregunta involucra dinero que no cuadra, conflictos legales o decisiones críticas → usa escalate_to_owner
4. Si el empleado menciona cómo resolvió algo que no estaba en el manual → usa flag_new_knowledge
5. Cuando tengas suficiente información, responde de forma clara y directa
6. Si no encontraste información relevante, di que no tienes esa información y que le avisarás al encargado

Habla como un colega con experiencia, no como un manual. Sé amigable y directo.
```

**IMPORTANTE — Usar el cliente Claude existente**: No crear un cliente nuevo. Usar `app/services/claude.py` que ya existe. Si `complete()` no soporta tools, crear `complete_with_tools()` en el mismo archivo.

**Verificación**: Crear un test simple:
```python
# test_orchestrator_v2.py
# Simular una pregunta sobre precios con mock de BD
# Verificar que Claude llama search_ventas y no search_operaciones
```

---

### TAREA 4 — Actualizar el Memory Agent con detección de dominio

**Objetivo**: Cuando el dueño enseña al agente, el sistema detecta automáticamente en qué dominio cae el conocimiento.

**Archivo a modificar**: `segundo/backend/app/agents/memory_agent.py`

**Cambio al JSON de respuesta de Claude**:

```python
# Agregar campo "domain" al schema de respuesta
MEMORY_SYSTEM_PROMPT = """
...
Responde SIEMPRE en JSON válido con este formato:
{
  "facts": [
    {
      "fact": "el hecho reformulado claramente",
      "category": "string",  # precios | procesos | clientes | proveedores | horarios | otro
      "domain": "string",    # ventas | operaciones | clientes | legal | general
      "needs_clarification": false,
      "clarification_question": null
    }
  ]
}

Reglas para domain:
- ventas: precios, descuentos, comisiones, políticas de venta, promociones
- operaciones: proveedores, inventario, horarios, turnos, procesos internos
- clientes: clientes específicos, historial, preferencias, VIPs
- legal: contratos, garantías, devoluciones, temas legales
- general: todo lo demás
"""
```

**Actualizar el endpoint `/teach`**: guardar `domain` en la BD junto con los demás campos.

**Verificación**: Llamar a `/teach` con "El proveedor de lácteos llega los martes" → verificar que `domain = 'operaciones'` en la BD.

---

### TAREA 5 — Agente de Consistencia (detecta contradicciones)

**Objetivo**: Después de cada `/teach`, verificar si el nuevo hecho contradice alguno existente.

**Archivo a crear**: `segundo/backend/app/agents/consistency_agent.py`

**Cómo funciona**:

```python
async def check_consistency(
    new_fact: str,
    business_id: UUID,
    db: AsyncSession,
) -> dict:
    """
    1. Busca en BD los hechos más similares al nuevo (top-3, sin threshold)
    2. Le pregunta a Claude: "¿Este hecho nuevo contradice alguno de los existentes?"
    3. Si hay contradicción → retorna {"contradiction": True, "conflicting_fact_id": "...", "explanation": "..."}
    4. Si no → retorna {"contradiction": False}
    """
    pass
```

**Integrar en `/teach`**: Después de guardar el hecho nuevo, llamar a `check_consistency()`. Si hay contradicción, incluir en la respuesta de `/teach` una advertencia:

```json
{
  "status": "saved",
  "facts_saved": 1,
  "warning": {
    "type": "contradiction_detected",
    "message": "Este hecho puede contradecir una regla existente",
    "conflicting_fact": "Texto del hecho en conflicto",
    "action_required": true
  }
}
```

**Agregar endpoint**: `GET /knowledge/conflicts` — lista todos los conflictos detectados pendientes de resolución por el dueño.

**Verificación**:
1. Enseñar: "El descuento máximo es 10%"
2. Enseñar: "Los clientes VIP pueden pedir hasta 20% de descuento"
3. Verificar que el sistema detecta la contradicción potencial y la reporta

---

### TAREA 6 — Loop de Aprendizaje (Knowledge Loop)

**Objetivo**: Cuando el empleado resuelve algo nuevo, Segundo lo detecta y propone guardarlo.

**Cambios necesarios**:

1. **Nueva tabla**: `knowledge_proposals`
   ```sql
   CREATE TABLE knowledge_proposals (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     business_id UUID NOT NULL REFERENCES businesses(id),
     proposed_fact TEXT NOT NULL,
     domain VARCHAR(50),
     category VARCHAR(50),
     source_message_id UUID REFERENCES chat_messages(id),
     status VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **En el orchestrator v2**: Cuando Claude llama `flag_new_knowledge`, guardar en `knowledge_proposals` (no en `knowledge_entries` todavía — necesita aprobación del dueño).

3. **Nuevos endpoints**:
   - `GET /proposals` — owner ve propuestas pendientes
   - `POST /proposals/{id}/approve` — aprueba → mueve a `knowledge_entries`
   - `POST /proposals/{id}/reject` — rechaza → marca como rejected

4. **En la respuesta del chat al empleado**: Si Claude flaggeó conocimiento nuevo, agregar al response:
   ```json
   {
     "response": "Entendido, [respuesta normal]",
     "knowledge_flagged": true,
     "message": "Guardé eso como posible conocimiento nuevo para que el encargado lo valide."
   }
   ```

**Verificación**:
1. Empleado dice: "Acabo de resolver una devolución diciéndole al cliente que tiene 7 días"
2. Verificar que Segundo detecta que es info nueva, pregunta "¿Eso es la política oficial?", guarda en proposals
3. Owner ve la propuesta en `GET /proposals` y puede aprobarla

---

### TAREA 7 — Briefing Diario Proactivo

**Objetivo**: Un job que corre diariamente y genera un resumen contextual para el empleado basado en el día de la semana, historial y knowledge base.

**Archivo a crear**: `segundo/backend/app/agents/briefing_agent.py`

**Cómo funciona**:

```python
async def generate_daily_briefing(
    business_id: UUID,
    employee_id: UUID,
    db: AsyncSession,
) -> str:
    """
    Genera un briefing personalizado para el empleado.

    Contexto que usa:
    - Día de la semana actual
    - Knowledge entries del negocio (filtradas por relevancia temporal)
    - Historial de preguntas frecuentes de esa semana
    - Preguntas sin respuesta pendientes (para que el empleado esté alerta)

    Ejemplo de output:
    "Buenos días. Hoy es martes, día en que normalmente llega el proveedor de lácteos.
    Si no llega antes de las 10am, llama al número registrado. Recuerda que esta semana
    hay 2 preguntas sobre devoluciones sin resolver — si surge una, escala al encargado."
    """
    pass
```

**Exponer como endpoint** (no como cron todavía — eso viene después):
- `POST /briefing/generate` — genera y retorna el briefing
- `GET /briefing/latest` — retorna el último briefing generado para el empleado

**Verificación**: Llamar a `POST /briefing/generate` y verificar que el texto menciona el día de la semana y algún contexto relevante del knowledge base.

---

### TAREA 8 — Actualizar el frontend

**Objetivo**: El frontend v2 debe mostrar las nuevas capacidades.

**Cambios en la vista del empleado (Chat)**:

1. Si `response.knowledge_flagged = true` → mostrar badge "Conocimiento nuevo detectado"
2. Si `response.confidence = "escalated"` → mostrar "Escalado al encargado" con ícono diferente
3. Mostrar qué herramienta usó el agente (opcional, modo debug): "Encontré esto en: Ventas"

**Cambios en la vista del dueño**:

1. Nueva sección "Conflictos detectados" — lista `GET /knowledge/conflicts`
2. Nueva sección "Propuestas de conocimiento" — lista `GET /proposals` con botones Aprobar/Rechazar
3. Sección existente "Preguntas sin respuesta" — ya existe, verificar que sigue funcionando

**Verificación**: Navegar por todas las vistas sin errores de consola. Verificar que las nuevas secciones cargan aunque estén vacías.

---

### TAREA 9 — Deploy

**Objetivo**: Tener Segundo v2 corriendo en producción.

**Backend** (elegir una opción):
- **Render** (recomendado): Crear `segundo/backend/Dockerfile` si no existe, conectar repo en render.com, configurar variables de entorno
- **Railway**: Conectar repo, configurar build command y start command

**Variables de entorno requeridas**:
```
DATABASE_URL=postgresql+asyncpg://...  # Supabase connection string
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=string-aleatoria-segura
VOYAGE_API_KEY=pa-...  # Opcional, usar mock si no hay
CORS_ORIGINS=https://tu-frontend.vercel.app
```

**Frontend** (Vercel — ya conectado):
1. Actualizar `VITE_API_URL` en Vercel con la URL del backend en producción
2. Deploy automático desde el repo

**Verificación final**:
1. `curl https://tu-backend.render.com/health` → 200 OK
2. Registrar un negocio, enseñar 3 hechos, preguntar desde la cuenta de empleado
3. Verificar que las herramientas del orchestrator aparecen en logs

---

## REGLAS GENERALES — Leer antes de empezar

### Lo que NO debes hacer
- No reemplazar el cliente Claude existente en `app/services/claude.py` — extiéndelo
- No eliminar endpoints existentes — agrega nuevos
- No cambiar el schema de tablas existentes si hay datos — solo agrega columnas con DEFAULT
- No cambiar el flujo de `/auth` — funciona bien
- No usar `asyncio.run()` dentro de código async — usar `await` siempre

### Principios de implementación
- Una tarea a la vez, verificar antes de continuar
- Si un test falla, leer el error completo antes de intentar arreglar
- Si hay un error de imports, verificar que el módulo existe antes de asumir un typo
- Para Claude tool use: siempre manejar el caso donde Claude no llama ninguna tool (respuesta directa)
- Para queries SQL con pgvector: el operador `<=>` es cosine distance, `1 - (<=>)` es similarity

### Patrón para Claude tool use (referencia)

```python
from anthropic import Anthropic

client = Anthropic()

def run_agent_loop(system: str, messages: list, tools: list, db_context: dict) -> tuple[str, list]:
    """
    Loop estándar de tool use con Claude.
    Retorna (respuesta_final, tools_called)
    """
    tools_called = []

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            tools=tools,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            # Claude terminó, extraer texto de respuesta
            text = next(b.text for b in response.content if b.type == "text")
            return text, tools_called

        if response.stop_reason == "tool_use":
            # Claude quiere usar una tool
            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

            # Agregar respuesta de Claude al historial
            messages.append({"role": "assistant", "content": response.content})

            # Ejecutar cada tool y agregar resultado
            tool_results = []
            for tool_use in tool_use_blocks:
                result = execute_tool(tool_use.name, tool_use.input, db_context)
                tools_called.append(tool_use.name)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": str(result),
                })

            messages.append({"role": "user", "content": tool_results})
            # Continuar el loop — Claude procesará los resultados
```

---

## VERIFICACIÓN FINAL DEL SISTEMA

Cuando todas las tareas estén completas, ejecutar este flujo de extremo a extremo:

1. **Registrar negocio** (`POST /auth/register`)
2. **Enseñar 5 hechos** de diferentes dominios:
   - "El precio del producto X es $15.000"  → debe ser domain=ventas
   - "El proveedor de lácteos llega los martes" → domain=operaciones
   - "Carlos del conjunto Los Pinos siempre pide descuento" → domain=clientes
   - "El descuento máximo es 10%" → domain=ventas
   - "Los clientes VIP pueden pedir 15%" → esto debe disparar alerta de contradicción con el anterior
3. **Invitar empleado** (`POST /invite`)
4. **Preguntar como empleado**:
   - "¿Cuánto cuesta el producto X?" → debe llamar search_ventas
   - "¿Qué hago si el proveedor no llega?" → debe llamar search_operaciones
   - "Un cliente dice que le robamos dinero" → debe llamar escalate_to_owner
   - "Acabo de decirle a un cliente que puede devolver en 7 días" → debe llamar flag_new_knowledge
5. **Verificar como owner**:
   - `GET /knowledge/conflicts` → debe mostrar el conflicto de descuentos
   - `GET /proposals` → debe mostrar la propuesta de política de devoluciones
   - `GET /unanswered` → debe mostrar el escalamiento del cliente que "robamos dinero"

Si los 5 pasos pasan sin errores críticos, el v2 está funcionando.

---

## ARCHIVOS CLAVE — Referencias rápidas

```
segundo/backend/
├── main.py                          # FastAPI app, incluye routers
├── app/
│   ├── agents/
│   │   ├── orchestrator.py          # MODIFICAR (Tarea 3)
│   │   ├── memory_agent.py          # MODIFICAR (Tarea 4)
│   │   ├── response_agent.py        # Dejar como fallback
│   │   ├── search_tools.py          # CREAR (Tarea 2)
│   │   ├── consistency_agent.py     # CREAR (Tarea 5)
│   │   └── briefing_agent.py        # CREAR (Tarea 7)
│   ├── api/
│   │   ├── ask.py                   # MODIFICAR para usar orchestrator v2
│   │   ├── teach.py                 # MODIFICAR para guardar domain + consistency check
│   │   ├── knowledge.py             # MODIFICAR para agregar /conflicts
│   │   └── proposals.py             # CREAR (Tarea 6)
│   ├── db/
│   │   └── models.py                # MODIFICAR (Tarea 1, 6)
│   └── services/
│       └── claude.py                # EXTENDER con complete_with_tools()
segundo/frontend/
├── src/
│   ├── pages/                       # MODIFICAR vistas (Tarea 8)
│   └── services/                    # MODIFICAR API calls
```
