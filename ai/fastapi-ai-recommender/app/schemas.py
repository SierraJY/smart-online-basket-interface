from pydantic import BaseModel
from typing import List, Optional


class RecommendationItem(BaseModel):
    asin: str
    title: str


class RecommendRequest(BaseModel):
    user_id: str
    gender: str
    age: Optional[int] = 0
    cart: List[str]
    wishlist: List[str] = []


class RecommendResponse(BaseModel):
    recommendations: List[RecommendationItem]
