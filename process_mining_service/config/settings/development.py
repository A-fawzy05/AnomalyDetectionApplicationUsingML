from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Use SQLite for quick local dev if no Postgres is available
# Comment out DATABASES override to use Postgres from base.py

LOGGING["root"]["level"] = "DEBUG"  # noqa: F405
