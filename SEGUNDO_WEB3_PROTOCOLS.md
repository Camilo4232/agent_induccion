# Segundo + Protocolos Web3 — Integración con X402, ERC-4337 y ERC-8004

> Cómo los protocolos de la economía de agentes pueden transformar el modelo de negocio de Segundo

---

## Resumen ejecutivo

Los protocolos X402, X402R, ERC-4337 y ERC-8004 no son solo tecnología blockchain — son la infraestructura de la **economía de agentes**. Para Segundo, estos protocolos abren tres posibilidades concretas:

1. **Segundo cobra por query en lugar de suscripción mensual** (X402)
2. **Los agentes internos de Segundo se pagan entre sí** por servicios especializados (X402 + A2A)
3. **Segundo se registra como agente on-chain** y es descubierto por otros orchestrators (ERC-8004)

---

## Los protocolos explicados

### X402 — HTTP Payment Protocol (Coinbase, mayo 2025)

**Qué es**: Revive el código HTTP 402 "Payment Required" para crear una capa de pagos nativa para APIs y agentes de IA. Pago en USDC en Base, sin cuentas, sin suscripciones, sin API keys.

**El flujo en 3 fases**:

```
1. DISCOVERY
   Cliente → GET /api/query → Servidor
   Cliente ← HTTP 402 + PAYMENT-REQUIRED (cuánto cobrar, a qué wallet)

2. AUTORIZACIÓN
   Cliente firma EIP-3009 TransferWithAuthorization
   Cliente → retry con PAYMENT-SIGNATURE
   Servidor envía a Facilitator para verificar

3. SETTLEMENT
   Facilitator ejecuta transferWithAuthorization() en contrato USDC
   Cliente ← HTTP 200 + resultado + PAYMENT-RESPONSE (tx hash on-chain)
```

**Implementación en Express (2 líneas):**

```typescript
import { paymentMiddleware } from "x402-express";

app.use(
  paymentMiddleware(
    "0xTU_WALLET_ADDRESS",
    {
      "POST /api/query":   { price: "$0.01", network: "base-mainnet" },
      "POST /api/analyze": { price: "$0.05", network: "base-mainnet" },
    },
    { url: "https://x402.org/facilitator" }  // facilitador gratuito de Coinbase
  )
);
```

**El cliente (agente) paga automáticamente:**

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);
const fetch = wrapFetchWithPayment(globalThis.fetch, account);

// El fetch detecta 402, firma, reintenta → todo automático
const res = await fetch("https://api.segundo.app/api/query");
```

---

### X402R — X402 con Reembolsos (extensión)

**Qué es**: X402 base es irreversible (como efectivo digital). X402R agrega una capa de escrow con árbitros para disputas.

**El flujo con escrow:**

```
Cliente paga → Contrato Escrow (no custodial) → (servicio entregado) → Merchant recibe

Si hay disputa dentro de la ventana de tiempo:
                    Árbitro
               ┌─────────────────┐
               │ Auto: por reglas│ → sin necesidad de humanos
               │ IA: LLM evalúa  │ → calidad del servicio
               │ Humano: manual  │ → casos complejos
               └─────────────────┘
               Resultado: Merchant cobra OR Cliente recibe reembolso
```

**Cuándo usar X402R vs X402 base:**

| Caso de uso | Protocolo |
|---|---|
| Consulta simple (precio, horario, política) | X402 base — rápido, irreversible |
| Generación de documento, análisis complejo | X402R — dispute de calidad posible |
| Tarea larga, resultado verificable | X402R — escrow por completitud |
| Micropagos < $0.01 | X402 base — overhead del escrow no vale |

---

### ERC-4337 — Account Abstraction (Smart Wallets para Agentes)

**Qué es**: Permite crear wallets programables (contratos inteligentes) sin cambiar el protocolo de Ethereum. 40M+ smart accounts deployed a la fecha.

**Por qué importa para Segundo:**

| Capacidad | Qué habilita |
|---|---|
| Gas en USDC via Paymaster | El agente nunca necesita ETH — paga gas en USDC |
| Límites programables | Gasto diario máximo, caps por servicio, multi-sig |
| Batch transactions | Múltiples pagos en una sola transacción |
| Gas sponsorship | Segundo patrocina el gas — el usuario no paga nada |
| Session keys | Claves temporales para contratos específicos |

**Patrón de Paymaster (Segundo patrocina el gas):**

```typescript
// Segundo sponsorea el gas para que los agentes no necesiten ETH
const paymasterClient = createPimlicoClient({
  transport: http(process.env.PIMLICO_RPC_URL),
});

const { paymasterAndData } = await paymasterClient.erc20PaymasterAndData({
  token: USDC_ADDRESS,
  userOperation: userOp,
});
```

**Nota importante sobre el stack actual de Segundo**: El backend es FastAPI (Python). Para ERC-4337, las opciones son:
- Usar el SDK de Python de Coinbase CDP (purpose-built para agentes server-side)
- Agregar un microservicio Node.js que maneje la wallet del agente
- Usar la API de Pimlico directamente via HTTP desde Python

---

### ERC-8004 — Trustless Agents (agosto 2025, live en mainnet enero 2026)

**Qué es**: Estándar de Ethereum co-autorado por MetaMask, Ethereum Foundation, Google y Coinbase. Proporciona la **capa de confianza** de la economía de agentes: tres registros on-chain para que los agentes se descubran, evalúen y contraten entre sí sin relación previa.

**Los tres registros:**

```
Identity Registry          Reputation Registry        Validation Registry
(ERC-721 based)            (Ledger de feedback)       (Hooks de verificación)

register() → agentId       giveFeedback()             validationRequest()
getAgentWallet()           revokeFeedback()           validationResponse()
setMetadata()              getSummary()               getValidationStatus()
```

**Segundo registrado como agente on-chain:**

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "SegundoOnboardingAgent",
  "description": "Onboarding institucional para PyMEs latinoamericanas",
  "services": [
    { "name": "A2A", "endpoint": "https://segundo.app/a2a", "version": "0.3.0" }
  ],
  "x402Support": true,
  "active": true
}
```

Una vez registrado, cualquier orchestrator externo puede descubrir a Segundo, ver su reputación on-chain, y pagarle por queries via X402 — todo sin intervención humana.

---

## Cómo se integran los protocolos en Segundo

### Arquitectura con Web3

```
┌────────────────────────────────────────────────────────┐
│                CAPA DE INGESTA                         │
│  WhatsApp / Gmail / POS → Extractor Agent              │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│             ORCHESTRATOR AGENT                         │
│  (ERC-4337 Smart Wallet — gasta USDC, paga gas en USDC)│
│                                                        │
│  Routea queries → sub-agentes especializados           │
│  Paga a sub-agentes via X402                           │
│  Cobra a clientes B2B via X402                         │
│  Submite feedback de calidad via ERC-8004              │
└────────────────────────────────────────────────────────┘
     ↓ X402 $0.05      ↓ X402 $0.10      ↓ X402 $0.001
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│Legal Doc     │ │Tax Compliance│ │Translation Agent │
│Agent         │ │Agent         │ │                  │
│(x402-gated)  │ │(x402-gated)  │ │(x402-gated)      │
└──────────────┘ └──────────────┘ └──────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│                CAPA DE SALIDA                          │
│  Chat empleado (Web / WhatsApp)                        │
│  Dashboard dueño                                       │
│  ERC-8004: Segundo visible para orchestrators externos │
└────────────────────────────────────────────────────────┘
```

---

## Modelo de negocio con Web3

### Opción A — Híbrido (Recomendado para Latinoamérica)

```
Usuarios finales (PyMEs)        Clientes B2B (developers, agents)
         │                                    │
         ▼                                    ▼
  Suscripción mensual              X402 por query
  ($25/mes, tarjeta o USDC)        ($0.01/query, USDC en Base)
         │                                    │
         └────────────────────────────────────┘
                            │
                   Backend de Segundo
                   (cobra en USDC, administrado via ERC-4337)
```

**Por qué no solo X402 para el usuario final**: El dueño de tienda en Latinoamérica no tiene USDC en Base. La suscripción mensual ($25) es su interfaz. X402 es para cuando Segundo se convierte en infraestructura que otros sistemas consumen.

### Opción B — Per-query con abstracción

El usuario paga con tarjeta de crédito. Segundo convierte eso a USDC internamente y usa X402 para todos los pagos backend. El usuario nunca ve crypto.

### Economía de sub-agentes (el caso más interesante)

```
Segundo Orchestrator (tiene wallet USDC)
  ├── paga $0.05 → LegalDocumentAgent  (por cada doc generado)
  ├── paga $0.10 → TaxComplianceAgent  (por cada consulta fiscal)
  ├── paga $0.001/char → TranslationAgent (para negocios bilingüe)
  └── paga $0.02 → DataEnrichmentAgent (info de proveedores/mercado)
```

Segundo cobra $25/mes al dueño. Por detrás, paga centavos a agentes especializados. El margen está en la diferencia + el valor del contexto acumulado del negocio.

### Segundo como servicio para otros (ERC-8004)

Registrado en ERC-8004, Segundo se vuelve un agente contrateable por cualquier orchestrator externo:

```
OrquestadorExterno → descubre Segundo en Identity Registry
                   → ve reputación en Reputation Registry (score 94/100)
                   → llama a https://segundo.app/a2a
                   → recibe HTTP 402 + precio
                   → paga $0.01 via X402
                   → recibe respuesta de onboarding
```

Esto crea un canal de ingreso completamente pasivo y automático.

---

## X402R para Segundo — cuándo tiene sentido

| Servicio de Segundo | Usar X402R? | Razón |
|---|---|---|
| Query simple ("¿cuál es el precio del producto X?") | No | Micropago, respuesta instantánea verificable |
| Generación de manual completo del negocio | Sí | Tarea larga, calidad evaluable por IA |
| Análisis de 6 meses de conversaciones WhatsApp | Sí | Alto valor, resultado complejo |
| Briefing diario del empleado | No | Automático, bajo costo, sin disputa posible |

**Para el árbitro de X402R en Segundo**: Un LLM (Claude) que evalúa si la respuesta generada fue relevante para la pregunta. Si la respuesta fue "No tengo información sobre eso" cuando el manual sí tenía info → reembolso automático.

---

## Implementación — Hoja de ruta técnica

### Fase 1 — X402 en endpoints premium (1 semana)

```bash
# Agregar microservicio Node.js que actúa como proxy x402 frente a FastAPI
npm install x402-express @x402/fetch
```

Los endpoints `/api/query` y `/api/analyze` quedan gateados por X402. Segundo recibe USDC directamente.

### Fase 2 — ERC-4337 Smart Wallet para el orchestrator (1 semana)

```bash
# Python SDK de Coinbase CDP para agentes server-side
pip install coinbase-agentkit
```

El orchestrator tiene su propia wallet smart contract con límites programados. Puede pagar sub-agentes sin intervención humana.

### Fase 3 — Registro ERC-8004 (2 días)

Registrar Segundo en el Identity Registry on-chain. Publicar metadata JSON en IPFS o servidor. Comenzar a acumular reputación desde las primeras interacciones.

### Fase 4 — X402R para servicios de alto valor (2 semanas)

Implementar escrow para generación de manuales completos y análisis complejos. Usar Claude como árbitro de calidad.

---

## Stack tecnológico completo

| Componente | Tecnología |
|---|---|
| Backend | FastAPI (Python) — existente |
| X402 Proxy | Express + x402-express (Node.js sidecar) |
| Agent Wallet | Coinbase CDP SDK (Python) o viem + Pimlico |
| Smart Wallet | ERC-4337 via Pimlico bundler |
| Gas | USDC via ERC-20 Paymaster |
| Payments | USDC en Base mainnet |
| Identity | ERC-8004 Identity Registry |
| Reputation | ERC-8004 Reputation Registry |
| Escrow | X402R commerce scheme |
| Facilitator | x402.org (Coinbase, gratuito) |
| DB | Supabase pgvector — existente |
| Frontend | Vercel — existente |

---

## Riesgos y consideraciones

| Riesgo | Mitigación |
|---|---|
| Usuarios LATAM no tienen USDC | Mantener suscripción mensual como interfaz principal |
| X402R es muy nuevo (Q1 2026) | Usar base x402 primero, agregar R después |
| ERC-8004 tooling aún temprano | Registrar ya, indexers llegarán |
| Facilitator de Coinbase como single point of failure | Self-host facilitator para producción |
| IP ligada a wallet address | Usar proxy o VPN para agentes que requieran privacidad |

---

## El pitch con Web3

> *"Segundo no es solo un agente de onboarding. Es el primer activo de conocimiento vivo de tu negocio — que cobra por enseñar, aprende de cada interacción, y crece en valor con el tiempo. Un negocio que usa Segundo por 3 meses tiene un activo que ningún competidor puede replicar y que ningún empleado se puede llevar."*
