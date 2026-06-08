import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
import pickle
import json
import re
import hashlib
import logging
from typing import Dict, Tuple, List
import warnings
warnings.filterwarnings('ignore')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CharacterFeatureExtractor:
    """Extracts semantic features from character names using NLP techniques."""
    
    # Keyword mappings for ability inference
    ELEMENTAL_KEYWORDS = {
        'fire': ['fire', 'flame', 'burn', 'inferno', 'blaze', 'pyro', 'magma', 'lava'],
        'ice': ['ice', 'frost', 'frozen', 'glacier', 'winter', 'snow', 'crystal'],
        'lightning': ['lightning', 'thunder', 'storm', 'bolt', 'spark', 'zap', 'volt', 'electro'],
        'darkness': ['dark', 'shadow', 'night', 'void', 'abyss', 'shade', 'gloom', 'eclipse'],
        'light': ['light', 'radiant', 'glow', 'shine', 'beam', 'holy', 'divine'],
        'nature': ['nature', 'earth', 'rock', 'stone', 'forest', 'wood', 'leaf', 'vine'],
        'water': ['water', 'aqua', 'ocean', 'sea', 'wave', 'tide', 'fluid', 'marine'],
        'wind': ['wind', 'air', 'sky', 'storm', 'cyclone', 'tornado', 'breeze'],
        'metal': ['metal', 'steel', 'iron', 'gold', 'silver', 'bronze', 'titanium'],
        'poison': ['poison', 'toxic', 'venom', 'acid', 'plague', 'virus'],
        'psychic': ['psychic', 'mind', 'brain', 'telepath', 'psionic', 'mental']
    }
    
    COMBAT_KEYWORDS = {
        'warrior': ['warrior', 'knight', 'fighter', 'soldier', 'gladiator', 'champion', 'slayer'],
        'assassin': ['assassin', 'ninja', 'rogue', 'thief', 'spy', 'hunter', 'stalker'],
        'mage': ['mage', 'wizard', 'sorcerer', 'warlock', 'witch', 'druid', 'necromancer'],
        'tank': ['titan', 'giant', 'colossus', 'juggernaut', 'fortress', 'guardian', 'protector'],
        'speedster': ['flash', 'speed', 'quick', 'swift', 'rapid', 'blur', 'dash'],
        'berserker': ['berserker', 'rage', 'fury', 'savage', 'wild', 'feral', 'brute']
    }
    
    MYTHOLOGICAL_KEYWORDS = ['god', 'goddess', 'deity', 'immortal', 'divine', 'celestial', 
                             'dragon', 'phoenix', 'titan', 'demon', 'angel', 'spirit']
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(2, 5),
            max_features=1000,
            sublinear_tf=True
        )
        self.scaler = StandardScaler()
        self.fitted = False
        
    def extract_phonetic_features(self, name: str) -> np.ndarray:
        """Extract phonetic features from character name."""
        name_lower = name.lower()
        features = []
        
        hard_consonants = len(re.findall(r'[kgtdbp]', name_lower))
        soft_consonants = len(re.findall(r'[slmnrfw]', name_lower))
        vowels = len(re.findall(r'[aeiou]', name_lower))
        
        features.extend([
            hard_consonants / max(len(name), 1),
            soft_consonants / max(len(name), 1),
            vowels / max(len(name), 1),
            len(name),
            len(name.split()),
            len(set(name_lower)) / max(len(name_lower), 1),  # Character diversity
        ])
        
        return np.array(features, dtype=np.float32)
    
    def extract_lexical_features(self, name: str) -> np.ndarray:
        """Extract lexical complexity features."""
        name_lower = name.lower()
        features = []
        
        words = name_lower.split()
        avg_word_len = np.mean([len(w) for w in words]) if words else len(name)
        has_numbers = 1 if re.search(r'\d', name) else 0
        has_special = 1 if re.search(r'[^a-zA-Z0-9\s]', name) else 0
        syllable_estimate = len(re.findall(r'[aeiou]+', name_lower))
        
        features.extend([
            avg_word_len,
            has_numbers,
            has_special,
            syllable_estimate / max(len(name), 1),
            len(re.findall(r'[A-Z]', name)) / max(len(name), 1),  # Capitalization ratio
        ])
        
        return np.array(features, dtype=np.float32)
    
    def extract_ability_features(self, name: str) -> np.ndarray:
        """Infer abilities from name components."""
        name_lower = name.lower()
        features = []
        
        for category, keywords in self.ELEMENTAL_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in name_lower:
                    score += 1
                if keyword in name_lower.split():
                    score += 2
            features.append(min(score, 5.0))
        
        for category, keywords in self.COMBAT_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in name_lower:
                    score += 1
            features.append(min(score, 3.0))
        
        myth_score = sum(1 for kw in self.MYTHOLOGICAL_KEYWORDS if kw in name_lower)
        features.append(min(myth_score, 3.0))
        
        has_title = 1 if any(title in name_lower for title in ['king', 'queen', 'lord', 'lady', 'emperor', 'master', 'commander']) else 0
        features.append(has_title)
        
        return np.array(features, dtype=np.float32)
    
    def extract_all_features(self, name: str) -> np.ndarray:
        """Extract comprehensive feature set for a character."""
        phonetic = self.extract_phonetic_features(name)
        lexical = self.extract_lexical_features(name)
        ability = self.extract_ability_features(name)
        
        return np.concatenate([phonetic, lexical, ability])
    
    def fit_vectorizer(self, names: List[str]):
        """Fit the TF-IDF vectorizer on character names."""
        self.vectorizer.fit(names)
        self.fitted = True
    
    def transform(self, name: str) -> np.ndarray:
        """Transform a single character name to feature vector."""
        phonetic_lexical_ability = self.extract_all_features(name)
        
        if self.fitted:
            tfidf = self.vectorizer.transform([name]).toarray()[0]
        else:
            tfidf = np.zeros(1000)
        
        return np.concatenate([tfidf, phonetic_lexical_ability])


class BattleNeuralNetwork:
    """Neural network for predicting battle outcomes."""
    
    def __init__(self, input_dim: int):
        self.input_dim = input_dim
        self.model = self._build_model()
        
    def _build_model(self) -> keras.Model:
        """Build neural network with attention mechanism."""
        input_layer = layers.Input(shape=(self.input_dim,), name='combined_features')
        
        x = layers.Dense(512, activation='relu', kernel_regularizer=keras.regularizers.l2(0.001))(input_layer)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
        
        x = layers.Dense(256, activation='relu', kernel_regularizer=keras.regularizers.l2(0.001))(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
        
        attention = layers.Dense(128, activation='tanh')(x)
        attention = layers.Dense(1, activation='sigmoid')(attention)
        x = layers.Multiply()([x, attention])
        
        x = layers.Dense(128, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.25)(x)
        
        x = layers.Dense(64, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.2)(x)
        
        x = layers.Dense(32, activation='relu')(x)
        
        outputs = layers.Dense(1, activation='sigmoid', name='winner_probability')(x)
        
        model = keras.Model(inputs=input_layer, outputs=outputs)
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC()]
        )
        
        return model
    
    def train(self, features: np.ndarray, labels: np.ndarray, 
              validation_split: float = 0.2, epochs: int = 50):
        """Train the neural network."""
        logger.info(f"Training model with {features.shape[0]} samples...")
        
        history = self.model.fit(
            features, labels,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=64,
            callbacks=[
                keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
                keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=3)
            ],
            verbose=0
        )
        
        val_acc = history.history['val_accuracy'][-1]
        logger.info(f"Training complete. Validation accuracy: {val_acc:.4f}")
        return history
    
    def predict(self, features: np.ndarray) -> float:
        """Make single prediction."""
        return float(self.model.predict(features, verbose=0)[0][0])
    
    def predict_batch(self, features: np.ndarray) -> np.ndarray:
        """Make batch predictions."""
        return self.model.predict(features, verbose=0).flatten()
    
    def save(self, filepath: str):
        """Save model to disk."""
        self.model.save(filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load model from disk."""
        self.model = keras.models.load_model(filepath)
        logger.info(f"Model loaded from {filepath}")


class BattleOutcomeCalculator:
    """Calculates ground truth battle outcomes for training data generation."""
    
    def calculate_combat_score(self, features: np.ndarray, feature_extractor) -> float:
        """Calculate combat score based on extracted features."""
        feature_dim = len(feature_extractor.extract_all_features("test"))
        feature_start = features.shape[0] - feature_dim
        
        extracted = features[feature_start:]
        
        phonetic = extracted[:6]
        lexical = extracted[6:11]
        ability = extracted[11:]
        
        strength_score = (phonetic[0] * 3 + phonetic[3] * 0.5 + np.sum(ability[6:12]) * 0.8)
        speed_score = (phonetic[1] * 2 + lexical[4] * 1.5 + ability[14] * 1.2)
        intelligence_score = (lexical[0] * 2 + lexical[3] * 1.5 + ability[5] * 1.5 + ability[16] * 1.3)
        power_score = (np.sum(ability[:11]) * 1.5 + ability[17] * 2 + ability[18] * 3)
        durability_score = (phonetic[0] * 2 + lexical[2] * 1 + np.sum(ability[11:17]) * 1)
        
        total_score = (strength_score * 0.25 + speed_score * 0.15 + 
                      intelligence_score * 0.2 + power_score * 0.25 + 
                      durability_score * 0.15)
        
        return total_score / 10.0
    
    def generate_training_data(self, character_names: List[str], feature_extractor, 
                               num_samples: int = 50000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic battle data for training."""
        logger.info(f"Generating {num_samples} training samples...")
        
        X = []
        y = []
        
        for _ in range(num_samples):
            idx1, idx2 = np.random.choice(len(character_names), 2, replace=False)
            char1_name, char2_name = character_names[idx1], character_names[idx2]
            
            features1 = feature_extractor.transform(char1_name)
            features2 = feature_extractor.transform(char2_name)
            
            combined = np.concatenate([features1, features2])
            X.append(combined)
            
            score1 = self.calculate_combat_score(features1, feature_extractor)
            score2 = self.calculate_combat_score(features2, feature_extractor)
            
            char1_wins = 1.0 if score1 > score2 else 0.0
            y.append(char1_wins)
        
        return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


class BattlePredictorSystem:
    """Main system integrating all components."""
    
    def __init__(self):
        self.feature_extractor = CharacterFeatureExtractor()
        self.outcome_calculator = BattleOutcomeCalculator()
        self.model = None
        self.trained = False
        
    def train(self, character_names: List[str], epochs: int = 50):
        """Train the complete system."""
        self.feature_extractor.fit_vectorizer(character_names)
        
        X, y = self.outcome_calculator.generate_training_data(
            character_names, self.feature_extractor, num_samples=50000
        )
        
        input_dim = X.shape[1]
        self.model = BattleNeuralNetwork(input_dim)
        self.model.train(X, y, epochs=epochs)
        self.trained = True
        
        return self.model
    
    def predict(self, char1: str, char2: str) -> Dict:
        """Predict battle outcome between two characters."""
        if not self.trained:
            raise ValueError("System not trained. Call train() first.")
        
        features1 = self.feature_extractor.transform(char1)
        features2 = self.feature_extractor.transform(char2)
        combined = np.concatenate([features1, features2]).reshape(1, -1)
        
        probability = self.model.predict(combined)
        confidence = abs(probability - 0.5) * 200
        
        winner = char1 if probability > 0.5 else char2
        loser = char2 if probability > 0.5 else char1
        
        analysis = self._generate_analysis(char1, char2, features1, features2, probability)
        attribute_comparison = self._generate_attribute_comparison(features1, features2)
        combat_breakdown = self._generate_combat_breakdown(char1, char2, features1, features2, winner)
        
        return {
            'winner': winner,
            'loser': loser,
            'probability': float(probability),
            'confidence': float(confidence),
            'analysis': analysis,
            'attribute_comparison': attribute_comparison,
            'combat_breakdown': combat_breakdown
        }
    
    def _generate_analysis(self, char1: str, char2: str, 
                          features1: np.ndarray, features2: np.ndarray, 
                          probability: float) -> str:
        """Generate detailed analysis text."""
        winner = char1 if probability > 0.5 else char2
        loser = char2 if probability > 0.5 else char1
        
        analysis_parts = []
        
        feature_dim = len(self.feature_extractor.extract_all_features("test"))
        f1 = features1[-feature_dim:]
        f2 = features2[-feature_dim:]
        
        phonetic1, phonetic2 = f1[:6], f2[:6]
        
        if phonetic1[0] > phonetic2[0]:
            analysis_parts.append(f"{char1} demonstrates superior physical strength indicators based on phonetic analysis of their name.")
        
        if phonetic2[1] > phonetic1[1]:
            analysis_parts.append(f"{char2} shows greater agility and speed potential from their name structure.")
        
        ability1, ability2 = f1[11:], f2[11:]
        
        elemental1 = np.sum(ability1[:11])
        elemental2 = np.sum(ability2[:11])
        
        if elemental1 > elemental2:
            analysis_parts.append(f"{char1} exhibits stronger elemental affinity based on semantic analysis.")
        elif elemental2 > elemental1:
            analysis_parts.append(f"{char2} possesses more potent elemental capabilities.")
        
        if ability1[18] > 0 or ability2[18] > 0:
            analysis_parts.append("Divine or mythological attributes detected, significantly impacting combat dynamics.")
        
        analysis_parts.append(f"Neural network analysis yields a {abs(probability - 0.5) * 200:.1f}% confidence in {winner}'s victory.")
        
        return "<br>".join(f"• {part}" for part in analysis_parts)
    
    def _generate_attribute_comparison(self, features1: np.ndarray, features2: np.ndarray) -> Dict:
        """Generate attribute comparison."""
        feature_dim = len(self.feature_extractor.extract_all_features("test"))
        f1 = features1[-feature_dim:]
        f2 = features2[-feature_dim:]
        
        return {
            'strength': {
                'char1': float(f1[0] * 85 + np.random.uniform(5, 15)),
                'char2': float(f2[0] * 85 + np.random.uniform(5, 15))
            },
            'speed': {
                'char1': float(f1[1] * 80 + np.random.uniform(5, 20)),
                'char2': float(f2[1] * 80 + np.random.uniform(5, 20))
            },
            'intelligence': {
                'char1': float(f1[11] * 70 + np.random.uniform(10, 30)),
                'char2': float(f2[11] * 70 + np.random.uniform(10, 30))
            },
            'power': {
                'char1': float(np.mean(f1[16:19]) * 90 + np.random.uniform(5, 15)),
                'char2': float(np.mean(f2[16:19]) * 90 + np.random.uniform(5, 15))
            },
            'durability': {
                'char1': float(f1[0] * 75 + np.random.uniform(10, 25)),
                'char2': float(f2[0] * 75 + np.random.uniform(10, 25))
            }
        }
    
    def _generate_combat_breakdown(self, char1: str, char2: str, 
                                   features1: np.ndarray, features2: np.ndarray,
                                   winner: str) -> str:
        """Generate combat breakdown."""
        breakdown_parts = []
        feature_dim = len(self.feature_extractor.extract_all_features("test"))
        f1 = features1[-feature_dim:]
        f2 = features2[-feature_dim:]
        
        phonetic1, phonetic2 = f1[:6], f2[:6]
        
        if phonetic1[0] > phonetic2[0]:
            breakdown_parts.append(f"{char1}'s superior strength allows them to dominate close-quarters combat.")
        else:
            breakdown_parts.append(f"{char2} maintains an advantage in physical confrontations.")
        
        if phonetic1[1] > phonetic2[1]:
            breakdown_parts.append(f"{char1}'s agility enables rapid attacks and evasion tactics.")
        
        ability1, ability2 = f1[11:], f2[11:]
        
        if np.sum(ability1[:11]) > np.sum(ability2[:11]):
            breakdown_parts.append(f"{char1}'s elemental abilities provide a decisive tactical advantage.")
        
        if ability1[17] > ability2[17]:
            breakdown_parts.append(f"{char1}'s mythological heritage grants extraordinary combat potential.")
        
        breakdown_parts.append(f"Overall: {winner} emerges victorious through superior combined attributes and tactical advantages.")
        
        return "<br>".join(f"⚔️ {part}" for part in breakdown_parts)
    
    def save(self, path: str):
        """Save complete system state."""
        self.model.save(f"{path}_model.h5")
        with open(f"{path}_vectorizer.pkl", 'wb') as f:
            pickle.dump(self.feature_extractor.vectorizer, f)
        with open(f"{path}_scaler.pkl", 'wb') as f:
            pickle.dump(self.feature_extractor.scaler, f)
        self.feature_extractor.fitted = True
        with open(f"{path}_config.json", 'w') as f:
            json.dump({'trained': self.trained}, f)
        logger.info(f"System saved to {path}")
    
    def load(self, path: str):
        """Load complete system state."""
        self.model = BattleNeuralNetwork(0)
        self.model.load(f"{path}_model.h5")
        with open(f"{path}_vectorizer.pkl", 'rb') as f:
            self.feature_extractor.vectorizer = pickle.load(f)
        with open(f"{path}_scaler.pkl", 'rb') as f:
            self.feature_extractor.scaler = pickle.load(f)
        self.feature_extractor.fitted = True
        with open(f"{path}_config.json", 'r') as f:
            config = json.load(f)
            self.trained = config['trained']
        logger.info(f"System loaded from {path}")


if __name__ == "__main__":
    demonstration_characters = [
        "Goku", "Vegeta", "Superman", "Batman", "Thor", "Loki", "Hulk", "Iron Man",
        "Wonder Woman", "Flash", "Aquaman", "Green Lantern", "Wolverine", "Cyclops",
        "Storm", "Magneto", "Doctor Strange", "Scarlet Witch", "Thanos", "Darkseid",
        "Naruto", "Sasuke", "Luffy", "Zoro", "Ichigo", "Aizen", "Gon", "Killua",
        "Fire Lord Ozai", "Shadow Fiend", "Dark Knight", "Ice Queen", "Thunder God",
        "Void Walker", "Holy Paladin", "Death Knight", "Demon Hunter", "Dragon Slayer",
        "Phoenix King", "Storm Breaker", "Iron Fist", "Steel Warrior", "Blade Master",
        "Venom Strike", "Shadow Assassin", "Light Mage", "Earth Shaker", "Wind Runner"
    ]
    
    system = BattlePredictorSystem()
    system.train(demonstration_characters, epochs=30)
    system.save("battle_model")
    
    test_battles = [
        ("Thor", "Superman"),
        ("Goku", "Superman"),
        ("Batman", "Iron Man"),
        ("Thanos", "Darkseid"),
        ("Fire Lord Ozai", "Ice Queen")
    ]
    
    print("\n" + "="*60)
    print("BATTLE PREDICTION DEMONSTRATIONS")
    print("="*60)
    
    for char1, char2 in test_battles:
        result = system.predict(char1, char2)
        print(f"\n{'─'*40}")
        print(f"⚔️  {char1} vs {char2}")
        print(f"🏆 Winner: {result['winner']}")
        print(f"📊 Confidence: {result['confidence']:.1f}%")
        print(f"📝 Analysis: {result['analysis'][:200]}...")