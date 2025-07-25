from pydantic import BaseModel
from typing import List


class RecommendRequest(BaseModel):
    user_id: str
    gender: str
    age: int
    cart: List[str]  # 상품 asin 문자열 최대 5개


class RecommendResponse(BaseModel):
    recommendations: List[dict]  # {"asin": str, "title": str} 등
