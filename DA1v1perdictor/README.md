# AI Character Battle Predictor

An advanced neural network-based system for predicting 1v1 battle outcomes between characters from video games, movies, comics, and other media.

## Features

- **Neural Network Architecture**: Multi-layer neural network with attention mechanisms, batch normalization, and dropout for robust predictions
- **Semantic Name Analysis**: TF-IDF vectorization and NLP techniques to extract character traits from names
- **Dynamic Character Profiling**: Infers abilities, elemental affinities, and combat styles from name components
- **Detailed Analysis**: Provides a comprehensive breakdown of why one character wins over another
- **Confidence Scoring**: Percentage-based confidence with High/Medium/Low categorization
- **RESTful API**: Flask-based API for external integration
- **Model Persistence**: Save and load trained models without retraining

## Project Structure

- `app.py`: Flask server + API endpoints (`/api/predict`, `/api/health`, `/api/stats`)
- `battle_predictor.py`: Core feature extraction, neural network model, training + prediction logic
- `index.html`, `styles.css`, `script.js`: Minimal front-end UI calling the Flask API
- `App.tsx`: (Unused in current served HTML) TypeScript/React UI scaffolding
- `requirements.txt`: Python dependencies

## Installation



### 1) Backend (Python)

```bash
pip install -r requirements.txt
```

### 2) Frontend (Static UI)

No build step is required for the bundled UI. The project includes static files (`index.html`, `styles.css`, `script.js`).

## Run the application

### Start the Flask server

```bash
python app.py
```

- Server runs on `http://localhost:5000/`
- The backend will:
  - Load `battle_model_model.h5` if present
  - Otherwise, train a new model from built-in demonstration characters

### Open the UI

Open `index.html` in a browser (or serve the folder with any static server). Then submit two character names.

**Note:** The static UI calls the Flask API at `/api/predict`.

## API Reference

### `POST /api/predict`

Predict the winner between two character names.

**Request body**

```json
{
  "character1": "Thor",
  "character2": "Superman"
}
```

**Response**

```json
{
  "winner": "Thor",
  "loser": "Superman",
  "probability": 0.73,
  "confidence": 146.0,
  "analysis": "<br>• ...",
  "attribute_comparison": {
    "strength": { "char1": 42.1, "char2": 38.0 }
  },
  "combat_breakdown": "<br>⚔️ ..."
}
```

### `GET /api/health`

Returns server/model status.

### `GET /api/stats`

Returns Keras model parameter stats.

## Training / Model Persistence

- Training happens automatically on startup if the saved model files are not found.
- The system saves:
  - `battle_model_model.h5`
  - `battle_model_vectorizer.pkl`
  - `battle_model_scaler.pkl`
  - `battle_model_config.json`

## Notes / Caveats

- This is a **name-based** predictor (semantic/phonetic-ish features + TF-IDF over the provided names). It does not use canonical character stats from game/comic databases.
- If you want to replace or expand training data, update the `demonstration_characters` list in both `app.py` and `battle_predictor.py`.
- `App.tsx` appears to be a larger React/IndexedDB UI, but the currently served `index.html` uses `script.js`.

