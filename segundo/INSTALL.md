# Guía de instalación de Segundo

Esta guía te lleva paso a paso desde una PC vacía hasta tener Segundo corriendo en tu navegador.

> **Importante sobre los comandos:** cada bloque de código indica si es para **PowerShell (Windows)** o **Bash (Mac/Linux)**. Los comandos cambian entre sistemas operativos — copia el bloque que corresponde al tuyo.

---

## Tabla de contenido

1. [Lo que vas a instalar](#1-lo-que-vas-a-instalar)
2. [Instalar el software base](#2-instalar-el-software-base)
3. [Clonar el repositorio](#3-clonar-el-repositorio)
4. [Configurar la base de datos en Supabase](#4-configurar-la-base-de-datos-en-supabase)
5. [Configurar el backend](#5-configurar-el-backend)
6. [Configurar el frontend](#6-configurar-el-frontend)
7. [Configurar el modelo de IA](#7-configurar-el-modelo-de-ia)
8. [Levantar la aplicación](#8-levantar-la-aplicación)
9. [Verificar que todo funciona](#9-verificar-que-todo-funciona)
10. [Solución de problemas](#10-solución-de-problemas)

---

## 1. Lo que vas a instalar

| Componente | Para qué |
|---|---|
| Python 3.11+ | Lenguaje del backend |
| Node.js 20+ | Para el frontend (React) |
| Git | Para clonar el repositorio |
| Ollama (opcional) | Modelo de IA gratis y local |

**No instalas PostgreSQL** — la base de datos vive en Supabase.

---

## 2. Instalar el software base

### Windows

1. **Python 3.11+**
   - Descargar de https://www.python.org/downloads/
   - Durante la instalación marcar la casilla **"Add Python to PATH"**.

2. **Node.js 20 LTS**
   - Descargar de https://nodejs.org/ (versión LTS).
   - Instalar con las opciones por defecto.

3. **Git**
   - Descargar de https://git-scm.com/download/win
   - Instalar con las opciones por defecto.

4. Verificar que todo quedó instalado abriendo **PowerShell** y ejecutando:

   ```powershell
   python --version
   node --version
   git --version
   ```

   Debes ver tres versiones. Si alguna falla con "command not found", reinicia la PC y prueba de nuevo.

### Mac

```bash
# Instalar Homebrew si no lo tienes: https://brew.sh
brew install python@3.11 node@20 git
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip nodejs npm git
```

---

## 3. Clonar el repositorio

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

---

## 4. Configurar la base de datos en Supabase

La DB ya existe en la nube. Solo necesitas la **connection string** para conectarte.

### Opción A — Te dieron acceso a un proyecto existente

1. Pide al admin del proyecto la **connection string** (formato `postgresql://...`).
2. Si el proyecto está pausado: entra a https://supabase.com/dashboard, abre el proyecto y haz clic en **"Restore project"**. Espera 1-2 minutos.
3. Continúa con el paso 5.

### Opción B — Vas a crear un proyecto nuevo

1. Crea cuenta en https://supabase.com y un proyecto nuevo.
2. Una vez creado, ve a **SQL editor** (en el menú lateral) y ejecuta:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Ve a **Project Settings → Database → Connection pooling**, modo **Transaction**, y copia la URI.
4. Continúa con el paso 5. Más tarde, en el paso 8, vas a ejecutar `alembic upgrade head` para crear las tablas.

---

## 5. Configurar el backend

Todo este paso se hace dentro de la carpeta `segundo/backend/`.

### 5.1 — Entrar a la carpeta y crear el entorno virtual

**Windows (PowerShell):**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

> Si PowerShell te dice *"no se pueden cargar scripts"*, ejecuta primero:
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

> Cuando el entorno está activado, verás `(venv)` al inicio de la línea de la terminal.

### 5.2 — Instalar las dependencias

Mismo comando para todos los sistemas (con el venv activado):

```
pip install -r requirements.txt
```

Esto tarda 1-2 minutos.

### 5.3 — Crear el archivo `.env`

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
notepad .env
```

**Mac/Linux (Bash):**

```bash
cp .env.example .env
nano .env       # o code .env si usas VS Code
```

Ahora edita el `.env`. Como mínimo necesitas configurar:

```env
DATABASE_URL=postgresql+asyncpg://postgres.xxx:PASSWORD@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=pega-aqui-un-string-aleatorio-de-48-caracteres
LLM_PROVIDER=ollama
CORS_ORIGINS=http://localhost:5173
```

**Cómo obtener cada valor:**

- `DATABASE_URL`: la connection string del paso 4. **Importante:** cambia el prefijo `postgresql://` por `postgresql+asyncpg://`.
- `JWT_SECRET`: ejecuta este comando en otra terminal y pega lo que sale:

  ```
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```

- `LLM_PROVIDER`: déjalo en `ollama` por ahora (es gratis). Si después quieres usar Claude, cambia a `claude` y agrega tu `ANTHROPIC_API_KEY`.

Guarda y cierra el archivo.

---

## 6. Configurar el frontend

Sal de la carpeta backend y entra a frontend.

**Windows (PowerShell):**

```powershell
cd ..\frontend
"VITE_API_URL=http://localhost:8000" | Out-File -Encoding utf8 .env
npm install
```

**Mac/Linux (Bash):**

```bash
cd ../frontend
echo "VITE_API_URL=http://localhost:8000" > .env
npm install
```

`npm install` tarda 1-2 minutos.

---

## 7. Configurar el modelo de IA

Segundo soporta dos opciones. Elige una.

### Opción A — Ollama (gratis, local) — recomendado para empezar

1. Descargar e instalar Ollama desde https://ollama.com/download
2. Una vez instalado, abre una terminal **nueva** (no la del backend ni la del frontend) y ejecuta:

   ```
   ollama pull llama3.2
   ```

   Esto descarga el modelo (~2 GB).

3. Ollama corre como servicio en segundo plano automáticamente. Verifícalo con:

   ```
   curl http://localhost:11434/api/tags
   ```

   Debes ver una lista en JSON con los modelos descargados.

4. En `backend/.env` deja `LLM_PROVIDER=ollama` (ya quedó así desde el paso 5).

### Opción B — Claude (pago, mejor calidad)

1. Crear cuenta en https://console.anthropic.com y generar una API key.
2. Editar `backend/.env`:

   ```env
   LLM_PROVIDER=claude
   ANTHROPIC_API_KEY=sk-ant-tu-key-aqui
   ```

---

## 8. Levantar la aplicación

Necesitas **dos terminales abiertas** (tres si usas Ollama).

### Terminal 1 — Backend

**Windows (PowerShell):**

```powershell
cd C:\Users\TU_USUARIO\Desktop\agent_induccion\segundo\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

**Mac/Linux (Bash):**

```bash
cd ~/Desktop/agent_induccion/segundo/backend
source venv/bin/activate
uvicorn main:app --reload
```

> Solo si es un proyecto Supabase nuevo (Opción B del paso 4), antes de `uvicorn` ejecuta una sola vez:
> ```
> alembic upgrade head
> ```

Espera a ver:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 2 — Frontend

**Windows (PowerShell):**

```powershell
cd C:\Users\TU_USUARIO\Desktop\agent_induccion\segundo\frontend
npm run dev
```

**Mac/Linux (Bash):**

```bash
cd ~/Desktop/agent_induccion/segundo/frontend
npm run dev
```

Espera a ver:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Terminal 3 — Ollama (solo si elegiste Opción A en paso 7)

Ollama corre solo como servicio. No necesitas hacer nada extra.

---

## 9. Verificar que todo funciona

1. **Backend OK:** abrir http://localhost:8000/health en el navegador. Debes ver:
   ```json
   {"status":"ok","version":"2.1.0",...}
   ```

2. **Frontend OK:** abrir http://localhost:5173 — debes ver la página de login de Segundo.

3. **Conexión front ↔ back OK:** en la página de login, hacer clic en **"Entrar como Dueño"**. Si te redirige al dashboard, todo está funcionando.

4. **Documentación interactiva del API:** http://localhost:8000/docs (Swagger).

---

## 10. Solución de problemas

| Problema | Causa | Solución |
|---|---|---|
| `python` no se reconoce | No marcaste "Add to PATH" al instalar | Reinstalar Python marcando esa casilla, o reiniciar la PC |
| `cannot be loaded because running scripts is disabled` (PowerShell) | Política de ejecución restringida | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `ModuleNotFoundError: No module named 'fastapi'` | Olvidaste activar el venv | Ejecutar de nuevo `.\venv\Scripts\Activate.ps1` (Win) o `source venv/bin/activate` (Mac/Linux) |
| `JWT_SECRET debe tener al menos 32 caracteres` | El valor en `.env` es muy corto | Generar uno con `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `extension "vector" does not exist` | No corriste `CREATE EXTENSION vector` en Supabase | Ir al SQL editor de Supabase y ejecutar `CREATE EXTENSION IF NOT EXISTS vector;` |
| `Connection refused` al preguntar algo | Ollama no está corriendo | Verificar con `curl http://localhost:11434/api/tags` — si falla, abrir Ollama |
| `model 'llama3.2' not found` | No descargaste el modelo | `ollama pull llama3.2` |
| El frontend dice "No se pudo iniciar el modo demo" | `VITE_API_URL` apunta al puerto incorrecto | Verificar que `frontend/.env` diga `VITE_API_URL=http://localhost:8000` y reiniciar `npm run dev` |
| El proyecto Supabase está "Paused" | Plan free se pausa tras 7 días sin uso | En el dashboard de Supabase clickear "Restore project" |
| `psycopg2` falla al instalar (Mac/Linux) | Falta `libpq-dev` | Linux: `sudo apt install libpq-dev` · Mac: `brew install postgresql` |
| Búsqueda semántica devuelve resultados raros | Estás usando embeddings mock | Configurar `VOYAGE_API_KEY` en `.env` |
| El botón de voz no transcribe | Falta `GROQ_API_KEY` | Configurar la key en `.env` |
| Error 401 después de un rato | Token JWT expirado (24h) | Cerrar sesión y volver a entrar |
| `RateLimitExceeded` en `/ask` | Más de 10 preguntas por minuto | Esperar 1 minuto |

---

## Estructura del repositorio

```
agent_induccion/
└── segundo/
    ├── README.md             ← overview corto
    ├── INSTALL.md            ← este archivo
    ├── docs/                 ← documentación detallada
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
    │       └── api/          ← routers HTTP
    └── frontend/
        ├── package.json
        ├── vite.config.js
        └── src/
            ├── pages/        ← Login, Register, OwnerDashboard, EmployeeChat
            ├── components/   ← ChatInput, VoiceButton, KnowledgeCard, ...
            ├── services/     ← api.js (axios + auto-refresh JWT)
            └── store/        ← Zustand (auth)
```

---

## Comandos de referencia rápida

Una vez instalado, estos son los comandos que vas a usar día a día:

### Iniciar todo (con la app ya instalada)

**Windows (PowerShell), terminal 1:**
```powershell
cd C:\Users\TU_USUARIO\Desktop\agent_induccion\segundo\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

**Windows (PowerShell), terminal 2:**
```powershell
cd C:\Users\TU_USUARIO\Desktop\agent_induccion\segundo\frontend
npm run dev
```

### Detener la aplicación

En cada terminal, presiona `Ctrl+C`.

### Actualizar el código desde GitHub

```
cd agent_induccion
git pull
```

Después, si cambió `requirements.txt`, vuelve a ejecutar `pip install -r requirements.txt` con el venv activado. Si cambió `package.json`, ejecuta `npm install` en `frontend/`.

---

## Cambiar entre Ollama y Claude

Solo edita `backend/.env` y reinicia el backend (Ctrl+C y volver a ejecutar `uvicorn main:app --reload`).

```env
# Para Ollama
LLM_PROVIDER=ollama

# Para Claude
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

No hace falta tocar nada más del código.
