import os
import joblib
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Load the model ONCE when the serverless function wakes up (Cold Start)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, 'random_forest_model.pkl')
model = joblib.load(model_path)

# Define the expected incoming data (an array of 18 floats)
class PredictionInput(BaseModel):
    features: list[float]

@app.post("/api/predict")
def predict(data: PredictionInput):
    # Predict directly using a 2D list (No Pandas needed!)
    # We wrap data.features in a list [] because scikit-learn expects a 2D array
    prediction = model.predict([data.features])[0]
    
    return {"prediction": round(float(prediction), 2)}