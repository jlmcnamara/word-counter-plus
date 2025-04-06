// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Word Counter Plus extension installed");
  
  // Remove existing menu item if it exists (to prevent duplicates)
  chrome.contextMenus.removeAll(() => {
    // Create the context menu item
    chrome.contextMenus.create({
      id: "wordCounterPlus",
      title: "Word Counter Plus",
      contexts: ["selection"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error creating context menu:", chrome.runtime.lastError);
      } else {
        console.log("Context menu created successfully");
      }
    });
  });
});

// Handle context menu item click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked:", info.menuItemId);
  
  if (info.menuItemId === "wordCounterPlus" && info.selectionText) {
    console.log("Processing selected text (context menu):", info.selectionText.substring(0, 50) + "...");
    processSelection(info.selectionText, tab.id);
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked on tab:", tab.id);
  // Inject a script to get the current selection
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  }).then(injectionResults => {
    if (chrome.runtime.lastError) {
        console.error("Error injecting script to get selection:", chrome.runtime.lastError.message);
        return;
    }
    // executeScript returns an array of results, one for each frame injected into.
    // We are only interested in the result from the main frame (index 0).
    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
      const selectedText = injectionResults[0].result;
      if (selectedText) {
          console.log("Processing selected text (action click):", selectedText.substring(0, 50) + "...");
          processSelection(selectedText, tab.id);
      } else {
          console.log("Action click: No text selected on the page.");
          // Optional: Provide feedback to the user, e.g., a notification or changing the icon briefly
      }
    } else {
         console.log("Action click: Could not retrieve selection.");
    }
  }).catch(err => {
       console.error("Failed to execute script for selection:", err);
  });
});

// Common function to process selection and show popup
function processSelection(selectedText, tabId) {
    // Calculate stats in the background script
    const stats = calculateEnhancedStats(selectedText);
    console.log("Calculated stats:", stats);
    
    // Execute the showStatsPopup function directly in the current tab
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: showEnhancedStatsPopup,
      args: [stats]
    }).then(() => {
      console.log("Stats popup displayed successfully");
    }).catch(error => {
      console.error("Error displaying stats popup:", error);
      
      // Fallback: Show a simple alert if popup fails
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (stats) => {
          alert(`Word Counter Plus Stats:\n\nWords: ${stats.wordCount}\nCharacters: ${stats.charCount}\nReadability: ${stats.readabilityScore}`);
        },
        args: [stats]
      }).catch(alertError => {
        console.error("Even alert fallback failed:", alertError);
      });
    });
}

// --- Stop Words Set ---
const stopWords = new Set([
  // Articles
  'a', 'an', 'the', 
  // Conjunctions
  'and', 'but', 'or', 'so', 'for', 'nor', 'yet', 
  // Prepositions
  'in', 'on', 'at', 'to', 'from', 'with', 'by', 'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'inside', 'into', 'near', 'off', 'onto', 'out', 'outside', 'over', 'past', 'through', 'throughout', 'under', 'underneath', 'until', 'unto', 'up', 'upon', 'without',
  // Pronouns
  'i', 'me', 'my', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 
  // Auxiliary Verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 
  // Other common words
  'not', 'of', 'no', 'yes', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't' // Common contractions parts
]);

// Calculate enhanced text statistics
function calculateEnhancedStats(text) {
  // Basic stats
  const trimmedText = text.trim();
  const words = trimmedText.split(/\s+/);
  const wordCount = words.length;
  const charCount = trimmedText.length;
  const charNoSpacesCount = trimmedText.replace(/\s/g, "").length;
  
  // Word length stats
  let totalLength = 0;
  let longestWord = "";
  let wordLengths = [];
  
  words.forEach(word => {
    // Remove punctuation for word length calculation
    const cleanWord = word.replace(/[^\w\s]/g, "");
    const length = cleanWord.length;
    totalLength += length;
    wordLengths.push(length);
    
    if (length > longestWord.length) {
      longestWord = cleanWord;
    }
  });
  
  const avgWordLength = wordCount > 0 ? (totalLength / wordCount).toFixed(1) : 0;
  
  // Sentence stats
  const sentences = trimmedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : 0;
  
  // Paragraph stats
  const paragraphs = trimmedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length || 1; // At least 1 paragraph
  
  // Readability (Flesch-Kincaid approximation)
  // Formula: 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  // We'll estimate syllables as word length / 3
  const estimatedSyllables = totalLength / 3;
  let readabilityScore = 0;
  
  if (sentenceCount > 0 && wordCount > 0) {
    readabilityScore = Math.round(206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (estimatedSyllables / wordCount));
    // Clamp readability score between 0 and 100
    readabilityScore = Math.max(0, Math.min(100, readabilityScore));
  }
  
  // Reading time calculation (average reading speed: 200-250 words per minute)
  const wpm = 225;
  const readingTimeMinutes = wordCount / wpm;
  const readingTimeSeconds = Math.round(readingTimeMinutes * 60);
  let readingTime = "";
  
  if (readingTimeSeconds < 60) {
    readingTime = `${readingTimeSeconds} second${readingTimeSeconds !== 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(readingTimeMinutes);
    const seconds = Math.round((readingTimeMinutes - minutes) * 60);
    readingTime = `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  // Word frequency (unfiltered & filtered)
  const wordFrequency = {};
  const meaningfulWordFrequency = {};
  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, ""); // Keep only word characters
    if (cleanWord.length > 0) {
      // Unfiltered count
      wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
      
      // Filtered count (exclude stop words)
      if (!stopWords.has(cleanWord)) {
        meaningfulWordFrequency[cleanWord] = (meaningfulWordFrequency[cleanWord] || 0) + 1;
      }
    }
  });
  
  // Filter out words that appear only once *before* sorting and slicing
  const filterSingleOccurrences = (freqObject) => {
      return Object.entries(freqObject)
          .filter(([word, count]) => count > 1);
  }

  // Top 10 unfiltered words (occurring more than once)
  const topWords = filterSingleOccurrences(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
    
  // Top 10 meaningful (filtered) words (occurring more than once)
  const topMeaningfulWords = filterSingleOccurrences(meaningfulWordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
  
  // Character frequency (vowels vs consonants)
  const charFrequency = {
    vowels: 0,
    consonants: 0,
    numbers: 0,
    symbols: 0
  };
  
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const alphaRegex = /[a-z]/i;
  const numRegex = /[0-9]/;
  
  for (let i = 0; i < charNoSpacesCount; i++) {
    const char = trimmedText[i].toLowerCase();
    if (vowels.includes(char)) {
      charFrequency.vowels++;
    } else if (alphaRegex.test(char)) {
      charFrequency.consonants++;
    } else if (numRegex.test(char)) {
      charFrequency.numbers++;
    } else {
      charFrequency.symbols++;
    }
  }
  
  // Reading level assessment
  let readingLevel = '';
  if (readabilityScore >= 90) readingLevel = 'Very Easy';
  else if (readabilityScore >= 80) readingLevel = 'Easy';
  else if (readabilityScore >= 70) readingLevel = 'Fairly Easy';
  else if (readabilityScore >= 60) readingLevel = 'Standard';
  else if (readabilityScore >= 50) readingLevel = 'Fairly Difficult';
  else if (readabilityScore >= 30) readingLevel = 'Difficult';
  else readingLevel = 'Very Difficult';
  
  return {
    wordCount,
    charCount,
    charNoSpacesCount,
    avgWordLength,
    longestWord,
    longestWordLength: longestWord.length,
    sentenceCount,
    avgWordsPerSentence,
    paragraphCount,
    readabilityScore,
    readingLevel,
    readingTime,
    topWords, // Unfiltered
    topMeaningfulWords, // Filtered
    charFrequency,
    wordLengths
  };
}

// Function to display enhanced statistics in a popup (injected into the page)
function showEnhancedStatsPopup(stats) {
  // Remove any existing popup
  const existingPopup = document.getElementById("word-counter-plus-popup");
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup element
  const popup = document.createElement("div");
  popup.id = "word-counter-plus-popup";
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    width: 360px;
    border-radius: 12px;
    overflow: hidden;
    font-family: 'Segoe UI', 'Roboto', 'Arial', sans-serif;
    font-size: 14px;
    color: #333;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
    animation: slideIn 0.4s cubic-bezier(0.19, 1, 0.22, 1);
  `;
  
  // Get readability color based on score
  const getReadabilityColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green for easy
    if (score >= 60) return '#2196F3'; // Blue for standard
    if (score >= 40) return '#FF9800'; // Orange for moderate
    return '#F44336'; // Red for difficult
  };
  
  // Create word distribution chart data
  const wordLengthDistribution = {};
  stats.wordLengths.forEach(length => {
    wordLengthDistribution[length] = (wordLengthDistribution[length] || 0) + 1;
  });
  
  // Create HTML for the mini distribution chart
  const maxFreq = Math.max(...Object.values(wordLengthDistribution));
  let distributionHTML = '';
  for (let i = 1; i <= Math.max(10, ...Object.keys(wordLengthDistribution).map(k => parseInt(k))); i++) {
    const count = wordLengthDistribution[i] || 0;
    const height = count ? Math.max(15, (count / maxFreq) * 60) : 5;
    distributionHTML += `<div class="chart-bar" style="height: ${height}px;" title="${count} word${count !== 1 ? 's' : ''} with ${i} character${i !== 1 ? 's' : ''}"></div>`;
  }
  
  // Helper function to create HTML for a word frequency list
  const createWordListHTML = (wordList, totalWordCount, title) => {
    let html = `<div class="frequency-list-container">
                  <div class="stat-label list-title">${title}</div>`;
    if (!wordList || wordList.length === 0) {
      html += '<div style="color: #888; font-style: italic; margin-top: 5px;">No words to display.</div>';
    } else {
      const maxCount = wordList[0].count; // Get the max count for scaling bars within this list
      wordList.forEach(({ word, count }) => {
        const percentage = totalWordCount > 0 ? ((count / totalWordCount) * 100).toFixed(1) : 0;
        // Scale bar width relative to the top word *in this list*
        const barWidthPercentage = maxCount > 0 ? ((count / maxCount) * 100) : 0;
        html += `
          <div class="top-word">
            <span class="word">${word}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${barWidthPercentage}%;"></div>
              <span class="count">${count} (${percentage}%)</span>
            </div>
          </div>
        `;
      });
    }
    html += `</div>`;
    return html;
  };

  // Create HTML for top meaningful words
  const topMeaningfulWordsHTML = createWordListHTML(stats.topMeaningfulWords, stats.wordCount, "Top Meaningful Words (Filtered)");

  // Create HTML for top words overall
  const topWordsHTML = createWordListHTML(stats.topWords, stats.wordCount, "Top Words (Overall)");

  // Create content for popup
  popup.innerHTML = `
    <style>
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .tab-content {
        display: none;
        padding: 20px;
        background: #fff;
      }
      .tab-content.active {
        display: block;
      }
      .tabs {
        display: flex;
        background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
      }
      .tab {
        padding: 15px 0;
        flex: 1;
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
        font-weight: 500;
      }
      .tab:hover {
        color: rgba(255, 255, 255, 0.9);
      }
      .tab.active {
        color: white;
      }
      .tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 25%;
        width: 50%;
        height: 3px;
        background: white;
        border-radius: 3px 3px 0 0;
      }
      .stat-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        align-items: center;
      }
      .stat-label {
        color: #666;
      }
      .stat-value {
        font-weight: 600;
        color: #333;
      }
      .divider {
        height: 1px;
        background: #eee;
        margin: 15px 0;
      }
      .readability-meter {
        height: 8px;
        width: 100%;
        background: #eee;
        border-radius: 4px;
        margin-top: 5px;
        overflow: hidden;
      }
      .readability-fill {
        height: 100%;
        width: ${stats.readabilityScore}%;
        background: ${getReadabilityColor(stats.readabilityScore)};
        border-radius: 4px;
      }
      .char-dist {
        display: flex;
        height: 60px;
        align-items: flex-end;
        margin-top: 15px;
        border-bottom: 1px solid #eee;
      }
      .chart-bar {
        flex: 1;
        background: #2196F3;
        margin: 0 1px;
        border-radius: 2px 2px 0 0;
        min-height: 4px;
      }
      .char-labels {
        display: flex;
        margin-top: 5px;
      }
      .char-label {
        flex: 1;
        text-align: center;
        font-size: 9px;
        color: #999;
      }
      .close-btn {
        position: absolute;
        top: 14px;
        right: 15px;
        color: white;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      .close-btn:hover {
        opacity: 1;
      }
      .pie-chart {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: conic-gradient(
          #4CAF50 0% ${(stats.charFrequency.vowels / stats.charNoSpacesCount) * 100}%, 
          #2196F3 ${(stats.charFrequency.vowels / stats.charNoSpacesCount) * 100}% ${((stats.charFrequency.vowels + stats.charFrequency.consonants) / stats.charNoSpacesCount) * 100}%,
          #FF9800 ${((stats.charFrequency.vowels + stats.charFrequency.consonants) / stats.charNoSpacesCount) * 100}% ${((stats.charFrequency.vowels + stats.charFrequency.consonants + stats.charFrequency.numbers) / stats.charNoSpacesCount) * 100}%,
          #F44336 ${((stats.charFrequency.vowels + stats.charFrequency.consonants + stats.charFrequency.numbers) / stats.charNoSpacesCount) * 100}% 100%
        );
      }
      .pie-legend {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-left: 15px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        font-size: 12px;
      }
      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        margin-right: 5px;
      }
      .char-dist-container {
        margin-top: 15px;
      }
      .top-word {
        margin-bottom: 8px;
      }
      .word {
        font-weight: 500;
        display: block;
        margin-bottom: 3px;
      }
      .bar-container {
        height: 20px;
        background: #f0f0f0;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
      }
      .bar {
        height: 100%;
        background: #2196F3;
      }
      .count {
        position: absolute;
        right: 8px;
        top: 2px;
        font-size: 11px;
        color: #333;
      }
      .frequency-list-container {
        margin-bottom: 20px; /* Add space between the two lists */
        max-height: 250px; /* Limit height */
        overflow-y: auto; /* Add scrollbar if needed */
        padding-right: 10px; /* Space for scrollbar */
      }
      .list-title {
        font-weight: 600;
        margin-bottom: 10px;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
        color: #444;
      }
      .top-word {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
        font-size: 13px;
      }
      .top-word .word {
        flex: 0 0 100px; /* Fixed width for word */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #555;
      }
      .top-word .bar-container {
        flex: 1;
        display: flex;
        align-items: center;
        margin-left: 10px;
        background-color: #f0f0f0;
        height: 16px;
        border-radius: 3px;
        position: relative;
      }
      .top-word .bar {
        height: 100%;
        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
        border-radius: 3px;
        transition: width 0.3s ease-out;
      }
      .top-word .count {
        font-size: 11px;
        color: #666;
        position: absolute; /* Position count inside or outside the bar */
        right: 5px;
        line-height: 16px; /* Align vertically */
        /* Optionally hide if bar is too short? */
      }
    </style>
    <div class="tabs">
      <div class="tab active" data-tab="basic">Basic</div>
      <div class="tab" data-tab="readability">Readability</div>
      <div class="tab" data-tab="frequency">Frequency</div>
      <button class="close-btn">×</button>
    </div>
    
    <!-- Basic Stats Tab -->
    <div class="tab-content active" id="basic-tab">
      <div class="stat-row">
        <span class="stat-label">Words</span>
        <span class="stat-value">${stats.wordCount.toLocaleString()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Characters (with spaces)</span>
        <span class="stat-value">${stats.charCount.toLocaleString()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Characters (no spaces)</span>
        <span class="stat-value">${stats.charNoSpacesCount.toLocaleString()}</span>
      </div>
      <div class="divider"></div>
      <div class="stat-row">
        <span class="stat-label">Sentences</span>
        <span class="stat-value">${stats.sentenceCount.toLocaleString()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Paragraphs</span>
        <span class="stat-value">${stats.paragraphCount.toLocaleString()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Reading Time</span>
        <span class="stat-value">${stats.readingTime}</span>
      </div>
    </div>
    
    <!-- Readability Tab -->
    <div class="tab-content" id="readability-tab">
      <div class="stat-row">
        <span class="stat-label">Readability Score</span>
        <span class="stat-value" style="color: ${getReadabilityColor(stats.readabilityScore)}">
          ${stats.readabilityScore}/100
        </span>
      </div>
      <div class="readability-meter">
        <div class="readability-fill"></div>
      </div>
      <div class="stat-row" style="margin-top: 15px;">
        <span class="stat-label">Reading Level</span>
        <span class="stat-value">${stats.readingLevel}</span>
      </div>
      <div class="divider"></div>
      <div class="stat-row">
        <span class="stat-label">Avg. Words per Sentence</span>
        <span class="stat-value">${stats.avgWordsPerSentence}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Avg. Word Length</span>
        <span class="stat-value">${stats.avgWordLength} characters</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Longest Word</span>
        <span class="stat-value">${stats.longestWord} (${stats.longestWordLength})</span>
      </div>
      <div class="char-dist-container">
        <div class="stat-label">Word Length Distribution</div>
        <div class="char-dist">
          ${distributionHTML}
        </div>
        <div class="char-labels">
          ${Array.from({length: Math.min(10, Math.max(...Object.keys(wordLengthDistribution).map(k => parseInt(k))))}, (_, i) => 
            `<div class="char-label">${i+1}</div>`
          ).join('')}
        </div>
      </div>
    </div>
    
    <!-- Frequency Tab -->
    <div class="tab-content" id="frequency-tab">
      <div class="stat-row" style="align-items: flex-start;">
        <div>
          <div class="stat-label" style="margin-bottom: 10px;">Character Types</div>
          <div style="display: flex;">
            <div class="pie-chart"></div>
            <div class="pie-legend">
              <div class="legend-item">
                <div class="legend-color" style="background: #4CAF50;"></div>
                <span>Vowels (${stats.charFrequency.vowels})</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #2196F3;"></div>
                <span>Consonants (${stats.charFrequency.consonants})</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #FF9800;"></div>
                <span>Numbers (${stats.charFrequency.numbers})</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #F44336;"></div>
                <span>Symbols (${stats.charFrequency.symbols})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <!-- Meaningful Words List -->
      ${topMeaningfulWordsHTML}
      <!-- Overall Words List -->
      ${topWordsHTML}
    </div>
  `;
  
  // Add popup to the page
  document.body.appendChild(popup);
  
  // Add tab switching functionality
  const tabs = popup.querySelectorAll('.tab');
  const tabContents = popup.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // Activate clicked tab
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
  });
  
  // Add close functionality
  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
  });
  
  // Auto-close after 30 seconds (extended time for more detailed analysis)
  setTimeout(() => {
    if (document.getElementById("word-counter-plus-popup")) {
      document.getElementById("word-counter-plus-popup").remove();
    }
  }, 30000);
}