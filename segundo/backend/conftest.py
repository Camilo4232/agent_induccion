"""
Configuración compartida de la suite de tests — Segundo v3.

- Garantiza que backend/ esté en sys.path para poder importar `app` y `main`
  sin importar desde qué directorio se invoque pytest.
- Carga backend/.env de forma explícita (la config de la app usa env_file=".env"
  relativo al CWD, que puede no ser backend/ al correr pytest con ruta absoluta).
- Un solo event loop de sesión (ver pytest.ini): el engine async de SQLAlchemy
  es global y su pool no sobrevive cambios de event loop entre tests.
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")

import pytest_asyncio  # noqa: E402


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _dispose_db_engine():
    """Cierra el pool del engine al final de la sesión (evita warnings de
    conexiones asyncpg vivas al cerrar el event loop en Windows)."""
    yield
    from app.db.session import engine

    await engine.dispose()
