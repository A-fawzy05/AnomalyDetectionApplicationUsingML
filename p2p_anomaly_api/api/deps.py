"""
Cross-service authorization dependencies (trusted-gateway pattern).

The anomaly service sits *behind* the Node.js API gateway. The gateway is the
only component that talks to the user-facing world: it authenticates the end
user (JWT), looks up their team membership in MongoDB, and forwards the caller's
identity on every request as a set of signed headers:

    X-User-Id        the Mongo user id (opaque, for logging/audit)
    X-User-Role      one of: admin | analyst | viewer
    X-User-Member    "true" if the user belongs to at least one team, else "false"
    X-Gateway-Secret the shared secret proving the request came from the gateway

These dependencies enforce the policy the team selected — **strict membership
everywhere**:

    * EVERY data endpoint requires team membership. A caller who is not a member
      (regardless of role — including an admin) is refused 403. This is the
      headline rule: "an admin who is not a team member cannot generate a
      report (or analyze, or even view) — the anomaly service refuses."
    * Among members, the role further restricts the *write/compute* actions:
      `analyze` and `report` require an admin or analyst role; a viewer member
      is refused 403. Read endpoints (runs/cases) are open to any member.

Enforcement is active only when `GATEWAY_SHARED_SECRET` is configured. With no
secret set the service runs "open" (no checks) so it can still be driven
directly in local/unit testing without forging gateway headers.
"""

import logging
from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

from core.config import settings

logger = logging.getLogger(__name__)

VALID_ROLES = {"admin", "analyst", "viewer"}


@dataclass
class Identity:
    """The authenticated caller, as forwarded by the gateway."""
    user_id: Optional[str]
    role: str
    is_member: bool
    enforced: bool  # True when the gateway secret was validated


def _resolve_identity(
    x_user_id: Optional[str],
    x_user_role: Optional[str],
    x_user_member: Optional[str],
    x_gateway_secret: Optional[str],
) -> Identity:
    """Validate the gateway headers and build an Identity.

    If no GATEWAY_SHARED_SECRET is configured the service is in open mode and we
    return a permissive identity (enforced=False) so checks become no-ops.
    """
    secret = settings.GATEWAY_SHARED_SECRET
    if not secret:
        # Open mode — enforcement disabled.
        return Identity(user_id=x_user_id, role=x_user_role or "admin",
                        is_member=True, enforced=False)

    # Enforcement on: the request MUST come from the trusted gateway.
    if not x_gateway_secret or x_gateway_secret != secret:
        logger.warning({"event": "gateway_secret_rejected", "user": x_user_id})
        raise HTTPException(
            status_code=401,
            detail="Request did not come through the API gateway.",
        )

    role = (x_user_role or "").lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=401, detail="Missing or invalid user role.")

    is_member = (x_user_member or "").lower() == "true"
    return Identity(user_id=x_user_id, role=role, is_member=is_member, enforced=True)


async def get_identity(
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_member: Optional[str] = Header(None),
    x_gateway_secret: Optional[str] = Header(None),
) -> Identity:
    """FastAPI dependency: resolve the forwarded caller identity."""
    return _resolve_identity(x_user_id, x_user_role, x_user_member, x_gateway_secret)


async def require_membership(
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_member: Optional[str] = Header(None),
    x_gateway_secret: Optional[str] = Header(None),
) -> Identity:
    """Allow only callers who are members of at least one team."""
    identity = _resolve_identity(x_user_id, x_user_role, x_user_member, x_gateway_secret)
    if identity.enforced and not identity.is_member:
        logger.info({"event": "access_denied_not_member",
                     "user": identity.user_id, "role": identity.role})
        raise HTTPException(
            status_code=403,
            detail=("Caller is not a member of any team. This action is "
                    "restricted to team members."),
        )
    return identity


def require_roles(*allowed_roles: str):
    """Build a dependency that requires membership AND one of `allowed_roles`.

    Membership is checked first (so a non-member admin is refused as
    "not a member" rather than leaking which roles are allowed).
    """
    allowed = {r.lower() for r in allowed_roles}

    async def dependency(
        x_user_id: Optional[str] = Header(None),
        x_user_role: Optional[str] = Header(None),
        x_user_member: Optional[str] = Header(None),
        x_gateway_secret: Optional[str] = Header(None),
    ) -> Identity:
        identity = _resolve_identity(x_user_id, x_user_role, x_user_member, x_gateway_secret)
        if not identity.enforced:
            return identity
        if not identity.is_member:
            raise HTTPException(
                status_code=403,
                detail=("Caller is not a member of any team. This action is "
                        "restricted to team members."),
            )
        if identity.role not in allowed:
            logger.info({"event": "access_denied_role", "user": identity.user_id,
                         "role": identity.role, "allowed": sorted(allowed)})
            raise HTTPException(
                status_code=403,
                detail=(f"Role '{identity.role}' is not permitted to perform this "
                        f"action. Allowed roles: {', '.join(sorted(allowed))}."),
            )
        return identity

    return dependency
