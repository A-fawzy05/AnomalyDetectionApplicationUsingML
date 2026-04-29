"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2024-04-25 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create schema
    op.execute("CREATE SCHEMA IF NOT EXISTS p2p")
    
    # 2. Enable pgcrypto for UUID generation
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # 3. Create analysis_runs table
    op.create_table(
        'analysis_runs',
        sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('file_name', sa.Text(), nullable=False),
        sa.Column('file_type', sa.Text(), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('total_cases', sa.Integer(), nullable=True),
        sa.Column('anomalous_cases', sa.Integer(), nullable=True),
        sa.Column('anomaly_rate', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('avg_processing_time_days', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('status', sa.Text(), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('run_id'),
        schema='p2p'
    )

    # 4. Create case_results table
    op.create_table(
        'case_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('case_id', sa.Text(), nullable=False),
        sa.Column('supplier', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('currency', sa.Text(), nullable=True, server_default='EUR'),
        sa.Column('anomaly_type', sa.Text(), nullable=True),
        sa.Column('severity_score', sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column('severity_label', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), nullable=False, server_default='Open'),
        sa.Column('if_score', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('lstm_case_score', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('hybrid_score', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('case_duration_hours', sa.Numeric(precision=12, scale=4), nullable=True),
        sa.Column('off_hours_ratio', sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column('price_deviation_pct', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('vendor_case_frequency', sa.Integer(), nullable=True),
        sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['run_id'], ['p2p.analysis_runs.run_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('run_id', 'case_id', name='uq_run_case'),
        schema='p2p'
    )

    # 5. Create case_flags table
    op.create_table(
        'case_flags',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('case_result_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('price_mismatch', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('three_way_match_failure', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('maverick_buying', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('temporal_delay', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('duplicate_invoice', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('unauthorized_vendor', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('quantity_variance', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['case_result_id'], ['p2p.case_results.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        schema='p2p'
    )

    # 6. Create phase_summaries table
    op.create_table(
        'phase_summaries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('phase', sa.Text(), nullable=False),
        sa.Column('total_cases', sa.Integer(), nullable=False),
        sa.Column('anomalies', sa.Integer(), nullable=False),
        sa.Column('anomaly_rate', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['p2p.analysis_runs.run_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        schema='p2p'
    )

    # 7. Create event_log table
    op.create_table(
        'event_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('case_id', sa.Text(), nullable=False),
        sa.Column('activity', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resource', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('vendor', sa.Text(), nullable=True),
        sa.Column('document_type', sa.Text(), nullable=True),
        sa.Column('spend_area', sa.Text(), nullable=True),
        sa.Column('item_category', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['p2p.analysis_runs.run_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        schema='p2p'
    )

    # 8. Create Indexes
    op.create_index('idx_case_results_run_id', 'case_results', ['run_id'], schema='p2p')
    op.create_index('idx_case_results_severity', 'case_results', ['severity_label'], schema='p2p')
    op.create_index('idx_case_results_type', 'case_results', ['anomaly_type'], schema='p2p')
    op.create_index('idx_case_results_status', 'case_results', ['status'], schema='p2p')
    op.create_index('idx_event_log_run_case', 'event_log', ['run_id', 'case_id'], schema='p2p')
    op.create_index('idx_phase_run', 'phase_summaries', ['run_id'], schema='p2p')


def downgrade() -> None:
    op.drop_index('idx_phase_run', table_name='phase_summaries', schema='p2p')
    op.drop_index('idx_event_log_run_case', table_name='event_log', schema='p2p')
    op.drop_index('idx_case_results_status', table_name='case_results', schema='p2p')
    op.drop_index('idx_case_results_type', table_name='case_results', schema='p2p')
    op.drop_index('idx_case_results_severity', table_name='case_results', schema='p2p')
    op.drop_index('idx_case_results_run_id', table_name='case_results', schema='p2p')
    
    op.drop_table('event_log', schema='p2p')
    op.drop_table('phase_summaries', schema='p2p')
    op.drop_table('case_flags', schema='p2p')
    op.drop_table('case_results', schema='p2p')
    op.drop_table('analysis_runs', schema='p2p')
    
    op.execute("DROP SCHEMA p2p CASCADE")

