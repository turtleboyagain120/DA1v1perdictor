async function predictBattle() {
  const char1 = document.getElementById('char1').value.trim();
  const char2 = document.getElementById('char2').value.trim();
  
  if (!char1 || !char2) {
    alert('Please enter both character names');
    return;
  }
  
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').style.display = 'none';
  document.getElementById('predictBtn').disabled = true;
  
  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character1: char1, character2: char2 })
    });
    
    const data = await response.json();
    displayResult(data);
  } catch (error) {
    alert('Error: Unable to connect to prediction server. Make sure the Flask backend is running.');
  } finally {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('predictBtn').disabled = false;
  }
}

function displayResult(data) {
  document.getElementById('result').style.display = 'block';
  document.getElementById('winnerName').textContent = data.winner;
  
  const confidence = data.confidence;
  document.getElementById('confidenceValue').textContent = 
    `${confidence.toFixed(1)}% (${confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low'})`;
  document.getElementById('confidenceFill').style.width = confidence + '%';
  
  document.getElementById('analysisText').innerHTML = data.analysis;
  
  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = '';
  
  const stats = data.attribute_comparison;
  for (const [stat, values] of Object.entries(stats)) {
    const statDiv = document.createElement('div');
    statDiv.className = 'stat-item';
    statDiv.innerHTML = `
      <div class="stat-name">${stat.toUpperCase()}</div>
      <div class="stat-values">
        <span class="stat-value ${values.char1 > values.char2 ? 'winner' : ''}">${values.char1.toFixed(1)}</span>
        <span style="color: #666;">vs</span>
        <span class="stat-value ${values.char2 > values.char1 ? 'winner' : ''}">${values.char2.toFixed(1)}</span>
      </div>
    `;
    statsGrid.appendChild(statDiv);
  }
  
  document.getElementById('combatBreakdown').innerHTML = data.combat_breakdown;
}