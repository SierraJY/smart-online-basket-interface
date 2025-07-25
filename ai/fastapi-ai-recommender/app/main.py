from fastapi import FastAPI
from app import model, schemas

app = FastAPI()


@app.post("/recommend", response_model=schemas.RecommendResponse)
def recommend(req: schemas.RecommendRequest):
    # 핵심 추천 로직은 model.py로 위임
    results = model.recommend(
        user_id=req.user_id, gender=req.gender, age=req.age, cart=req.cart
    )
    return results
