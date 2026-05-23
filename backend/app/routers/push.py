"""
Web Push endpoints: VAPID public key, subscription management, reminder delivery.
"""

import asyncio
import base64
import json
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter
from pydantic import BaseModel
from pywebpush import webpush, WebPushException

from app.db.connection import get_pool, get_settings

router = APIRouter(prefix="/api/push", tags=["push"])

_executor = ThreadPoolExecutor(max_workers=4)


def _private_pem() -> str:
    """Decode the base64-encoded PEM private key from settings."""
    raw = get_settings().vapid_private_key
    return base64.b64decode(raw).decode()


def _send_one(endpoint: str, p256dh: str, auth: str, payload: dict) -> None:
    webpush(
        subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
        data=json.dumps(payload),
        vapid_private_key=_private_pem(),
        vapid_claims={"sub": get_settings().vapid_mailto},
    )


# ─── GET /api/push/vapid-key ─────────────────────────────────────────────────

@router.get("/vapid-key")
async def vapid_key():
    return {"public_key": get_settings().vapid_public_key}


# ─── POST /api/push/subscribe ────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.post("/subscribe")
async def subscribe(body: SubscribeRequest):
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO push_subscriptions (endpoint, p256dh, auth)
        VALUES ($1, $2, $3)
        ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3
        """,
        body.endpoint, body.p256dh, body.auth,
    )
    return {"ok": True}


# ─── POST /api/push/send-reminder ────────────────────────────────────────────

@router.post("/send-reminder")
async def send_reminder():
    """Send a study reminder to all subscribers. Call this from a daily cron."""
    pool = get_pool()
    rows = await pool.fetch("SELECT endpoint, p256dh, auth FROM push_subscriptions")
    if not rows:
        return {"sent": 0, "failed": 0}

    payload = {
        "title": "Apti — Study Window",
        "body": "Your daily study session is ready. Keep the streak going.",
    }

    sent, failed, dead = 0, 0, []
    loop = asyncio.get_running_loop()

    for row in rows:
        try:
            await loop.run_in_executor(
                _executor, _send_one,
                row["endpoint"], row["p256dh"], row["auth"], payload,
            )
            sent += 1
        except WebPushException as e:
            if e.response is not None and e.response.status_code in (404, 410):
                dead.append(row["endpoint"])
            else:
                failed += 1

    if dead:
        await pool.executemany(
            "DELETE FROM push_subscriptions WHERE endpoint = $1",
            [(ep,) for ep in dead],
        )

    return {"sent": sent, "failed": failed, "expired_removed": len(dead)}
