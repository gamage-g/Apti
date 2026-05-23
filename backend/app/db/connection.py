"""
Async PostgreSQL connection pool via asyncpg.
Settings are loaded lazily so the module can be imported without a .env file.
Call init_pool() on app startup, close_pool() on shutdown.
"""

import asyncpg
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    deepseek_api_key: str = ""
    cors_origin: str = "http://localhost:5173"  # comma-separated list for multiple origins
    # Verify current model IDs and pricing at https://api-docs.deepseek.com/quick_start/pricing
    deepseek_model: str = "deepseek-v4-flash"
    # VAPID keys for Web Push — base64-encoded PEM private key, raw public key
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_mailto: str = "mailto:admin@apti.app"

    class Config:
        env_file = ".env"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    s = get_settings()
    _pool = await asyncpg.create_pool(s.database_url, min_size=2, max_size=10)


async def close_pool() -> None:
    if _pool:
        await _pool.close()


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialised — call init_pool() first")
    return _pool
