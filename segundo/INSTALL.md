# Guía de instalación de Segundo

Esta guía te lleva paso a paso desde una PC vacía hasta tener Segundo corriendo en tu navegador.

> **Sobre los comandos:** cada bloque indica si es para **PowerShell (Windows)** o **Bash (Mac/Linux)**. Copia el bloque que corresponde a tu sistema.

---

## Tabla de contenido

1. [Pre-requisitos](#1-pre-requisitos)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Configurar Supabase (base de datos)](#3-configurar-supabase-base-de-datos)
4. [Configurar el backend](#4-configurar-el-backend)
5. [Configurar el frontend](#5-configurar-el-frontend)
6. [Levantar la aplicación](#6-levantar-la-aplicación)
7. [Verificar que todo funciona](#7-verificar-que-todo-funciona)
8. [Solución de problemas](#8-solución-de-problemas)
9. [Cambiar el modelo de IA](#9-cambiar-el-modelo-de-ia)
10. [Comandos del día a día](#10-comandos-del-día-a-día)

---

## 1. Pre-requisitos

| Componente | Para qué |
|---|---|
| Python 3.11+ | Lenguaje del backend |
| Node.js 20+ | Frontend (React + Vite) |
| Git | Para clonar el repositorio |
| Cuenta Groq (gratis) | Modelo de IA en la nube — recomendado |
| Cuenta Supabase (gratis) | Base de datos PostgreSQL + pgvector |

> **No instalas PostgreSQL local** — la DB vive en Supabase.

### Windows

Descargar e instalar (con defaults):

1. **Python 3.11+** → https://www.python.org/downloads/
   ⚠️ Durante la instalación, **MARCAR "Add Python to PATH"**.
2. **Node.js 20 LTS** → https://nodejs.org/
3. **Git** → https://git-scm.com/download/win

Verificar en una **PowerShell nueva**:

```powershell
python --version    # 3.11 o más
node --version      # v20 o más
git --version
```

Si alguno falla, **cierra todas las PowerShell, abre una nueva** y reintenta. Si sigue fallando, reinicia la PC.

### Mac

```bash
# Si no tienes Homebrew: https://brew.sh
brew install python@3.11 node@20 git
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip nodejs npm git
```

---

## 2. Clonar el repositorio

En una carpeta **donde NO haya otra carpeta del proyecto** (para evitar duplicación).

### Windows (PowerShell)

```powershell
cd $HOME\Desktop
git clone https://github.com/Camilo4232/agent_induccion.git
cd agent_induccion\segundo
```

### Mac/Linux (Bash)

```bash
cd ~/Desktop
git clone https://github.com/Camilo4232/agent_induccion.git
cd agent_induccion/segundo
```

**Verificación:** después de `cd`, ejecuta `ls` (Mac/Linux) o `dir` (Windows). Debes ver `backend`, `frontend`, `docs`, `README.md`, `INSTALL.md`. Si ves otra carpeta `agent_induccion` adentro, borra todo y reclona afuera del repo.

---

## 3. Configurar Supabase (base de datos)

### 3.1 — Crear el proyecto

1. Crea cuenta gratis en https://supabase.com.
2. Click **"New project"**:
   - **Name**: `segundo` (o lo que quieras).
   - **Region**: la más cercana (ej. `us-east-2` para Latam Norte, `sa-east-1` para Latam Sur).
   - **Database password**: ⚠️ **guárdala**, la vas a usar después.
3. Espera 1-2 minutos hasta que diga "Project ready".

### 3.2 — Activar pgvector

En Supabase → menú lateral → **SQL Editor** → **+ New query**. Pegar y **Run**:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3.3 — Copiar la connection string

En Supabase → **Project Settings** (engranaje abajo a la izquierda) → **Database** → bajar a **"Connection string"** → tab **"URI"** → modo **"Transaction"** (puerto **6543**).

Copia el string completo. Se ve así:

```
postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

Reemplaza `[YOUR-PASSWORD]` por la password real del paso 3.1.

---

## 4. Configurar el backend

Todo este paso se hace dentro de `segundo/backend/`.

### 4.1 — Entrar a la carpeta y crear el venv

**Windows (PowerShell):**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

> Si PowerShell dice *"no se pueden cargar scripts"*, ejecuta primero:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
> y vuelve a intentar.

**Mac/Linux (Bash):**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

> Cuando el venv está activado verás `(venv)` al inicio del prompt.

### 4.2 — Verificar que el venv está activo y apunta a la carpeta correcta

**Windows:**
```powershell
where.exe python
```

**Mac/Linux:**
```bash
which python
```

La **primera línea** debe terminar en `...\segundo\backend\venv\Scripts\python.exe` (Win) o `.../segundo/backend/venv/bin/python` (Mac/Linux). Si apunta a otra cosa, el venv no está activo.

### 4.3 — Instalar dependencias

Con `(venv)` activo:

```
pip install -r requirements.txt
```

Tarda 1-2 minutos. Verificar al final:

```
pip list | findstr -i "uvicorn alembic fastapi"     # Windows
pip list | grep -iE "uvicorn|alembic|fastapi"        # Mac/Linux
```

Debes ver los tres. Si no, repite `pip install -r requirements.txt`.

### 4.4 — Crear el archivo `.env`

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
notepad .env
```

**Mac/Linux (Bash):**

```bash
cp .env.example .env
nano .env   # o code .env si usas VS Code
```

Edita estos campos:

```env
DATABASE_URL=postgresql+asyncpg://postgres.xxxx:TU_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=pega-aqui-el-resultado-del-comando-de-abajo
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_tu-key-aqui
GROQ_MODEL=llama-3.3-70b-versatile
CORS_ORIGINS=http://localhost:5173
```

**Cómo obtener cada valor:**

- **`DATABASE_URL`**: la connection string del paso 3.3. ⚠️ **Cambia el prefijo** `postgresql://` por `postgresql+asyncpg://`. El password no debe llevar `[]` ni espacios.
- **`JWT_SECRET`**: en otra terminal ejecuta:
  ```
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```
  Pega el resultado.
- **`GROQ_API_KEY`**: crea cuenta gratis en https://console.groq.com y genera la key en https://console.groq.com/keys (empieza con `gsk_`).

Guarda y cierra el archivo.

### 4.5 — Crear las tablas en Supabase

Con `(venv)` activo y desde `backend/`:

```
alembic upgrade head
```

Debe terminar sin errores. Si dice `extension "vector" does not exist`, vuelve al paso 3.2.

---

## 5. Configurar el frontend

Abre **otra terminal** (deja la del backend abierta). Desde la raíz del proyecto:

**Windows (PowerShell):**

```powershell
cd $HOME\Desktop\agent_induccion\segundo\frontend
"VITE_API_URL=http://localhost:8000" | Out-File -Encoding utf8 .env
npm install
```

**Mac/Linux (Bash):**

```bash
cd ~/Desktop/agent_induccion/segundo/frontend
echo "VITE_API_URL=http://localhost:8000" > .env
npm install
```

`npm install` tarda 1-2 minutos.

---

## 6. Levantar la aplicación

Necesitas **dos terminales abiertas al mismo tiempo**.

### Terminal 1 — Backend

**Windows (PowerShell):**

```powershell
cd $HOME\Desktop\agent_induccion\segundo\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Mac/Linux (Bash):**

```bash
cd ~/Desktop/agent_induccion/segundo/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Espera a ver:
```
INFO:     Application startup complete.
```

### Terminal 2 — Frontend

**Windows (PowerShell):**

```powershell
cd $HOME\Desktop\agent_induccion\segundo\frontend
npm run dev
```

**Mac/Linux (Bash):**

```bash
cd ~/Desktop/agent_induccion/segundo/frontend
npm run dev
```

Espera a ver:
```
➜  Local:   http://localhost:5173/
```

---

## 7. Verificar que todo funciona

1. **Backend OK** → abrir http://localhost:8000/health
   Debe devolver `{"status":"ok","version":"2.1.0",...}`.

2. **Frontend OK** → abrir http://localhost:5173
   Debe mostrar la página de login.

3. **Conexión completa** → en la página de login, click en **"Entrar como Dueño"**.
   Si te redirige al dashboard, **todo está funcionando**.

4. **API docs** (opcional) → http://localhost:8000/docs (Swagger).

---

## 8. Solución de problemas

| Síntoma | Causa | Fix |
|---|---|---|
| `uvicorn` / `alembic` no se reconoce | `(venv)` no activado o vacío | Reactivar (`.\venv\Scripts\Activate.ps1`) y verificar con `where.exe python`. Si el venv está vacío: `pip install -r requirements.txt` |
| `python no se reconoce` | No marcaste "Add to PATH" | Reinstalar Python con la casilla marcada, o reiniciar la PC |
| `cannot be loaded because running scripts is disabled` | Política PowerShell restrictiva | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `ENOTFOUND tenant/user postgres.xxx not found` | Proyecto Supabase pausado o ID equivocado | En Supabase dashboard → click **"Restore project"**. Esperar 1-2 min |
| `password authentication failed` | Password mal en `DATABASE_URL` | Revisar `.env`: no debe tener `[]`, espacios ni caracteres especiales sin escapar |
| `extension "vector" does not exist` | Falta paso 3.2 | Correr `CREATE EXTENSION vector;` en Supabase SQL Editor |
| `JWT_SECRET debe tener al menos 32 caracteres` | Falta el secret | Generarlo con `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| Backend arranca pero `/ask` falla con 500 | `GROQ_API_KEY` falta o inválida | Verificar en `.env` que empiece con `gsk_` y reiniciar backend |
| `ModuleNotFoundError: No module named 'fastapi'` | Venv inactivo | Reactivar el venv |
| Frontend dice "No se pudo iniciar el modo demo" | `VITE_API_URL` mal | Revisar `frontend/.env` → `VITE_API_URL=http://localhost:8000` y reiniciar `npm run dev` |
| Carpeta `agent_induccion\agent_induccion` anidada | Clonaste dentro del repo | Borrar la carpeta interna y reclonar afuera. Crear venv fresco |
| `psycopg2` falla al instalar (Mac/Linux) | Falta `libpq-dev` | Linux: `sudo apt install libpq-dev` · Mac: `brew install postgresql` |
| `RateLimitExceeded` en `/ask` | Más de 10 preguntas/min | Esperar 1 minuto |
| Error 401 después de un rato | JWT expiró (24h) | Cerrar sesión y entrar de nuevo |

---

## 9. Cambiar el modelo de IA

Solo edita `backend/.env` y reinicia el backend (`Ctrl+C` y volver a ejecutar `uvicorn main:app --reload`).

```env
# Opción 1 — Groq (recomendado, gratis con cuota generosa)
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Opción 2 — Ollama local (100% offline)
LLM_PROVIDER=ollama
# Requiere: instalar Ollama desde https://ollama.com/download
# y descargar el modelo: ollama pull llama3.2

# Opción 3 — Claude (Anthropic, pago)
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Modelos Groq disponibles

| Modelo | Velocidad | Calidad |
|---|---|---|
| `llama-3.3-70b-versatile` | Rápido | **Excelente** (default) |
| `llama-3.1-8b-instant` | Muy rápido | Buena |
| `mixtral-8x7b-32768` | Rápido | Buena, contexto largo (32k) |
| `gemma2-9b-it` | Rápido | Buena |

Lista completa: https://console.groq.com/docs/models

No hace falta tocar nada más del código.

---

## 10. Comandos del día a día

Una vez instalado, estos son los comandos que vas a usar:

### Iniciar la app (dos terminales)

**Terminal 1 — Backend (Windows):**
```powershell
cd $HOME\Desktop\agent_induccion\segundo\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (Windows):**
```powershell
cd $HOME\Desktop\agent_induccion\segundo\frontend
npm run dev
```

Mac/Linux equivalente:
```bash
# Terminal 1
cd ~/Desktop/agent_induccion/segundo/backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2
cd ~/Desktop/agent_induccion/segundo/frontend && npm run dev
```

### Detener

`Ctrl+C` en cada terminal.

### Actualizar el código desde GitHub

```
git pull
```

Después:
- Si cambió `backend/requirements.txt`: con el venv activo → `pip install -r requirements.txt`.
- Si cambió `frontend/package.json`: en `frontend/` → `npm install`.
- Si hay nuevas migraciones: en `backend/` con venv activo → `alembic upgrade head`.

---

## Estructura del repositorio

```
agent_induccion/
└── segundo/
    ├── README.md             ← overview corto
    ├── INSTALL.md            ← este archivo
    ├── docs/                 ← documentación detallada
    ├── sample_data/          ← CSVs de ejemplo para entrenar
    ├── backend/
    │   ├── main.py           ← entrada de FastAPI
    │   ├── requirements.txt
    │   ├── .env.example      ← copiar a .env y editar
    │   ├── alembic/          ← migraciones de DB
    │   └── app/
    │       ├── core/         ← config + JWT
    │       ├── db/           ← modelos + schemas
    │       ├── services/     ← claude.py (switch LLM), embeddings.py
    │       ├── agents/       ← orchestrator + sub-agents
    │       └── api/          ← routers HTTP (auth, teach, ask, billing, ...)
    └── frontend/
        ├── package.json
        ├── vite.config.js
        └── src/
            ├── pages/        ← Login, Register, OwnerDashboard, EmployeeChat, Pricing
            ├── components/   ← TeachInput, VoiceButton, PricingPanel, ...
            ├── services/     ← api.js (axios + auto-refresh JWT)
            ├── store/        ← Zustand (auth)
            └── i18n/         ← ES / EN / PT
```
