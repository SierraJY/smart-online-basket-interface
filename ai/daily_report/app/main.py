from fastapi import FastAPI
from app.models import kmeans, fp_growth, prophet, lightgbm
from app.services.llm_summarizer import summarize_with_llm


app = FastAPI()


@app.get("/")
def root():
    return {"message": "Daily Report API is running."}


@app.get("/report/kmeans")
def get_kmeans_report():
    summary, image_path = kmeans.generate_spend_cluster_summary()
    summary_llm = summarize_with_llm(summary)
    return {
        "summary": summary_llm,
        "image": image_path
    }


@app.get("/report/fpgrowth")
def get_fpgrowth_report():
    summary, image_path = fp_growth.generate_association_summary()
    summary_llm = summarize_with_llm(summary)
    return {
        "summary": summary_llm,
        "image": image_path
    }


@app.get("/report/prophet")
def get_prophet_report():
    summary, image_path = prophet.generate_trend_summary()
    summary_llm = summarize_with_llm(summary)
    return {
        "summary": summary_llm,
        "image": image_path
    }


@app.get("/report/lightgbm")
def get_lightgbm_report():
    summary, image_path = lightgbm.generate_forecast_summary()
    summary_llm = summarize_with_llm(summary)
    return {
        "summary": summary_llm,
        "image": image_path
    }
