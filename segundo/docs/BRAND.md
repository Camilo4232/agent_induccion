# Brand de Segundo

Sistema operativo visual y verbal. Cuando hay duda en una decisión de UI o copy, se vuelve aquí.

## Esencia

- **Producto**: agente de IA institucional para PyMEs latinoamericanas (3-15 empleados).
- **Promesa**: el conocimiento del dueño se vuelve un activo permanente del negocio.
- **Tagline**: "El colega que nunca renuncia."
- **Personalidad**: cálido pero profesional, español neutro sin voseo, sin jerga tech, latinoamericano sin estereotipos, confiable, humanista (no tech-bro).

---

## 1. Paleta

### Primarios — dorado institucional
| Token | Hex | Uso |
|---|---|---|
| `gold-50` | `#faf5e8` | Fondos sutiles, badges |
| `gold-100` | `#f5e9c8` | |
| `gold-200` | `#ebd599` | |
| `gold-300` | `#e0c073` | |
| `gold-400` | `#d4a853` | Hover de acentos (era nuestro acento original) |
| `gold-500` | `#c69740` | **Color principal de marca** |
| `gold-600` | `#a87d2e` | |
| `gold-700` | `#856220` | |
| `gold-800` | `#614716` | |
| `gold-900` | `#3d2c0d` | |

### Secundarios — terracota cálido
| Token | Hex | Uso |
|---|---|---|
| `clay-300` | `#d89878` | Estados sin recurrir al rojo agresivo |
| `clay-500` | `#b06b48` | |
| `clay-700` | `#7a4530` | |

### Neutros cálidos — familia base
| Token | Hex | Uso |
|---|---|---|
| `neutral-50` | `#f7f5f1` | |
| `neutral-100` | `#f0ede8` | text-primary |
| `neutral-200` | `#d9d4cc` | |
| `neutral-300` | `#b3aca1` | |
| `neutral-400` | `#8e857a` | |
| `neutral-500` | `#7a7570` | text-secondary |
| `neutral-600` | `#5c5853` | |
| `neutral-700` | `#3d3a37` | text-muted |
| `neutral-800` | `#2a2826` | |
| `neutral-900` | `#161616` | bg-card |

### Semánticos (terrosos, no tech-alarm)
| Token | Hex | Hex bg | Uso |
|---|---|---|---|
| `success` | `#2d8a52` | `#1a2e22` | |
| `warning` | `#c9923d` | `#2e2516` | |
| `danger` | `#b8392a` | `#2e1a16` | |
| `info` | `#5a8aa8` | `#16242e` | |

### Superficie
| Token | Hex |
|---|---|
| `bg` | `#0e0e0e` |
| `surface` | `#161616` |
| `surface-elevated` | `#1f1f1f` |
| `surface-hover` | `#242422` |
| `border` | `#2a2a2a` |
| `border-strong` | `#3d3a37` |
| `overlay` | `rgba(14, 14, 14, 0.78)` |

---

## 2. Tipografía

DM Serif Display solo para display, h1 y momentos editoriales. DM Sans para todo el trabajo del producto. Line-height generoso porque el español neutro corre 30% más largo que el inglés.

| Token | Familia | Weight | Size | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| `display` | DM Serif Display | 400 | 4.5rem (72px) | 1.05 | -0.02em |
| `h1` | DM Serif Display | 400 | 3rem (48px) | 1.1 | -0.015em |
| `h2` | DM Sans | 600 | 2.25rem (36px) | 1.2 | -0.01em |
| `h3` | DM Sans | 600 | 1.75rem (28px) | 1.25 | -0.005em |
| `h4` | DM Sans | 600 | 1.375rem (22px) | 1.35 | 0 |
| `h5` | DM Sans | 500 | 1.125rem (18px) | 1.4 | 0 |
| `h6` | DM Sans | 500 | 1rem (16px) | 1.45 | 0.01em |
| `body-lg` | DM Sans | 400 | 1.125rem (18px) | 1.6 | 0 |
| `body` | DM Sans | 400 | 1rem (16px) | 1.6 | 0 |
| `body-sm` | DM Sans | 400 | 0.9375rem (15px) | 1.55 | 0 |
| `caption` | DM Sans | 500 | 0.8125rem (13px) | 1.5 | 0.01em |
| `micro` | DM Sans | 600 | 0.6875rem (11px) | 1.4 | 0.08em (UPPERCASE) |

**Reglas:**
- Párrafos largos: max-width 65 caracteres (~32rem).
- Botones: `body-sm` weight 600, letter-spacing 0.01em. Nunca uppercase salvo `micro`.
- Inputs: `body` 16px mínimo en mobile (evita zoom de iOS).
- Números (saldos, contadores): `font-feature-settings: "tnum"`.

---

## 3. Uso del dorado — regla 60/30/10

60% neutros oscuros, 30% neutros claros, **10% dorado**. El dorado es **firma**, no protagonista. Si una pantalla tiene más de tres elementos dorados, está mal.

### Dorado SÍ es protagonista (raros momentos editoriales)
- Logo aislado en splash, login, página 404.
- Pantallas de onboarding tipo "bienvenida".
- Hero de landing pública.
- Estados de éxito significativos: "Hecho guardado, Segundo ya lo sabe" — el check va dorado.

### Dorado SÍ como acento (uso diario)
- CTA primario único de la pantalla (un solo botón dorado por vista).
- Indicador de selección/activo en navegación lateral.
- Borde-izquierdo de la respuesta de Segundo en chat (4px gold-500).
- Avatar de Segundo en chat.
- Un número clave en dashboard, no todos.

### Dorado NO se usa
- Mensajes de error o danger — usar `clay` o `danger`.
- Texto de párrafo largo.
- Enlaces inline dentro de texto — `neutral-100` con underline.
- Botones secundarios.
- Fondos amplios planos.
- Iconos decorativos genéricos (settings, edit, trash) — `neutral-400`.

**Test:** screenshot + entrecerrar los ojos. Debes ver UN punto dorado, no constelación.

---

## 4. Lenguaje 3D / geométrico

Las figuras son **metáforas del producto**, no decoración. Cada una tiene un significado fijo y un contexto único.

| Figura | Significado | Va en | No va en |
|---|---|---|---|
| **Cinta de Möbius** | Continuidad institucional, "el colega que nunca renuncia" | Landing pública (hero), splash inicial, "Sobre Segundo" | Dashboard, chat, formularios |
| **Toro (donut)** | Circulación de conocimiento (pregunta entra, respuesta sale) | Onboarding del empleado, "cómo funciona" | Errores, configuración |
| **Octaedro** | Hecho cristalizado, una unidad de conocimiento | Card de "hecho guardado", éxito al guardar, sección Conocimiento | Chat conversacional |
| **Esfera mate** | Segundo presente, escuchando | Estado "Segundo está pensando", avatar grande de bienvenida | Notificaciones, listados |

**Reglas transversales:**
- Render mate, no metálico brillante. Una sola luz cálida.
- Paleta: neutros + un acento dorado máximo. Nunca multicolor.
- Tamaño mínimo: 120px. Por debajo se ve sucia.
- **Una figura 3D por pantalla**. Nunca dos protagonistas.
- **Prohibido en**: tablas de datos, formularios densos, configuración técnica, errores críticos, billing.

---

## 5. Tono de voz

Cálido, directo, sin disculpas exageradas, sin jerga, sin emojis decorativos. **Tú** (no vos, no usted en producto), frases cortas, verbo activo.

### 5 ejemplos de microcopy

**Error de login**
> Esos datos no coinciden. Revisa el correo y la contraseña, o recupera el acceso desde el enlace de abajo.

**Estado vacío del dashboard del dueño**
> Todavía no le has enseñado nada a Segundo.
>
> Empieza por lo básico: horarios, dirección, qué hace cada persona del equipo. Mientras más sepa, mejor responde a tu gente.
>
> [Botón: Enseñar el primer hecho]

**Bienvenida tras registro**
> Bienvenida, María.
>
> Segundo ya está listo para aprender de tu negocio. Lo que le enseñes hoy, lo va a saber cualquier persona que entre a trabajar contigo mañana.

**Notificación de pregunta escalada**
> Tienes una pregunta sin responder.
>
> Carlos preguntó algo que Segundo todavía no sabe. Cuando le respondas, queda aprendido para siempre.

**Confirmación tras guardar un hecho**
> Listo. Segundo ya lo sabe.
>
> Cualquier persona del equipo que pregunte algo relacionado va a recibir esta respuesta.

---

## 6. Anti-patrones (vetados)

1. **Emojis decorativos en CTAs y headers.** Excepción: emojis funcionales dentro de mensajes del usuario en chat.
2. **Lenguaje tech-bro.** Prohibido: "potenciado por IA", "leverage", "supercharge", "revoluciona", "AI-powered", "next-gen", "game-changer". En su lugar: describir lo que hace.
3. **Stock photography de oficinas multiculturales sonriendo.** En su lugar: render 3D propio, fotografía documental real de PyMEs, o nada de imagen.
4. **Más de un dorado protagonista por pantalla.** Si tomas screenshot y entrecierras los ojos, debes ver UN punto dorado.
5. **Voseo, modismos regionales y diminutivos infantilizantes.** Prohibido: "che", "dale", "vos sabés", "tu negocito", "una preguntita", "esperame un cachito". También vetado el chiste "un segundito" como juego de palabras con el nombre.
