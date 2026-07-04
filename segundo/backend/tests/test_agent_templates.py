"""
Unit tests del catálogo de plantillas de agentes
(app/services/agent_templates.py + app/data/agent_templates/catalog.json).
"""
import pytest

from app.services.agent_templates import (
    clear_templates_cache,
    filter_templates_by_industry,
    get_template,
    load_agent_templates,
)

EXPECTED_TEMPLATE_COUNT = 11


@pytest.fixture(autouse=True)
def _fresh_cache():
    """El catálogo se cachea en memoria: cada test parte de un cache limpio."""
    clear_templates_cache()
    yield
    clear_templates_cache()


def test_catalogo_carga_11_plantillas():
    templates = load_agent_templates()
    assert len(templates) == EXPECTED_TEMPLATE_COUNT
    keys = [t["key"] for t in templates]
    assert len(keys) == len(set(keys)), "keys duplicadas en el catálogo"
    # Campos normalizados presentes en todas
    for t in templates:
        assert t["key"] and t["name"] and t["role_title"]
        assert isinstance(t["domain_scopes"], list)
        assert isinstance(t["industries"], list) and t["industries"]
        assert isinstance(t["can_hire"], bool)
        assert isinstance(t["is_reviewer"], bool)


def test_catalogo_se_cachea_en_memoria():
    first = load_agent_templates()
    assert load_agent_templates() is first  # misma lista: cache activo


def test_manager_contratador_tiene_can_hire():
    template = get_template("manager_contratador")
    assert template is not None
    assert template["can_hire"] is True
    assert template["is_reviewer"] is False


def test_revisor_qa_es_reviewer():
    template = get_template("revisor_qa")
    assert template is not None
    assert template["is_reviewer"] is True
    assert template["can_hire"] is False


def test_get_template_inexistente_devuelve_none():
    assert get_template("no_existe") is None
    assert get_template("") is None


def test_filter_por_industria_con_alias_startup_software():
    """'startup_software' se traduce al alias 'tecnologia' antes de filtrar."""
    keys = {t["key"] for t in filter_templates_by_industry("startup_software")}
    assert "reclutador_tecnico" in keys
    # Las plantillas comodín ("*") siempre aplican
    assert "manager_contratador" in keys
    assert "revisor_qa" in keys


def test_filter_sin_industria_devuelve_todo():
    todos = filter_templates_by_industry(None)
    assert len(todos) == EXPECTED_TEMPLATE_COUNT
    assert todos == load_agent_templates()


def test_filter_industria_desconocida_devuelve_solo_comodines():
    resultado = filter_templates_by_industry("industria_inventada_xyz")
    assert resultado, "las plantillas comodín deben aplicar siempre"
    for t in resultado:
        assert "*" in t["industries"]
    # Las específicas de industria quedan fuera
    keys = {t["key"] for t in resultado}
    assert "reclutador_tecnico" not in keys
    assert "soporte_tecnico" not in keys
