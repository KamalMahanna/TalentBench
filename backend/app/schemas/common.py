from typing import Generic, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(populate_by_name=True)

    data: T
    message: str | None = None
    error: str | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(populate_by_name=True)

    data: list[T]
    total: int
    page: int
    page_size: int
    has_more: bool
