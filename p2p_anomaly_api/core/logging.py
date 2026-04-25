"""
Structured logging configuration.
"""

import logging
import sys
from p2p_anomaly_api.core.config import settings

def setup_logging():
    logging.basicConfig(
        level=settings.LOG_LEVEL,
        format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}',
        stream=sys.stdout
    )
