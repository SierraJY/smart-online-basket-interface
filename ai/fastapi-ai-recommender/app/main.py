from fastapi import FastAPI
from app import model, schemas

app = FastAPI()


@app.post("/recommend", response_model=schemas.RecommendResponse)
def recommend(req: schemas.RecommendRequest):
    results = model.recommend(
        user_id=req.user_id,
        gender=req.gender,
        age=req.age,
        cart=req.cart,
        wishlist=req.wishlist,
    )
    return {"recommendations": results}
