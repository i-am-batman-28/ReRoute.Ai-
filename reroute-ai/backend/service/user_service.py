"""Business logic: users and auth."""

from __future__ import annotations

import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from dao.user_dao import UserDAO
from model.user_model import User
from schema.user_schemas import TokenResponse, UserLoginRequest, UserPublic, UserSignupRequest
from utils.jwt_utils import create_access_token
from utils.password import hash_password, verify_password

logger = logging.getLogger(__name__)


async def signup(payload: UserSignupRequest, session: AsyncSession) -> UserPublic:
    dao = UserDAO(session)
    if await dao.get_by_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = await dao.create(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    await session.commit()
    logger.info("user_signup", extra={"user_id": user.id})
    return UserPublic.model_validate(user)


async def login(payload: UserLoginRequest, session: AsyncSession) -> TokenResponse:
    dao = UserDAO(session)
    user = await dao.get_by_email(payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(
        subject=user.id,
        extra={"email": user.email},
    )
    logger.info("user_login", extra={"user_id": user.id})
    return TokenResponse(access_token=token)


async def get_user_by_id(user_id: str, session: AsyncSession) -> User:
    dao = UserDAO(session)
    user = await dao.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
