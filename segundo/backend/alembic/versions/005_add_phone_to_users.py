"""add phone to users, make email nullable

Revision ID: 005
Revises: 004
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('phone', sa.Text(), nullable=True))
    op.create_unique_constraint('users_phone_key', 'users', ['phone'])
    # Make email nullable so employees only need a phone
    op.alter_column('users', 'email', nullable=True)


def downgrade():
    op.alter_column('users', 'email', nullable=False)
    op.drop_constraint('users_phone_key', 'users', type_='unique')
    op.drop_column('users', 'phone')
