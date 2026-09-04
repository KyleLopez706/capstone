import os
import warnings
warnings.filterwarnings("ignore")
import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model ONCE when the serverless function wakes up (Cold Start)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, 'random_forest_model.pkl')
model = joblib.load(model_path)

from typing import Optional, List

# Define the expected incoming data (single feature array or batch of feature arrays)
class PredictionInput(BaseModel):
    features: Optional[List[float]] = None
    batch: Optional[List[List[float]]] = None

@app.post("/api/predict")
@app.post("/predict")
def predict(data: PredictionInput):
    if data.batch:
        predictions = model.predict(data.batch)
        return {"predictions": [round(float(p), 2) for p in predictions]}
    
    if data.features:
        prediction = model.predict([data.features])[0]
        return {"prediction": round(float(prediction), 2)}

    return {"error": "No features or batch provided"}, 400