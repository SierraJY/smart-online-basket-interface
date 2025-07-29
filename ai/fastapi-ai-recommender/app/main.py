from fastapi import FastAPI
from app import schemas
from app.models import member, guest

app = FastAPI()


@app.post("/recommend", response_model=schemas.RecommendResponse)
def recommend(req: schemas.RecommendRequest):
    if req.user_id.startswith("guest"):
        results = guest.recommend(cart_items=req.cart)
    else:
        results = member.recommend(
            user_id=req.user_id,
            gender=req.gender,
            age=req.age,
            cart=req.cart,
            wish_list=req.wishlist,
            topk=5,
        )
    return {"recommendations": results}
