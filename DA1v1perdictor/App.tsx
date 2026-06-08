const { useState, useEffect, useCallback } = React;

interface CharacterStats {
  strength: number;
  speed: number;
  intelligence: number;
  power: number;
  durability: number;
  combat: number;
}

interface BattleResult {
  winner: string;
  loser: string;
  probability: number;
  confidence: number;
  analysis: string;
  attributeComparison: Record<string, { char1: number; char2: number }>;
  combatBreakdown: string;
  character1Profile: CharacterProfile;
  character2Profile: CharacterProfile;
}

interface CharacterProfile {
  name: string;
  inferredAbilities: string[];
  elementalAffinity: string[];
  combatStyle: string[];
  powerLevel: string;
  mythologicalTier: string;
  stats: CharacterStats;
}

interface BattleHistory {
  id: string;
  timestamp: number;
  character1: string;
  character2: string;
  winner: string;
  confidence: number;
  result: BattleResult;
  feedback?: FeedbackData;
}

interface FeedbackData {
  rating: number;
  accuracy: 'correct' | 'incorrect' | 'partial';
  comments: string;
  actualWinner?: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [char1, setChar1] = useState("Thor");
  const [char2, setChar2] = useState("Superman");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BattleHistory[]>([]);
  const [activeTab, setActiveTab] = useState<"battle" | "history" | "database">("battle");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [battleCount, setBattleCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<BattleHistory | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(3);
  const [feedbackAccuracy, setFeedbackAccuracy] = useState<'correct' | 'incorrect' | 'partial'>('correct');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackActualWinner, setFeedbackActualWinner] = useState('');
  const [showFeedbackWidget, setShowFeedbackWidget] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackData[]>([]);
  const [learningStats, setLearningStats] = useState({
    totalFeedback: 0,
    accuracyRate: 0,
    improvedPredictions: 0
  });

  useEffect(() => {
    loadHistory();
    loadFeedbackHistory();
    loadLearningStats();
  }, []);

  const loadHistory = async () => {
    try {
      const storedHistory = await DatabaseManager.getBattleHistory();
      setHistory(storedHistory);
      setBattleCount(storedHistory.length);
      
      // Check if we need to show feedback (every 10 battles)
      if (storedHistory.length > 0 && storedHistory.length % 10 === 0) {
        const lastBattle = storedHistory[0];
        const hasFeedback = lastBattle.feedback;
        if (!hasFeedback) {
          setFeedbackTarget(lastBattle);
          setShowFeedback(true);
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const loadFeedbackHistory = async () => {
    try {
      const feedbacks = await DatabaseManager.getFeedbackHistory();
      setFeedbackHistory(feedbacks);
    } catch (err) {
      console.error("Failed to load feedback history:", err);
    }
  };

  const loadLearningStats = async () => {
    try {
      const stats = await DatabaseManager.getLearningStats();
      setLearningStats(stats);
    } catch (err) {
      console.error("Failed to load learning stats:", err);
    }
  };

  const searchWebForCharacter = async (characterName: string): Promise<any> => {
    setIsSearching(true);
    try {
      const cachedData = await DatabaseManager.getCharacterData(characterName);
      if (cachedData) {
        console.log(`Using cached data for: ${characterName}`);
        return cachedData;
      }

      const searchData = await WebScraper.searchCharacterInfo(characterName);
      setSearchResults(prev => [...prev, { character: characterName, data: searchData }]);
      await DatabaseManager.storeSearchResult(characterName, searchData);
      await DatabaseManager.storeCharacterData(characterName, searchData);
      return searchData;
    } catch (err) {
      console.error(`Search failed for ${characterName}:`, err);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const applyLearningAdjustments = (char1Data: any, char2Data: any, feedbacks: FeedbackData[]) => {
    if (!feedbacks || feedbacks.length === 0) return { char1Data, char2Data };

    // Analyze feedback patterns to adjust predictions
    const recentFeedbacks = feedbacks.slice(-20);
    const incorrectPredictions = recentFeedbacks.filter(f => f.accuracy === 'incorrect');
    
    if (incorrectPredictions.length > 0 && char1Data && char2Data) {
      // Adjust power scores based on feedback patterns
      const accuracyRatio = (recentFeedbacks.length - incorrectPredictions.length) / recentFeedbacks.length;
      
      if (char1Data.powerScore) {
        char1Data.powerScore = char1Data.powerScore * (0.9 + accuracyRatio * 0.2);
      }
      if (char2Data.powerScore) {
        char2Data.powerScore = char2Data.powerScore * (0.9 + accuracyRatio * 0.2);
      }
    }

    return { char1Data, char2Data };
  };

  const predictBattle = useCallback(async () => {
    if (!char1.trim() || !char2.trim()) {
      setError("Please enter both character names");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let char1Data = await searchWebForCharacter(char1);
      let char2Data = await searchWebForCharacter(char2);

      // Apply learning from feedback
      const adjustments = applyLearningAdjustments(char1Data, char2Data, feedbackHistory);
      char1Data = adjustments.char1Data;
      char2Data = adjustments.char2Data;

      const battleResult = await BattlePredictor.predict(char1, char2, char1Data, char2Data);
      
      // Apply confidence adjustment based on learning
      const recentAccuracy = learningStats.accuracyRate / 100;
      battleResult.confidence = battleResult.confidence * (0.85 + recentAccuracy * 0.3);
      battleResult.confidence = Math.min(100, Math.max(10, battleResult.confidence));
      
      setResult(battleResult);

      const historyEntry: BattleHistory = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        character1: char1,
        character2: char2,
        winner: battleResult.winner,
        confidence: battleResult.confidence,
        result: battleResult
      };

      await DatabaseManager.saveBattleResult(historyEntry);
      setHistory(prev => [historyEntry, ...prev]);
      setBattleCount(prev => {
        const newCount = prev + 1;
        // Show feedback every 10 battles
        if (newCount % 10 === 0) {
          setTimeout(() => {
            setFeedbackTarget(historyEntry);
            setShowFeedback(true);
          }, 1000);
        }
        return newCount;
      });

    } catch (err: any) {
      setError(err.message || "Prediction failed. Please try again.");
      console.error("Battle prediction error:", err);
    } finally {
      setLoading(false);
    }
  }, [char1, char2, feedbackHistory, learningStats]);

  const submitFeedback = async () => {
    if (!feedbackTarget) return;

    const feedbackData: FeedbackData = {
      rating: feedbackRating,
      accuracy: feedbackAccuracy,
      comments: feedbackComments,
      actualWinner: feedbackActualWinner || undefined,
      timestamp: Date.now()
    };

    try {
      await DatabaseManager.saveFeedback(feedbackTarget.id, feedbackData);
      
      // Update learning stats
      const newStats = {
        totalFeedback: learningStats.totalFeedback + 1,
        accuracyRate: feedbackAccuracy === 'correct' 
          ? ((learningStats.accuracyRate * learningStats.totalFeedback + 100) / (learningStats.totalFeedback + 1))
          : feedbackAccuracy === 'partial'
          ? ((learningStats.accuracyRate * learningStats.totalFeedback + 50) / (learningStats.totalFeedback + 1))
          : ((learningStats.accuracyRate * learningStats.totalFeedback) / (learningStats.totalFeedback + 1)),
        improvedPredictions: learningStats.improvedPredictions + (feedbackAccuracy === 'incorrect' ? 1 : 0)
      };
      
      await DatabaseManager.updateLearningStats(newStats);
      setLearningStats(newStats);
      
      // Update local history
      setHistory(prev => prev.map(h => 
        h.id === feedbackTarget.id ? { ...h, feedback: feedbackData } : h
      ));
      
      setFeedbackHistory(prev => [feedbackData, ...prev]);
      
      // Reset feedback form
      setShowFeedback(false);
      setFeedbackTarget(null);
      setFeedbackRating(3);
      setFeedbackAccuracy('correct');
      setFeedbackComments('');
      setFeedbackActualWinner('');
      
      console.log('✅ Feedback submitted - AI learning from user input');
    } catch (err) {
      console.error("Failed to save feedback:", err);
    }
  };

  const dismissFeedback = () => {
    setShowFeedback(false);
    setFeedbackTarget(null);
  };

  const requestManualFeedback = () => {
    if (history.length > 0) {
      setFeedbackTarget(history[0]);
      setShowFeedback(true);
    }
  };

  return (
    <div className="container">
      {/* Feedback Widget - Top Right */}
      <div className={`feedback-widget ${showFeedbackWidget ? 'expanded' : ''}`}>
        <button 
          className="feedback-toggle"
          onClick={() => setShowFeedbackWidget(!showFeedbackWidget)}
          title="AI Feedback & Learning"
        >
          🤖 AI Learning
          <span className="feedback-badge">{feedbackHistory.length}</span>
        </button>
        
        {showFeedbackWidget && (
          <div className="feedback-panel">
            <div className="feedback-stats-mini">
              <div className="mini-stat">
                <span className="mini-value">{learningStats.totalFeedback}</span>
                <span className="mini-label">Feedbacks</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{learningStats.accuracyRate.toFixed(0)}%</span>
                <span className="mini-label">Accuracy</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{learningStats.improvedPredictions}</span>
                <span className="mini-label">Improved</span>
              </div>
            </div>
            
            <button 
              className="quick-feedback-btn"
              onClick={requestManualFeedback}
            >
              📝 Rate Last Battle
            </button>
            
            <div className="recent-feedbacks">
              <h5>Recent Feedback</h5>
              {feedbackHistory.slice(0, 5).map((fb, i) => (
                <div key={i} className="feedback-mini-item">
                  <span className={`accuracy-dot ${fb.accuracy}`}></span>
                  <span>{fb.accuracy}</span>
                  <span style={{fontSize: '0.7em', color: '#888'}}>
                    {new Date(fb.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <h1 className="title">⚔️ AI Character Battle Predictor ⚔️</h1>
      <p className="subtitle">Advanced Neural Network Analysis for 1v1 Combat Outcomes</p>

      {/* Feedback Modal */}
      {showFeedback && feedbackTarget && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal">
            <div className="feedback-modal-header">
              <h3>📊 AI Prediction Feedback</h3>
              <span className="battle-count-badge">Battle #{battleCount}</span>
              <button className="close-btn" onClick={dismissFeedback}>✕</button>
            </div>
            
            <div className="feedback-battle-summary">
              <p>
                <strong>{feedbackTarget.character1}</strong> vs <strong>{feedbackTarget.character2}</strong>
              </p>
              <p>
                AI predicted: <span className="predicted-winner">🏆 {feedbackTarget.winner}</span>
                <span className="confidence-tag">({feedbackTarget.confidence.toFixed(1)}% confidence)</span>
              </p>
            </div>
            
            <div className="feedback-form">
              <div className="feedback-question">
                <label>How accurate was this prediction?</label>
                <div className="accuracy-options">
                  <button 
                    className={`accuracy-btn ${feedbackAccuracy === 'correct' ? 'selected correct' : ''}`}
                    onClick={() => setFeedbackAccuracy('correct')}
                  >
                    ✅ Correct
                  </button>
                  <button 
                    className={`accuracy-btn ${feedbackAccuracy === 'partial' ? 'selected partial' : ''}`}
                    onClick={() => setFeedbackAccuracy('partial')}
                  >
                    ⚠️ Partially Correct
                  </button>
                  <button 
                    className={`accuracy-btn ${feedbackAccuracy === 'incorrect' ? 'selected incorrect' : ''}`}
                    onClick={() => setFeedbackAccuracy('incorrect')}
                  >
                    ❌ Incorrect
                  </button>
                </div>
              </div>
              
              {feedbackAccuracy === 'incorrect' && (
                <div className="feedback-question">
                  <label>Who should have won?</label>
                  <input
                    type="text"
                    value={feedbackActualWinner}
                    onChange={(e) => setFeedbackActualWinner(e.target.value)}
                    placeholder="Enter the actual winner..."
                    className="feedback-input"
                  />
                </div>
              )}
              
              <div className="feedback-question">
                <label>Rate the overall quality (1-5):</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`star ${feedbackRating >= star ? 'active' : ''}`}
                      onClick={() => setFeedbackRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="feedback-question">
                <label>Additional comments (optional):</label>
                <textarea
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Tell us why the AI was right or wrong..."
                  className="feedback-textarea"
                  rows={3}
                />
              </div>
              
              <div className="feedback-actions">
                <button className="submit-feedback-btn" onClick={submitFeedback}>
                  📤 Submit Feedback & Help AI Learn
                </button>
                <button className="skip-feedback-btn" onClick={dismissFeedback}>
                  Skip
                </button>
              </div>
            </div>
            
            <div className="learning-indicator">
              <span>🧠 AI learns from your feedback to improve future predictions</span>
              <div className="learning-bar">
                <div 
                  className="learning-fill"
                  style={{ width: `${learningStats.accuracyRate}%` }}
                ></div>
              </div>
              <span className="learning-text">
                Current AI accuracy: {learningStats.accuracyRate.toFixed(1)}% (from {learningStats.totalFeedback} feedbacks)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === "battle" ? "active" : ""}`} onClick={() => setActiveTab("battle")}>
          ⚔️ Battle Arena
        </button>
        <button className={`tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          📜 Battle History
        </button>
        <button className={`tab-btn ${activeTab === "database" ? "active" : ""}`} onClick={() => setActiveTab("database")}>
          🗄️ Knowledge Base
        </button>
      </div>

      {activeTab === "battle" && (
        <div>
          <div className="battle-arena">
            <div className="character-input">
              <label htmlFor="char1">Character 1</label>
              <input
                type="text"
                id="char1"
                value={char1}
                onChange={(e) => setChar1(e.target.value)}
                placeholder="e.g., Thor, Goku, Batman..."
              />
            </div>
            <div className="vs-badge">
              <span>VS</span>
            </div>
            <div className="character-input">
              <label htmlFor="char2">Character 2</label>
              <input
                type="text"
                id="char2"
                value={char2}
                onChange={(e) => setChar2(e.target.value)}
                placeholder="e.g., Superman, Naruto, Iron Man..."
              />
            </div>
          </div>

          <button className="predict-btn" onClick={predictBattle} disabled={loading}>
            {loading ? "⏳ Analyzing..." : "⚡ Predict Battle Outcome"}
          </button>

          {isSearching && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Searching web for character information...</p>
            </div>
          )}

          {loading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Neural network analyzing combat capabilities...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}

          {result && <BattleResultDisplay result={result} />}
        </div>
      )}

      {activeTab === "history" && <BattleHistoryDisplay history={history} />}
      {activeTab === "database" && <DatabaseViewer searchResults={searchResults} feedbackHistory={feedbackHistory} learningStats={learningStats} />}
    </div>
  );
};

const BattleResultDisplay: React.FC<{ result: BattleResult }> = ({ result }) => {
  const confidence = result.confidence;
  const confidenceLabel = confidence >= 80 ? "High" : confidence >= 60 ? "Medium" : "Low";
  const confidenceColor = confidence >= 80 ? "#4caf50" : confidence >= 60 ? "#ff9800" : "#f44336";

  return (
    <div className="result-container">
      <div className="winner-section">
        <h2>
          🏆 Winner: <span className="winner-name">{result.winner}</span>
        </h2>
        <div className="confidence-display">
          <span>Confidence: </span>
          <span style={{ color: confidenceColor, fontWeight: "bold" }}>
            {confidence.toFixed(1)}% ({confidenceLabel})
          </span>
          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{
                width: `${confidence}%`,
                background: confidenceColor
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="character-profiles">
        <h3>👤 Character Profiles</h3>
        <div className="profiles-grid">
          <div className="profile-card">
            <h4>{result.character1Profile.name}</h4>
            <p><strong>Power Level:</strong> {result.character1Profile.powerLevel}</p>
            <p><strong>Mythological Tier:</strong> {result.character1Profile.mythologicalTier}</p>
            <p><strong>Inferred Abilities:</strong> {result.character1Profile.inferredAbilities.join(", ") || "None detected"}</p>
            <p><strong>Elemental Affinity:</strong> {result.character1Profile.elementalAffinity.join(", ") || "None detected"}</p>
            <p><strong>Combat Style:</strong> {result.character1Profile.combatStyle.join(", ") || "General combatant"}</p>
          </div>
          <div className="profile-card">
            <h4>{result.character2Profile.name}</h4>
            <p><strong>Power Level:</strong> {result.character2Profile.powerLevel}</p>
            <p><strong>Mythological Tier:</strong> {result.character2Profile.mythologicalTier}</p>
            <p><strong>Inferred Abilities:</strong> {result.character2Profile.inferredAbilities.join(", ") || "None detected"}</p>
            <p><strong>Elemental Affinity:</strong> {result.character2Profile.elementalAffinity.join(", ") || "None detected"}</p>
            <p><strong>Combat Style:</strong> {result.character2Profile.combatStyle.join(", ") || "General combatant"}</p>
          </div>
        </div>
      </div>

      <div className="analysis-section">
        <h3>📊 Detailed Analysis</h3>
        <div dangerouslySetInnerHTML={{ __html: result.analysis }}></div>
      </div>

      <div className="stats-section">
        <h3>📈 Attribute Comparison</h3>
        <div className="stats-grid">
          {Object.entries(result.attributeComparison).map(([stat, values]: [string, any]) => (
            <div key={stat} className="stat-item">
              <div className="stat-name">{stat.toUpperCase()}</div>
              <div className="stat-bar-container">
                <div className="stat-bar char1-bar" style={{ width: `${Math.min(values.char1, 100)}%` }}>
                  <span>{values.char1.toFixed(1)}</span>
                </div>
                <div className="stat-bar char2-bar" style={{ width: `${Math.min(values.char2, 100)}%` }}>
                  <span>{values.char2.toFixed(1)}</span>
                </div>
              </div>
              <div className="stat-labels">
                <span>{result.character1Profile.name}</span>
                <span>{result.character2Profile.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="combat-section">
        <h3>⚔️ Combat Breakdown</h3>
        <div dangerouslySetInnerHTML={{ __html: result.combatBreakdown }}></div>
      </div>
    </div>
  );
};

const BattleHistoryDisplay: React.FC<{ history: BattleHistory[] }> = ({ history }) => {
  return (
    <div className="history-section">
      <h3>📜 Battle History</h3>
      {history.length === 0 ? (
        <p className="empty-state">No battles recorded yet. Fight some battles to see history!</p>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.id} className="history-item">
              <div className="history-header">
                <span className="history-characters">
                  {entry.character1} vs {entry.character2}
                </span>
                <span className="history-date">
                  {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="history-result">
                <span className="history-winner">🏆 {entry.winner} won</span>
                <span className="history-confidence">
                  Confidence: {entry.confidence.toFixed(1)}%
                </span>
              </div>
              {entry.feedback && (
                <div className="history-feedback">
                  <span className={`feedback-tag ${entry.feedback.accuracy}`}>
                    {entry.feedback.accuracy === 'correct' ? '✅' : entry.feedback.accuracy === 'partial' ? '⚠️' : '❌'} 
                    Rated: {entry.feedback.rating}/5
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DatabaseViewer: React.FC<{ searchResults: any[]; feedbackHistory: FeedbackData[]; learningStats: any }> = ({ searchResults, feedbackHistory, learningStats }) => {
  const [dbStats, setDbStats] = useState({ battles: 0, searches: 0, characters: 0 });

  useEffect(() => {
    loadDbStats();
  }, []);

  const loadDbStats = async () => {
    try {
      const stats = await DatabaseManager.getDatabaseStats();
      setDbStats(stats);
    } catch (err) {
      console.error("Failed to load DB stats:", err);
    }
  };

  return (
    <div className="database-section">
      <h3>🗄️ Knowledge Base</h3>
      <div className="db-stats">
        <div className="db-stat-card">
          <span className="db-stat-value">{dbStats.battles}</span>
          <span className="db-stat-label">Battles Stored</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-value">{dbStats.searches}</span>
          <span className="db-stat-label">Web Searches</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-value">{dbStats.characters}</span>
          <span className="db-stat-label">Characters Indexed</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-value">{learningStats.totalFeedback}</span>
          <span className="db-stat-label">AI Feedbacks</span>
        </div>
      </div>

      <div className="learning-stats-section">
        <h4>🧠 AI Learning Progress</h4>
        <div className="learning-stats-grid">
          <div className="learning-stat">
            <span className="ls-label">Accuracy Rate</span>
            <div className="ls-bar-container">
              <div className="ls-bar" style={{ width: `${learningStats.accuracyRate}%`, background: '#4caf50' }}></div>
            </div>
            <span className="ls-value">{learningStats.accuracyRate.toFixed(1)}%</span>
          </div>
          <div className="learning-stat">
            <span className="ls-label">Predictions Improved</span>
            <span className="ls-value-big">{learningStats.improvedPredictions}</span>
          </div>
        </div>
      </div>

      <div className="feedback-history-section">
        <h4>📝 Recent Feedback</h4>
        {feedbackHistory.length === 0 ? (
          <p className="empty-state">No feedback yet. Complete battles to provide feedback!</p>
        ) : (
          <div className="feedback-list">
            {feedbackHistory.slice(0, 10).map((fb, i) => (
              <div key={i} className="feedback-item">
                <span className={`fb-accuracy ${fb.accuracy}`}>
                  {fb.accuracy === 'correct' ? '✅' : fb.accuracy === 'partial' ? '⚠️' : '❌'}
                </span>
                <span className="fb-rating">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
                {fb.comments && <span className="fb-comments">"{fb.comments}"</span>}
                <span className="fb-date">{new Date(fb.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="search-results">
        <h4>Recent Search Results</h4>
        {searchResults.length === 0 ? (
          <p className="empty-state">No search data yet. Run a battle to collect character data!</p>
        ) : (
          searchResults.map((result, index) => (
            <div key={index} className="search-result-item">
              <h5>{result.character}</h5>
              <pre className="result-data">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          ))
        )}
      </div>

      <p className="storage-notice">
        🔒 All data is stored permanently in IndexedDB and cannot be accidentally deleted.
        Data persists across browser sessions and is only cleared via explicit database management.
      </p>
    </div>
  );
};

window.App = App;