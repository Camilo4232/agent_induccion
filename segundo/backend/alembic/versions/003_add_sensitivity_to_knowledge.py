"""add sensitivity column to knowledge_entries

Revision ID: 003
Revises: 002
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'knowledge_entries',
        sa.Column('sensitivity', sa.String(20), nullable=True, server_default='public')
    )
    # Mark all existing entries as public (safe default)
    op.execute("UPDATE knowledge_entries SET sensitivity = 'public' WHERE sensitivity IS NULL")


def downgrade() -> None:
    op.drop_column('knowledge_entries', 'sensitivity')
