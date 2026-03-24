"""HTTP: users and auth."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from deps import get_current_user
from model.user_model import User
from schema.user_schemas import TokenResponse, UserLoginRequest, UserPublic, UserSignupRequest
from service import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/signup",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
)
async def signup(
    body: UserSignupRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UserPublic:
    return await user_service.signup(body, session)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
async def login(
    body: UserLoginRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    return await user_service.login(body, session)


@router.get(
    "/me",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
)
async def me(
    current: Annotated[User, Depends(get_current_user)],
) -> UserPublic:
    return UserPublic.model_validate(current)
