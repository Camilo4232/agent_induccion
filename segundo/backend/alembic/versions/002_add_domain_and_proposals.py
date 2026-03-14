"""Add domain to knowledge_entries and create knowledge_proposals table

Revision ID: 002
Revises: 001
Create Date: 2026-03-09 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add domain column to knowledge_entries (nullable, default 'general')
    op.execute("""
        ALTER TABLE knowledge_entries
        ADD COLUMN IF NOT EXISTS domain VARCHAR(50) DEFAULT 'general'
    """)

    # Backfill domain from existing category values
    op.execute("""
        UPDATE knowledge_entries SET domain = CASE
            WHEN category IN ('precios', 'descuentos') THEN 'ventas'
            WHEN category IN ('proveedores', 'inventario', 'horarios') THEN 'operaciones'
            WHEN category = 'clientes' THEN 'clientes'
            WHEN category = 'legal' THEN 'legal'
            ELSE 'general'
        END
    """)

    # Create knowledge_proposals table
    op.execute("""
        CREATE TABLE IF NOT EXISTS knowledge_proposals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id),
            proposed_fact TEXT NOT NULL,
            domain VARCHAR(50) DEFAULT 'general',
            category VARCHAR(50),
            source_session_id UUID REFERENCES chat_sessions(id),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # Create knowledge_conflicts table
    op.execute("""
        CREATE TABLE IF NOT EXISTS knowledge_conflicts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id),
            fact_a_id UUID NOT NULL REFERENCES knowledge_entries(id),
            fact_b_id UUID NOT NULL REFERENCES knowledge_entries(id),
            explanation TEXT,
            resolved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS knowledge_conflicts")
    op.execute("DROP TABLE IF EXISTS knowledge_proposals")
    op.execute("ALTER TABLE knowledge_entries DROP COLUMN IF EXISTS domain")
