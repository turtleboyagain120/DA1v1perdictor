# AI Character Battle Predictor

An advanced neural network-based system for predicting 1v1 battle outcomes between characters from video games, movies, comics, and other media.

## Features

- **Neural Network Architecture**: Multi-layer neural network with attention mechanisms, batch normalization, and dropout for robust predictions
- **Semantic Name Analysis**: TF-IDF vectorization and NLP techniques to extract character traits from names
- **Dynamic Character Profiling**: Infers abilities, elemental affinities, and combat styles from name components
- **Detailed Analysis**: Provides comprehensive breakdown of why one character wins over another
- **Confidence Scoring**: Percentage-based confidence with High/Medium/Low categorization
- **RESTful API**: Flask-based API for external integration
- **Model Persistence**: Save and load trained models without retraining

## Installation

```bash
pip install -r requirements.txt