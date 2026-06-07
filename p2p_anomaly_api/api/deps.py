

import logging
from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

from core.config import settings

logger = logging.getLogger(__name__)

VALID_ROLES = {"admin", "analyst", "viewer"}

@dataclass
class Identity:
                                                                
    user_id: Optional[str]
    role: str
    is_member: bool
    enforced: bool                                              

def _resolve_identity(
    x_user_id: Optional[str],
    x_user_role: Optional[str],
    x_user_member: Optional[str],
    x_gateway_secret: Optional[str],
) -> Identity:

       
    secret = settings.GATEWAY_SHARED_SECRET
    if not secret:
                                           
        return Identity(user_id=x_user_id, role=x_user_role or "admin",
                        is_member=True, enforced=False)

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
                                                                    
    return _resolve_identity(x_user_id, x_user_role, x_user_member, x_gateway_secret)

async def require_membership(
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_member: Optional[str] = Header(None),
    x_gateway_secret: Optional[str] = Header(None),
) -> Identity:
                                                                  
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
