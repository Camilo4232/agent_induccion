# Segundo — Pitch Video (Remotion)

Pitch de 45 segundos (1350 frames a 30fps, 1920x1080) construido con Remotion. Enfoque: **problema real → producto en pantalla → valor para el negocio**.

## Setup

```bash
cd segundo/video
npm install
npm run dev          # abre Remotion Studio en http://localhost:3000
```

## Render

```bash
npm run build        # MP4 H.264 → out/segundo-pitch.mp4
npm run build:webm   # WebM VP8 → out/segundo-pitch.webm
npm run still        # PNG poster del frame 0 → out/poster.png
```

## Estructura

```
src/
├── index.ts              # registerRoot
├── Root.tsx              # composición principal
├── PitchVideo.tsx        # secuencia de 6 escenas
├── theme.ts              # paleta + tipografías + timings
├── fonts.ts              # carga DM Sans + DM Serif Display
├── components/
│   ├── BackgroundGrain.tsx
│   ├── SceneFrame.tsx    # marco con label + wordmark
│   ├── FadeIn.tsx        # animación de entrada
│   ├── AppFrame.tsx      # mockup del shell de la app (header + tabs)
│   └── Typewriter.tsx    # efecto de tecleo
└── scenes/
    ├── HookScene.tsx           # interrupciones flotando + título
    ├── ProblemScene.tsx        # 3 stats del dolor de la PyME
    ├── SolutionScene.tsx       # mockup: dueño enseña en /Enseñar
    ├── HowItWorksScene.tsx     # mockup: empleado pregunta en /chat
    ├── ValueScene.tsx          # antes/después + KPI dashboard
    └── ClosingScene.tsx        # wordmark + tagline + CTA
```

## Línea de tiempo

| # | Escena | Frames | Segundos | Mensaje clave |
|---|---|---|---|---|
| 1 | Hook | 0-120 | 0-4 | Tu equipo te pregunta todo el día |
| 2 | Problema | 120-330 | 4-11 | 3-5 días · 20+ interrupciones · 0 memoria |
| 3 | Solución | 330-600 | 11-20 | Le enseñas en /Enseñar (mockup real con typewriter + hecho guardado) |
| 4 | Cómo funciona | 600-870 | 20-29 | Empleado pregunta en /chat (mockup con badges de fuente) |
| 5 | Valor | 870-1170 | 29-39 | Antes/después + KPIs reales del dashboard |
| 6 | Cierre | 1170-1350 | 39-45 | Wordmark + "El colega que nunca renuncia" + CTA |

## Script de voz en off (opcional)

**Hook (0-4s)**
> Tu equipo te pregunta todo el día. Y tú no puedes parar tu trabajo cada vez.

**Problema (4-11s)**
> En una PyME de tres a quince personas, el dueño paga lo mismo tres veces: tres a cinco días capacitando, más de veinte interrupciones diarias, y cero memoria si alguien renuncia.

**Solución (11-20s)**
> Le enseñas a Segundo como a un empleado nuevo. Escribes o hablas en tu idioma. Segundo entiende lo que dijiste, lo guarda como un hecho del negocio, y queda disponible para siempre.

**Cómo funciona (20-29s)**
> Cualquier persona del equipo abre el chat y pregunta. Segundo contesta con lo que tú enseñaste. Y si no sabe, no inventa: te pregunta a ti, y cuando le respondes, queda aprendido.

**Valor (29-39s)**
> Lo que cambia desde el primer día: capacitas una vez para todo el equipo, el equipo se autorresuelve, y el conocimiento se queda en el negocio aunque rote la gente. El conocimiento del dueño se vuelve un activo permanente.

**Cierre (39-45s)**
> Segundo. El colega que nunca renuncia.

## Funcionalidad mostrada en pantalla

El video no usa stock screenshots — los mockups recrean las pantallas reales de la app:

- **Solución**: vista `Enseñar` del `OwnerDashboard`. Header con wordmark + tabs + input principal con efecto typewriter dictando un hecho real ("Desde 50 piezas damos 15% de descuento"). Aparece el card "Hecho guardado" con su categoría.
- **Cómo funciona**: vista `EmployeeChat`. Burbuja del empleado con typewriter, indicador "Segundo está buscando", respuesta con borde-izquierdo dorado + badges (dominio, fuente, confianza).
- **Valor**: KPI panel idéntico al de Métricas, con CountUp animado (tasa de resolución 87%, preguntas/semana 142, hechos +68, empleados activos 6).

## Reglas de marca aplicadas

- 60% neutros oscuros, 30% neutros claros, **10% dorado** como firma — un solo punto dorado por escena.
- Tipografía: DM Serif Display (display) + DM Sans (body).
- Sin emojis decorativos en headers/CTAs (sí en mensajes de chat, donde sí son funcionales).
- Sin voseo, sin "AI-powered", sin tech-bro.

## Personalización rápida

| Quiero cambiar | Archivo |
|---|---|
| Duración total / por escena | `src/theme.ts` (`SCENES`, `TOTAL_DURATION`) |
| Texto de cualquier escena | `src/scenes/<Escena>.tsx` |
| Colores | `src/theme.ts` (`colors`) |
| Resolución / fps | `src/theme.ts` (`WIDTH`, `HEIGHT`, `FPS`) |
| KPIs mostrados | `src/scenes/ValueScene.tsx` |
| Pregunta/respuesta del chat | `src/scenes/HowItWorksScene.tsx` (constantes `QUESTION`, `ANSWER`) |
| Hecho que enseña el dueño | `src/scenes/SolutionScene.tsx` (constante `TEACH_TEXT`) |
