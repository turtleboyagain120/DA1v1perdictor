from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from battle_predictor import BattlePredictorSystem
import logging
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

system = BattlePredictorSystem()

MODEL_PATH = "battle_model"

if os.path.exists(f"{MODEL_PATH}_model.h5"):
    logger.info("Loading pre-trained model...")
    system.load(MODEL_PATH)
else:
    logger.info("Training new model...")
    demonstration_characters = [
        "Goku", "Vegeta", "Superman", "Batman", "Thor", "Loki", "Hulk", "Iron Man",
        "Wonder Woman", "Flash", "Aquaman", "Green Lantern", "Wolverine", "Cyclops",
        "Storm", "Magneto", "Doctor Strange", "Scarlet Witch", "Thanos", "Darkseid",
        "Naruto", "Sasuke", "Luffy", "Zoro", "Ichigo", "Aizen", "Gon", "Killua",
        "Fire Lord Ozai", "Shadow Fiend", "Dark Knight", "Ice Queen", "Thunder God",
        "Void Walker", "Holy Paladin", "Death Knight", "Demon Hunter", "Dragon Slayer",
        "Phoenix King", "Storm Breaker", "Iron Fist", "Steel Warrior", "Blade Master",
        "Venom Strike", "Shadow Assassin", "Light Mage", "Earth Shaker", "Wind Runner",
        "Captain America", "Black Panther", "Doctor Doom", "Galactus", "Silver Surfer",
        "Joker", "Harley Quinn", "Deadpool", "Venom", "Carnage", "Spawn",
        "Raiden", "Scorpion", "Sub-Zero", "Liu Kang", "Ryu", "Akuma", "Mega Man"
    ]
    system.train(demonstration_characters, epochs=30)
    system.save(MODEL_PATH)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict battle outcome between two characters."""
    try:
        data = request.get_json()
        
        if not data or 'character1' not in data or 'character2' not in data:
            return jsonify({'error': 'Missing character1 or character2 in request body'}), 400
        
        char1 = data['character1'].strip()
        char2 = data['character2'].strip()
        
        if not char1 or not char2:
            return jsonify({'error': 'Character names cannot be empty'}), 400
        
        if char1.lower() == char2.lower():
            return jsonify({
                'winner': 'DRAW',
                'loser': 'DRAW',
                'probability': 0.5,
                'confidence': 100.0,
                'analysis': 'Both characters are identical. This results in a perfectly even match with no clear winner.',
                'attribute_comparison': {},
                'combat_breakdown': '⚔️ Identical characters - no advantage on either side.'
            })
        
        logger.info(f"Predicting battle: {char1} vs {char2}")
        result = system.predict(char1, char2)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_trained': system.trained,
        'model_loaded': system.model is not None
    })


@app.route('/api/stats', methods=['GET'])
def stats():
    """Get model statistics."""
    if not system.model or not system.model.model:
        return jsonify({'error': 'Model not available'}), 503
    
    try:
        model = system.model.model
        total_params = model.count_params()
        trainable_params = sum(tf.size(w).numpy() for w in model.trainable_weights)
        
        return jsonify({
            'total_parameters': int(total_params),
            'trainable_parameters': int(trainable_params),
            'layers': len(model.layers),
            'input_shape': list(model.input_shape),
            'output_shape': list(model.output_shape)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)