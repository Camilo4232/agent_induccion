"""
Tests de integración — app FastAPI real (ASGITransport) + DB real (Supabase).

- Registra negocios desechables con email único e2e-pytest-{uuid}@test.com.
- NO lanza misiones reales ni llama al endpoint de chat (no gasta LLM):
  el único POST /missions usa un objective inválido (<10 chars) que el
  schema rechaza con 422 antes de tocar el motor.
- Correr con: pytest -m integration  (o toda la suite; requiere .env válido).
"""
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio

from main import app

pytestmark = pytest.mark.integration

BASE_URL = "http://testserver"
TIMEOUT = 60.0
SEED_TEAM_SIZE = 6
CATALOG_SIZE = 11


async def _register_business(client: httpx.AsyncClient, industry: str = "startup_software") -> dict:
    """Registra un negocio desechable y devuelve token + headers."""
    email = f"e2e-pytest-{uuid4().hex}@test.com"
    resp = await client.post(
        "/auth/register",
        json={
            "business_name": f"Negocio E2E {uuid4().hex[:8]}",
            "name": "Dueño E2E",
            "email": email,
            "password": "clave-segura-123",
            "industry": industry,
        },
    )
    assert resp.status_code == 200, f"registro falló: {resp.status_code} {resp.text}"
    data = resp.json()
    assert data["role"] == "owner"
    return {
        "email": email,
        "business_id": data["business_id"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }


@pytest_asyncio.fixture(scope="module")
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url=BASE_URL, timeout=TIMEOUT
    ) as c:
        yield c


@pytest_asyncio.fixture(scope="module")
async def owner(client):
    """Negocio desechable principal (industry startup_software)."""
    return await _register_business(client)


# ---------------------------------------------------------------------------
# Equipo semilla
# ---------------------------------------------------------------------------

async def test_registro_crea_equipo_semilla_de_6(client, owner):
    resp = await client.get("/agents", headers=owner["headers"])
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) == SEED_TEAM_SIZE

    # Exactamente un manager (can_hire) y un revisor (is_reviewer)
    assert sum(1 for a in agents if a["can_hire"]) == 1
    assert sum(1 for a in agents if a["is_reviewer"]) == 1
    # Todos activos y del negocio correcto
    assert all(a["status"] == "active" for a in agents)
    assert all(a["business_id"] == owner["business_id"] for a in agents)
    # El asistente general "Segundo" está en el equipo
    template_keys = {a["template_key"] for a in agents}
    assert "general" in template_keys
    assert "manager_contratador" in template_keys
    assert "revisor_qa" in template_keys


async def test_seed_es_idempotente(client, owner):
    resp = await client.post("/agents/seed", headers=owner["headers"])
    assert resp.status_code == 200
    assert len(resp.json()) == SEED_TEAM_SIZE  # devuelve los existentes, no duplica

    resp2 = await client.get("/agents", headers=owner["headers"])
    assert len(resp2.json()) == SEED_TEAM_SIZE


# ---------------------------------------------------------------------------
# Catálogo de plantillas
# ---------------------------------------------------------------------------

async def test_catalogo_de_plantillas_completo(client, owner):
    resp = await client.get("/agents/templates", headers=owner["headers"])
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == CATALOG_SIZE


async def test_catalogo_filtrado_por_industria_con_alias(client, owner):
    """'startup_software' se traduce al alias 'tecnologia' en el filtro."""
    resp = await client.get(
        "/agents/templates",
        params={"industry": "startup_software"},
        headers=owner["headers"],
    )
    assert resp.status_code == 200
    keys = {t["key"] for t in resp.json()}
    assert "reclutador_tecnico" in keys  # industries: ["tecnologia", "agencia"]
    assert "manager_contratador" in keys  # comodín "*"


# ---------------------------------------------------------------------------
# CRUD de agentes (crear desde plantilla, editar, archivar)
# ---------------------------------------------------------------------------

async def test_ciclo_de_vida_de_agente(client, owner):
    # Crear desde plantilla
    resp = await client.post(
        "/agents", json={"template_key": "marketing"}, headers=owner["headers"]
    )
    assert resp.status_code == 201, resp.text
    agent = resp.json()
    agent_id = agent["id"]
    assert agent["template_key"] == "marketing"
    assert agent["name"] == "Mara"
    assert agent["status"] == "active"
    assert agent["system_prompt"], "la plantilla debe interpolar el system_prompt"

    # PATCH: editar nombre y persona
    resp = await client.patch(
        f"/agents/{agent_id}",
        json={"name": "Mara Estratega", "persona": "Persona editada para pruebas."},
        headers=owner["headers"],
    )
    assert resp.status_code == 200, resp.text
    updated = resp.json()
    assert updated["name"] == "Mara Estratega"
    assert updated["persona"] == "Persona editada para pruebas."

    # El roster activo ahora tiene 7 (semilla + contratado)
    resp = await client.get("/agents", headers=owner["headers"])
    assert len(resp.json()) == SEED_TEAM_SIZE + 1

    # DELETE: archivar (borrado suave)
    resp = await client.delete(f"/agents/{agent_id}", headers=owner["headers"])
    assert resp.status_code == 200
    assert resp.json() == {"archived": True, "id": agent_id}

    # Fuera del roster activo, visible con include_archived
    resp = await client.get("/agents", headers=owner["headers"])
    assert len(resp.json()) == SEED_TEAM_SIZE
    resp = await client.get(
        "/agents", params={"include_archived": "true"}, headers=owner["headers"]
    )
    archived = [a for a in resp.json() if a["id"] == agent_id]
    assert len(archived) == 1
    assert archived[0]["status"] == "archived"


async def test_crear_agente_con_plantilla_inexistente_da_404(client, owner):
    resp = await client.post(
        "/agents", json={"template_key": "plantilla_fantasma"}, headers=owner["headers"]
    )
    assert resp.status_code == 404


async def test_crear_agente_custom_sin_datos_da_422(client, owner):
    # Sin template_key se requieren name y role_title (validador del schema)
    resp = await client.post("/agents", json={}, headers=owner["headers"])
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Aislamiento multi-tenant
# ---------------------------------------------------------------------------

async def test_aislamiento_multi_tenant(client, owner):
    other = await _register_business(client, industry="restaurante")
    assert other["business_id"] != owner["business_id"]

    # El segundo negocio solo ve su propio equipo semilla
    resp = await client.get("/agents", headers=other["headers"])
    assert resp.status_code == 200
    other_agents = resp.json()
    assert len(other_agents) == SEED_TEAM_SIZE
    assert all(a["business_id"] == other["business_id"] for a in other_agents)

    # Un agente del primer negocio es 404 para el segundo (GET, PATCH y DELETE)
    resp = await client.get("/agents", headers=owner["headers"])
    foreign_agent_id = resp.json()[0]["id"]

    resp = await client.get(f"/agents/{foreign_agent_id}", headers=other["headers"])
    assert resp.status_code == 404
    resp = await client.patch(
        f"/agents/{foreign_agent_id}", json={"name": "Hackeado"}, headers=other["headers"]
    )
    assert resp.status_code == 404
    resp = await client.delete(f"/agents/{foreign_agent_id}", headers=other["headers"])
    assert resp.status_code == 404

    # Y sigue intacto para su dueño
    resp = await client.get(f"/agents/{foreign_agent_id}", headers=owner["headers"])
    assert resp.status_code == 200
    assert resp.json()["name"] != "Hackeado"


async def test_agents_sin_token_es_rechazado(client):
    # Sin header Authorization: HTTPBearer (auto_error=True) responde 403;
    # con un token inválido, decode_token responde 401.
    resp = await client.get("/agents")
    assert resp.status_code == 403

    resp = await client.get(
        "/agents", headers={"Authorization": "Bearer token-invalido"}
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Misiones — solo validación (no se lanzan misiones reales: no gastar LLM)
# ---------------------------------------------------------------------------

async def test_mission_con_objective_corto_da_422(client, owner):
    resp = await client.post(
        "/missions", json={"objective": "corto"}, headers=owner["headers"]
    )
    assert resp.status_code == 422  # min_length=10 en MissionCreate

    # No quedó ninguna misión creada para el negocio
    resp = await client.get("/missions", headers=owner["headers"])
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Límites por plan (Fase 5.1) — trial: 8 agentes activos
# ---------------------------------------------------------------------------

async def test_limite_de_agentes_del_plan_y_reactivacion(client):
    """Cupo trial = 8. Con el cupo lleno: crear da 403 y reactivar un
    archivado también (V3-11: archivar→reactivar no burla el límite)."""
    biz = await _register_business(client)
    h = biz["headers"]

    # Semilla (6) + 2 custom = 8 → cupo lleno
    created = []
    for i in range(2):
        resp = await client.post(
            "/agents",
            json={"name": f"Extra {i}", "role_title": "Especialista de prueba"},
            headers=h,
        )
        assert resp.status_code == 201, resp.text
        created.append(resp.json()["id"])

    # Noveno agente → 403 con mensaje de upgrade
    resp = await client.post(
        "/agents",
        json={"name": "Extra 9", "role_title": "No debería existir"},
        headers=h,
    )
    assert resp.status_code == 403
    assert "plan" in resp.json()["detail"].lower()

    # Archivar uno libera cupo y permite crear otro...
    resp = await client.delete(f"/agents/{created[0]}", headers=h)
    assert resp.status_code == 200
    resp = await client.post(
        "/agents",
        json={"name": "Reemplazo", "role_title": "Especialista de prueba"},
        headers=h,
    )
    assert resp.status_code == 201, resp.text

    # ...pero reactivar el archivado con el cupo lleno da 403 (V3-11)
    resp = await client.patch(
        f"/agents/{created[0]}", json={"status": "active"}, headers=h
    )
    assert resp.status_code == 403
    assert "plan" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Permisos owner/employee (V3-1 y V3-5)
# ---------------------------------------------------------------------------

async def test_empleado_no_lee_misiones_ni_system_prompts(client, owner):
    """V3-1: misiones son owner-only. V3-5: el empleado ve el roster pero
    sin system_prompt (instrucciones internas solo para el dueño)."""
    phone = f"+57300{uuid4().hex[:7]}"
    resp = await client.post(
        "/invite",
        json={
            "phone": phone,
            "name": "Empleado E2E",
            "custom_password": "clave-empleado-123",
        },
        headers=owner["headers"],
    )
    assert resp.status_code == 200, resp.text

    resp = await client.post(
        "/auth/login", json={"phone": phone, "password": "clave-empleado-123"}
    )
    assert resp.status_code == 200, resp.text
    emp_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # V3-1: lecturas de misiones → 403 para el empleado
    resp = await client.get("/missions", headers=emp_headers)
    assert resp.status_code == 403
    resp = await client.get(f"/missions/{uuid4()}", headers=emp_headers)
    assert resp.status_code == 403

    # V3-5: el roster es visible pero sin system_prompt
    resp = await client.get("/agents", headers=emp_headers)
    assert resp.status_code == 200
    agents = resp.json()
    assert agents, "el empleado debe ver el roster"
    assert all(a["system_prompt"] is None for a in agents)

    # El dueño sí ve los system_prompt de su equipo
    resp = await client.get("/agents", headers=owner["headers"])
    assert any(a["system_prompt"] for a in resp.json())
