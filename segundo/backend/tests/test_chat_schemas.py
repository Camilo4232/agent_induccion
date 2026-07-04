"""Tests unitarios de límites de tamaño en el chat de agentes (hallazgo V3-4).

Verifican que `AgentChatRequest.history` tiene tope de mensajes y que cada
mensaje del historial tiene tope de longitud, para evitar bodies gigantes.
"""

import pytest
from pydantic import ValidationError

from app.db.schemas import AgentChatHistoryMessage, AgentChatRequest


def test_history_acepta_hasta_50_mensajes():
    req = AgentChatRequest(
        message="hola",
        history=[{"role": "user", "content": "x"}] * 50,
    )
    assert len(req.history) == 50


def test_history_rechaza_mas_de_50_mensajes():
    with pytest.raises(ValidationError):
        AgentChatRequest(
            message="hola",
            history=[{"role": "user", "content": "x"}] * 51,
        )


def test_history_sin_mensajes_sigue_siendo_opcional():
    req = AgentChatRequest(message="hola")
    assert req.history is None


def test_mensaje_de_historial_rechaza_contenido_mayor_a_4000():
    with pytest.raises(ValidationError):
        AgentChatHistoryMessage(role="user", content="a" * 4001)


def test_mensaje_de_historial_acepta_contenido_de_4000():
    msg = AgentChatHistoryMessage(role="assistant", content="a" * 4000)
    assert len(msg.content) == 4000


def test_mensaje_de_historial_rechaza_role_gigante():
    with pytest.raises(ValidationError):
        AgentChatHistoryMessage(role="r" * 21, content="hola")
