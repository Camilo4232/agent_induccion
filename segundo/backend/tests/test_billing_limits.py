"""
Tests unitarios de los límites por plan (Fase 5.1) — funciones puras de billing.
"""
from app.api.billing import (
    PLANS,
    TRIAL_LIMITS,
    get_plan_display_name,
    get_plan_limits,
)
from app.services.team_service import SEED_TEMPLATE_KEYS


def test_limites_de_plan_conocido():
    assert get_plan_limits("negocio") == {
        "max_agents": 15,
        "max_missions_per_month": 50,
    }


def test_plan_none_usa_limites_de_prueba():
    assert get_plan_limits(None) == TRIAL_LIMITS


def test_plan_desconocido_usa_limites_de_prueba():
    assert get_plan_limits("plan-inventado") == TRIAL_LIMITS


def test_get_plan_limits_devuelve_copia():
    # Mutar el resultado no debe contaminar TRIAL_LIMITS
    limits = get_plan_limits(None)
    limits["max_agents"] = 999
    assert get_plan_limits(None)["max_agents"] == TRIAL_LIMITS["max_agents"]


def test_todos_los_planes_definen_limites_positivos():
    for key, plan in PLANS.items():
        assert plan["max_agents"] > 0, key
        assert plan["max_missions_per_month"] > 0, key


def test_equipo_semilla_cabe_en_todos_los_planes():
    # Invariante del seed: /agents/seed asume que el equipo inicial siempre
    # cabe en cualquier plan (agents.py solo chequea con roster vacío).
    seed_size = len(SEED_TEMPLATE_KEYS) + 1  # + agente general "Segundo"
    assert TRIAL_LIMITS["max_agents"] >= seed_size
    for key, plan in PLANS.items():
        assert plan["max_agents"] >= seed_size, key


def test_nombre_visible_del_plan():
    assert get_plan_display_name("negocio") == "Negocio"
    assert get_plan_display_name(None) == "Prueba gratuita"
    assert get_plan_display_name("plan-inventado") == "Prueba gratuita"
