from pydantic import BaseModel
from typing import List


class RecommendRequest(BaseModel):
    user_id: str
    gender: str
    age: int = 0
    cart: List[str]
    wishlist: List[str] = []


class RecommendResponse(BaseModel):
    user_id: str
    recommendations: List[str]
