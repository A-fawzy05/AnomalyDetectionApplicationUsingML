"""
SQLAlchemy ORM models for the P2P Anomaly Detection API.
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import MetaData

# All tables live in the "p2p" schema
metadata = MetaData(schema="p2p")
Base = declarative_base(metadata=metadata)

