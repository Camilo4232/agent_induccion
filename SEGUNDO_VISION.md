# Segundo 2.0 — El Sistema Nervioso del Negocio

> *"Segundo convierte el conocimiento tácito de tu negocio en un activo digital que trabaja 24/7, aprende solo, y nunca renuncia."*

---

## El problema real (más profundo de lo que parece)

Cuando una empresa pequeña contrata a alguien nuevo, el dueño pierde 3-5 días enseñando. Si el empleado renuncia, ese conocimiento se va con él. Este ciclo se repite indefinidamente.

Pero hay un problema más grande: **el conocimiento del negocio nunca existió como activo**. Vive en la cabeza del dueño. No se puede transferir, escalar, ni proteger.

Segundo resuelve eso.

---

## El cambio de paradigma

| Segundo 1.0 (MVP actual) | Segundo 2.0 |
|---|---|
| El dueño enseña manualmente | El sistema aprende observando (WhatsApp, Gmail, POS) |
| Un agente genérico | Equipo de agentes especializados |
| Reactivo: espera pregunta | Proactivo: habla primero al empleado |
| Manual que se desactualiza | Base de conocimiento que crece sola |
| Sin visibilidad para el dueño | Dashboard: espejo del negocio |

---

## Las 5 mejoras que multiplican el valor x10

### 1. El dueño ya no "entrena" — Segundo observa y aprende solo

**Problema del MVP**: el dueño tiene que sentarse a enseñar. Eso es fricción. Nadie lo hace consistentemente.

**La mejora**: Segundo se conecta a lo que el negocio ya usa:

```
WhatsApp Business API → analiza conversaciones con clientes
Gmail / correo        → lee cómo el dueño responde
Facturas / POS        → entiende precios y descuentos reales
```

Un agente extractor corre en background, lee los últimos 6 meses y construye solo el manual del negocio. El dueño solo **valida**, no crea.

> "Noté que le das 15% de descuento a clientes que llevan más de 6 meses. ¿Lo agrego como regla?" → Sí / No

---

### 2. Multi-agente real: un equipo especializado

En lugar de un agente genérico que sabe todo, agentes especializados:

```
Segundo-Ventas      → precios, objeciones, promociones
Segundo-Operaciones → proveedores, inventario, turnos
Segundo-Clientes    → historial VIP, quejas frecuentes
Segundo-Legal       → garantías, devoluciones, contratos simples

         ↑
    Orchestrator
    (decide a cuál preguntar, sintetiza respuesta)
```

El empleado habla con uno solo. Por detrás, el orquestador routea y sintetiza.

---

### 3. De reactivo a proactivo con push inteligente

El empleado nuevo llega. Segundo ya sabe que:
- Hoy es martes → el proveedor de lácteos debería llegar
- Es quincena → hay más devoluciones históricamente
- Hay un cliente VIP que no ha comprado en 3 semanas

**Segundo le habla primero:**

> "Buenos días Luis. Hoy es día de inventario de lácteos. Si el proveedor no llega antes de las 10am, llama al 310-xxx. También hay 3 clientes VIP que no han visitado — ¿quieres sus datos para hacer seguimiento?"

---

### 4. El loop de aprendizaje en tiempo real

Cuando el empleado resuelve algo nuevo que Segundo no sabía:

```
Empleado: "Un cliente preguntó si aceptamos Nequi para domicilios"
Segundo:  "No tenía esa info. ¿Cómo lo resolviste?"
Empleado: "Le dije que sí, damos el número del dueño"
Segundo:  "Lo agrego al manual. ¿Le aviso al dueño para que confirme?"
```

El conocimiento del negocio **crece solo** con cada interacción.

---

### 5. Visibility layer — el espejo del negocio

El dueño ve lo que pasa cuando él no está:

- "Esta semana preguntaron 12 veces sobre devoluciones → quizás deberías simplificar esa política"
- "El empleado nuevo tiene 89% de tasa de resolución → está aprendiendo bien"
- "Detecté que estás dando 20% de descuento informalmente → $340.000/mes en margen perdido"

---

## Lecciones de las preguntas clave

### ¿Quién detecta cuando el dueño se equivoca?
**El agente lo detecta solo.** Si dos hechos contradictorios existen en la base de conocimiento, el sistema alerta al dueño automáticamente para resolver el conflicto. Esto requiere un agente de consistencia que corra en background después de cada `/teach`.

### ¿Cuándo tiene más impacto Segundo?
**Dos momentos críticos:**

1. **Cuando el dueño no está** — el empleado está solo atendiendo y llega una situación que no sabe manejar: descuento inusual, queja difícil, situación rara. Segundo es el colega con experiencia que siempre está disponible.

2. **En los primeros 30 días** — las dudas van cambiando semana a semana. El valor es acumulativo. El empleado construye competencia gradualmente apoyándose en Segundo.

### ¿Qué hace con temas delicados?
Escalamiento inmediato al dueño + contexto completo de la situación. Para temas sensibles (dinero, conflictos, legal), Segundo no improvisa — notifica con toda la información necesaria para que el dueño tome la decisión.

---

## Arquitectura técnica Segundo 2.0

```
┌────────────────────────────────────────────────────┐
│                  CAPA DE INGESTA                    │
│  WhatsApp → Extractor Agent → Knowledge Graph       │
│  Gmail    →      ↑            (Supabase pgvector)  │
│  POS/CSV  →      ↑                                 │
└────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────┐
│               ORCHESTRATOR AGENT                   │
│        (Claude con tool use + routing)             │
│  • Clasifica intención y urgencia                  │
│  • Routea al agente especialista correcto          │
│  • Detecta temas sensibles → escala                │
│  • Detecta conocimiento nuevo → loop de aprendizaje│
│  • Detecta contradicciones → alerta al dueño       │
└────────────────────────────────────────────────────┘
        ↓              ↓              ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Agente Ventas│ │Agente Ops   │ │Agente Cliente│
│(RAG precios,│ │(RAG proveed,│ │(CRM + histo- │
│descuentos)  │ │inventario)  │ │rial, VIPs)   │
└─────────────┘ └─────────────┘ └─────────────┘
                       ↓
┌────────────────────────────────────────────────────┐
│                  CAPA DE SALIDA                    │
│  Chat empleado (WhatsApp / Web)                    │
│  Dashboard dueño (analytics + validaciones)        │
│  Alertas proactivas (push)                         │
└────────────────────────────────────────────────────┘
```

---

## Roadmap rediseñado — 4 semanas

| Semana | Entregable |
|---|---|
| 1 | Agentes reales con tool use (orchestrator que decide, no que ejecuta en secuencia fija) |
| 2 | Agente extractor: ingiere WhatsApp/Gmail y genera borrador del manual automáticamente |
| 3 | Loop de aprendizaje: detecta conocimiento nuevo + agente de consistencia (detecta contradicciones) |
| 4 | Dashboard del dueño + alertas proactivas + demo con negocio real |

---

## El moat real — ventaja defensible

Cada negocio que usa Segundo genera un **grafo de conocimiento único e irrepetible**. Después de 3 meses de uso, ese grafo vale más que cualquier feature.

Nadie puede copiarlo porque vive en las conversaciones reales de ese negocio específico.

Eso convierte a Segundo de un SaaS en **infraestructura crítica** — como el POS o el WhatsApp Business.

---

## Modelo de negocio

**Primario**: Suscripción mensual $20-30 USD por negocio
- Argumento principal: *"Te devuelvo los 3-5 días que pierdes capacitando a cada empleado nuevo"*
- Argumento de retención: *"Cuando alguien renuncia, su conocimiento se queda en tu negocio"*
- Argumento de autonomía: *"Tu negocio funciona sin que estés presente"*

**Mercado objetivo**: Negocios de 3-15 empleados en Latinoamérica
- Tiendas, restaurantes, ferreterías, consultorios, talleres
- 90% del tejido empresarial regional
- Sin solución de onboarding existente para este segmento

**Por qué $20-30 USD funciona**: Una hora del tiempo del dueño vale más que un mes de suscripción.
