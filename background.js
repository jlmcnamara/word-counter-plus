// Initialize context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Word Counter Plus extension installed");
  setupContextMenu();
});

// Set up the context menu item
function setupContextMenu() {
  try {
    chrome.contextMenus.create({
      id: "wordCounterPlus",
      title: "Word Counter Plus",
      contexts: ["selection", "page"]
    });
    console.log("Context menu created successfully");
  } catch (error) {
    console.error("Error creating context menu:", error);
  }
}

// Listen for clicks on the context menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked", info, tab);
  if (info.menuItemId === "wordCounterPlus") {
    if (tab.url.startsWith("http")) {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: processTextOnPage,
          args: [info.selectionText || ""]
        });
      } catch (error) {
        console.error("Error executing script:", error);
        showErrorNotification();
      }
    } else {
      console.error("Cannot access non-HTTP URL:", tab.url);
      showErrorNotification();
    }
  }
});

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked", tab);
  if (tab.url.startsWith("http")) {
    try {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: processTextOnPage
      });
    } catch (error) {
      console.error("Error executing script:", error);
      showErrorNotification();
    }
  } else {
    console.error("Cannot access non-HTTP URL:", tab.url);
    showErrorNotification();
  }
});

// Show an error notification
function showErrorNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "Word Counter Plus",
    message: "This extension can only analyze content on regular web pages, not on browser URLs like chrome://."
  });
}

// This function will be injected into the page
function processTextOnPage(selectedText) {
  // Create a set of stop words for text analysis
  const stopWords = new Set([
    // Articles
    'a', 'an', 'the', 
    // Conjunctions
    'and', 'but', 'or', 'so', 'for', 'nor', 'yet', 
    // Prepositions
    'in', 'on', 'at', 'to', 'from', 'with', 'by', 'about', 'above', 'across', 'after', 'against', 'along',
    'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during',
    'inside', 'into', 'near', 'off', 'onto', 'out', 'outside', 'over', 'past', 'through', 'throughout',
    'under', 'underneath', 'until', 'unto', 'up', 'upon', 'without',
    // Pronouns
    'i', 'me', 'my', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her',
    'hers', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their',
    'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 
    // Auxiliary Verbs
    'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'having', 'do', 'does',
    'did', 'doing', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 
    // Other common words
    'not', 'of', 'no', 'yes', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't' // Common contractions parts
  ]);

  // Get the selected text or try to extract content if no selection
  let textToProcess = selectedText || window.getSelection().toString();
  
  if (!textToProcess || textToProcess.trim().length === 0) {
    console.log("No text selected, extracting main content");
    textToProcess = getMainContent();
    
    if (!textToProcess || textToProcess.trim().length === 0) {
      console.log("Could not extract main content");
      alert("Word Counter Plus: No text selected and couldn't extract content.");
      return;
    }
  }
  
  // Calculate enhanced statistics and display in fancy popup
  const stats = calculateEnhancedStats(textToProcess);
  showEnhancedStatsPopup(stats);
  
  // Helper function to extract syllables from a word
  function countSyllables(word) {
    word = word.toLowerCase();
    // Remove punctuation
    word = word.replace(/[^a-z]/g, '');
    
    if (word.length <= 3) return 1;
    
    // Count vowel clusters as syllables
    const vowelGroups = word.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 0;
    
    // Adjust for silent e at the end
    if (word.endsWith('e') && word.length > 3) count--;
    
    // Ensure at least one syllable
    return Math.max(1, count);
  }
  
  // Helper function to count complex words (3+ syllables)
  function countComplexWords(words) {
    return words.filter(word => {
      const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
      return normalized.length > 2 && countSyllables(normalized) >= 3;
    }).length;
  }
  
  // Calculate Flesch Reading Ease score
  function calculateFleschReadingEase(text, wordCount, sentenceCount) {
    const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
    const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);
    
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    // Flesch Reading Ease = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
    const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
    
    return Math.min(100, Math.max(0, Math.round(score)));
  }
  
  // Calculate Gunning Fog Index
  function calculateGunningFog(text, wordCount, sentenceCount) {
    const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
    const complexWordsCount = countComplexWords(words);
    
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    // Gunning Fox Index = 0.4 * ((words / sentences) + 100 * (complex words / words))
    const score = 0.4 * ((wordCount / sentenceCount) + 100 * (complexWordsCount / wordCount));
    
    return Math.round(score);
  }
  
  // Calculate SMOG Grade
  function calculateSMOG(text, sentenceCount) {
    const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
    const complexWordsCount = countComplexWords(words);
    
    if (sentenceCount < 30) {
      // SMOG is designed for 30+ sentences, for fewer we'll use an approximation
      const adjustedSentenceCount = Math.max(1, sentenceCount);
      const scaleFactor = Math.sqrt(30 / adjustedSentenceCount);
      const adjustedComplexCount = complexWordsCount * scaleFactor;
      return Math.round(1.0430 * Math.sqrt(adjustedComplexCount * (30 / adjustedSentenceCount)) + 3.1291);
    }
    
    // SMOG Grade = 1.0430 * sqrt(30 * (complex words / sentences)) + 3.1291
    const score = 1.0430 * Math.sqrt(complexWordsCount * (30 / sentenceCount)) + 3.1291;
    
    return Math.round(score);
  }
  
  // Extract main content from the page using improved algorithm
  function getMainContent() {
    // Multi-tier approach for content extraction
    const selectors = [
      // Highest priority: specific article containers
      'article', 'main', '.article-content', '.post-content', '.entry-content', '.content-article',
      
      // Medium priority: common content containers
      '#content', '.content', '.main-content', '.page-content', '.post',
      
      // CNBC specific selectors (from your memory)
      '.ArticleBody-articleBody', '.RenderKeyPoints-list', '.ArticleHeader-wrapper',
      
      // Lower priority: sections and divs that might contain content
      'section', 'div[role="main"]', '.body', '.story',
      
      // Last resort
      'body'
    ];
    
    // Try to find the best content container
    let bestElement = null;
    let maxContentScore = 0;
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(el => {
        // Skip invisible elements except body
        if (el.offsetParent === null && selector !== 'body') return;
        
        // Get text content
        const text = el.innerText || el.textContent || '';
        if (!text || text.trim().length < 50) return; // Skip very small content
        
        // Score calculation: length is important but also quality
        let score = text.trim().length;
        
        // Bonus for elements with significant text length
        if (text.length > 1000) score *= 1.5;
        
        // Bonus for higher priority selectors
        if (selector.includes('article') || selector.includes('content')) score *= 1.2;
        
        // Penalty for likely non-content elements
        if (el.querySelectorAll('nav, header, footer, aside').length > 0) score *= 0.7;
        if (el.querySelectorAll('iframe, .ad, .advertisement, .banner').length > 0) score *= 0.6;
        
        // Check if content is likely to be meaningful
        const paragraphs = el.querySelectorAll('p');
        if (paragraphs.length >= 3) score *= 1.3; // Bonus for multiple paragraphs
        
        if (score > maxContentScore) {
          maxContentScore = score;
          bestElement = el;
        }
      });
    });
    
    if (bestElement) {
      // Clone to avoid modifying original page
      const clone = bestElement.cloneNode(true);
      
      // Remove non-content elements
      ['script', 'style', 'nav', 'header', 'footer', 'aside', '.ad', '.advertisement', '.banner', '.share'].forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      return clone.innerText || clone.textContent || '';
    }
    return '';
  }
  
  // Calculate enhanced statistics for the given text
  function calculateEnhancedStats(text) {
    // Extract potential words using regex (letters and apostrophes)
    const potentialWords = text.match(/[a-zA-Z']+/g) || [];

    // Split potential CamelCase words (e.g., "wordOne" -> "word", "One")
    // but avoid splitting names like "McQueen"
    const words = potentialWords.flatMap(word => {
      if (word.length < 3) return [word]; // Don't try to split very short words

      const parts = word.split(/(?<=[a-z])(?=[A-Z])/g);

      if (parts.length > 1) {
        // Heuristic: Prevent splitting common name prefixes like Mc/Mac
        const firstPart = parts[0];
        if ((firstPart.toLowerCase() === 'mc' || firstPart.toLowerCase() === 'mac')) {
            // Check capitalization is correct (McX..., MacX...) to be safer
            const correctPrefixCaps = firstPart[0] >= 'A' && firstPart[0] <= 'Z' && 
                                      (firstPart.length === 1 || (firstPart.length > 1 && firstPart[1] >= 'a' && firstPart[1] <= 'z'));
            if (correctPrefixCaps) {
                 return [word]; // Don't split Mc/Mac names
            }
        }
        // Otherwise, accept the split (e.g., 'wordOne', 'eBay')
        return parts;
      } else {
        return [word]; // No split occurred
      }
    }).filter(word => word.length > 0); // Ensure no empty strings after split

    const wordCount = words.length;

    // Character counts (based on original text)
    const charCount = text.length;
    const charNoSpacesCount = text.replace(/\s+/g, '').length;

    // Calculate total syllables and complex words
    let totalSyllables = 0;
    let complexWordCount = 0;
    words.forEach(word => {
      const syllables = countSyllables(word);
      totalSyllables += syllables;
      if (syllables >= 3) {
        complexWordCount++;
      }
    });
    const avgSyllablesPerWord = wordCount > 0 ? (totalSyllables / wordCount).toFixed(2) : 0;
    const complexWordPercentage = wordCount > 0 ? (complexWordCount / wordCount * 100).toFixed(1) : 0;

    // Calculate average word length (based on extracted words)
    let totalWordLength = 0;
    words.forEach(word => { totalWordLength += word.length; });
    const avgWordLength = wordCount > 0 ? (totalWordLength / wordCount).toFixed(1) : 0;

    // Find longest word (from the extracted words)
    let longestWord = '';
    let longestWordLength = 0;
    for (const word of words) {
      // No need to clean here, 'words' only contains actual word characters
      if (word.length > longestWordLength) {
        longestWordLength = word.length;
        longestWord = word; // Assign the actual word
      }
    }

    // Sentences and paragraphs (based on original text)
    const sentences = text.split(/[.!?]+(?:\s+|$)/).filter(s => s.trim().length > 0); // Improved sentence split
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : 0;

    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    // Unique words and frequency
    const wordFrequency = {};
    words.forEach(word => { // Use the correctly extracted words
      const normalized = word.toLowerCase().replace(/[^a-z']/g, ''); // Keep apostrophes for normalization if needed
      if (normalized.length > 0) {
        wordFrequency[normalized] = (wordFrequency[normalized] || 0) + 1;
      }
    });

    const uniqueWordCount = Object.keys(wordFrequency).length;

    // Find most frequent words (excluding stop words)
    const topWords = Object.entries(wordFrequency)
      .filter(([word]) => !stopWords.has(word) && word.length > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, freq]) => ({ word, frequency: freq }));

    // Check for nonsensical words (using extracted words)
    const nonsensicalWords = words.filter(word => {
      const normalized = word.toLowerCase().replace(/[^a-z']/g, ''); // Keep apostrophes
      if (normalized.length <= 2) return false; // Allow short words like 'I'm'
      if (normalized.length > 25) return true; // Increased max length slightly
      if (!/[aeiouy]/i.test(normalized)) return true; // No vowels (English-centric)
      // Add more checks? e.g., too many consonants together?
      return false;
    });

    const nonsensicalCount = nonsensicalWords.length;
    // Ensure wordCount is not zero before division
    const nonsensicalPercentage = wordCount > 0 ? (nonsensicalCount / wordCount * 100).toFixed(1) : '0.0';

    // Reading time (average 200-250 words per minute)
    const readingTimeMinutes = (wordCount / 225).toFixed(1);

    // Calculate readability scores
    const fleschReadingEase = calculateFleschReadingEase(text, wordCount, sentenceCount);
    const gunningFogIndex = calculateGunningFog(text, wordCount, sentenceCount);
    const smogIndex = calculateSMOG(text, sentenceCount);

    // Calculate word length distribution
    const wordLengthCounts = {};
    let maxWordLength = 0;
    words.forEach(word => {
      const len = word.length;
      const count = (wordLengthCounts[len] || 0) + 1;
      wordLengthCounts[len] = count;
      if (len > maxWordLength) maxWordLength = len;
    });

    // Prepare data for histogram (fill gaps with 0)
    const wordLengthData = [];
    const wordLengthLabels = [];
    let maxWordLengthCount = 0; // Find max count for scaling
    for (let i = 1; i <= maxWordLength; i++) {
      wordLengthLabels.push(i.toString());
      const count = wordLengthCounts[i] || 0;
      wordLengthData.push(count);
      if (count > maxWordLengthCount) maxWordLengthCount = count;
    }

    return {
      wordCount,
      charCount,
      charNoSpacesCount,
      sentenceCount,
      paragraphCount,
      avgWordLength,
      avgWordsPerSentence,
      longestWord,
      longestWordLength,
      uniqueWordCount,
      topWords,
      nonsensicalCount,
      nonsensicalPercentage,
      readingTimeMinutes,
      fleschReadingEase,
      gunningFogIndex,
      smogIndex,
      // New stats for Structure tab
      complexWordCount,
      complexWordPercentage,
      avgSyllablesPerWord,
      wordLengthLabels,
      wordLengthData,
      maxWordLengthCount
    };
  }

  // Display the enhanced statistics in a tabbed popup
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
      width: 320px;
      background-color: #ffffff; /* White background */
      border: 1px solid #e0e0e0; /* Lighter border */
      border-radius: 6px; /* Slightly rounded corners */
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Softer shadow */
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      color: #333;
      max-height: calc(100vh - 40px);
      display: flex;
      flex-direction: column;
      overflow: hidden; /* Prevent content overflow issues */
      animation: wcpFadeIn 0.2s ease-out;
    `;

    // Create CSS styles for the popup
    const popupStyle = `
      @keyframes wcpFadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      #word-counter-plus-popup * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      #word-counter-plus-popup .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: #f8f8f8; /* Light header background */
          border-bottom: 1px solid #e0e0e0;
      }
      #word-counter-plus-popup .popup-title {
          font-size: 15px;
          font-weight: 600;
          color: #222;
      }
       #word-counter-plus-popup #word-counter-close {
         border: none; background: none; cursor: pointer; font-size: 22px; line-height: 1; color: #888; padding: 0 5px;
       }
       #word-counter-plus-popup #word-counter-close:hover {
         color: #333;
       }

      #word-counter-plus-popup .tabs {
        display: flex;
        border-bottom: 1px solid #e0e0e0; /* Light border */
        background-color: #f8f8f8; /* Tabs background */
      }

      #word-counter-plus-popup .tab {
        padding: 12px 10px; /* Reduced horizontal padding */
        cursor: pointer;
        color: #555; /* Default tab text color */
        text-align: center;
        flex-grow: 1; /* Make tabs distribute space */
        border-bottom: 3px solid transparent; /* Placeholder for active indicator */
        transition: background-color 0.2s, border-color 0.2s, color 0.2s;
        font-weight: 500;
      }

      #word-counter-plus-popup .tab:hover {
        background-color: #f0f0f0;
        color: #111;
      }

      #word-counter-plus-popup .tab.active {
        color: #007bff; /* Accent color for active tab */
        border-bottom-color: #007bff; /* Active indicator */
        background-color: #ffffff; /* White background for active tab content area */
      }

      #word-counter-plus-popup .tab-content {
        display: none; /* Hide tab content by default */
        padding: 15px 5px 5px 5px; /* Add some padding */
        border-top: 1px solid #ddd;
        margin-top: -1px; /* Overlap border with active tab bottom border */
      }

      #word-counter-plus-popup .tab-content.active {
        display: block; /* Show active tab content */
      }

      #word-counter-plus-popup table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }

      #word-counter-plus-popup td {
        padding: 6px 0; /* Adjusted padding */
        border-bottom: 1px solid #f0f0f0; /* Lighter row separator */
      }
      #word-counter-plus-popup tr:last-child td {
          border-bottom: none;
      }

      #word-counter-plus-popup td:last-child {
        text-align: right;
        font-weight: 500; /* Slightly bolder value */
        color: #111;
      }

      #word-counter-plus-popup .readability-score {
        display: inline-block;
        width: 22px; /* Adjusted size */
        height: 22px;
        line-height: 22px; /* Center text vertically */
        border-radius: 4px; /* Slightly rounded */
        color: #fff;
        text-align: center;
        font-weight: bold;
        font-size: 11px; /* Smaller font size */
        margin-right: 8px;
        vertical-align: middle; /* Align better with text */
      }
      #word-counter-plus-popup .readability-explanation {
          font-size: 12px; color: #666; margin-top: 2px;
      }

      #word-counter-plus-popup .word-frequency {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        font-size: 13px;
        border-bottom: 1px solid #f0f0f0;
      }
      #word-counter-plus-popup .word-frequency:last-child {
          border-bottom: none;
      }

      #word-counter-plus-popup .word {
        font-weight: 500;
        color: #333;
      }

      #word-counter-plus-popup .frequency {
        color: #777;
        font-size: 12px;
      }
       #word-counter-plus-popup .advanced-section-title {
           font-weight: 600;
           margin-top: 15px;
           margin-bottom: 5px;
           font-size: 14px;
           color: #333;
       }
        #word-counter-plus-popup .top-words-container {
          max-height: 160px; /* Slightly more height */
          overflow-y: auto;
          margin-top: 5px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 5px 10px;
        }
        #word-counter-plus-popup .chart-container {
          margin-top: 20px;
          height: auto; /* Allow height to adapt to content */
          min-height: 30px; /* Prevent collapsing */
          display: flex;
          align-items: flex-end; /* Bars grow from bottom */
          padding: 0 5px;
          position: relative; /* For potential labels */
        }
 
        #word-counter-plus-popup .hist-bar {
          background-color: #007bff; /* Bar color */
          /* width is calculated dynamically */
          margin: 0 2px; /* Spacing between bars */
          transition: background-color 0.2s;
          position: relative; /* Needed for potential pseudo-elements if adding labels directly */
          flex-shrink: 0; /* Prevent bars from shrinking */
        }

        #word-counter-plus-popup .hist-bar:hover {
          background-color: #0056b3; /* Darker on hover */
        }
    `;

    // Convert readability score to color (using softer flat colors)
    function getReadabilityColor(score, type) {
      if (type === 'flesch') {
        if (score >= 90) return '#2ecc71'; // Very Easy - green
        if (score >= 70) return '#3498db'; // Easy - blue
        if (score >= 60) return '#f1c40f'; // Standard - yellow
        if (score >= 50) return '#e67e22'; // Fairly Difficult - orange
        if (score >= 30) return '#e74c3c'; // Difficult - red
        return '#c0392b'; // Very Difficult - dark red
      } else { // Grade levels (Gunning Fog, SMOG)
        if (score <= 6) return '#2ecc71'; // green
        if (score <= 9) return '#3498db'; // blue
        if (score <= 12) return '#f1c40f'; // yellow
        if (score <= 16) return '#e67e22'; // orange
        return '#e74c3c'; // red
      }
    }

    // Create popup content with tabs
    popup.innerHTML = `
      <style>${popupStyle}</style>
      <div class="popup-header">
        <span class="popup-title">Word Counter Plus</span>
        <button id="word-counter-close" title="Close">&times;</button>
      </div>

      <div class="tabs">
        <div class="tab active" data-tab="basic">Basic</div>
        <div class="tab" data-tab="readability">Readability</div>
        <div class="tab" data-tab="structure">Structure</div>
        <div class="tab" data-tab="advanced">Advanced</div>
      </div>

      <!-- Basic Stats Tab -->
      <div id="basic-tab" class="tab-content active">
        <table>
          <tr>
            <td>Words:</td>
            <td><strong>${stats.wordCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Characters (with spaces):</td>
            <td><strong>${stats.charCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Characters (no spaces):</td>
            <td><strong>${stats.charNoSpacesCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Sentences:</td>
            <td><strong>${stats.sentenceCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Paragraphs:</td>
            <td><strong>${stats.paragraphCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Reading time:</td>
            <td><strong>~${stats.readingTimeMinutes} min</strong></td>
          </tr>
          <tr>
            <td>Average word length:</td>
            <td><strong>${stats.avgWordLength} chars</strong></td>
          </tr>
           <tr>
            <td>Average sentence length:</td>
            <td><strong>${stats.avgWordsPerSentence} words</strong></td>
          </tr>
        </table>
      </div>

      <!-- Readability Tab -->
      <div id="readability-tab" class="tab-content">
        <table>
          <tr>
            <td>
              <span class="readability-score" style="background-color: ${getReadabilityColor(stats.fleschReadingEase, 'flesch')}">${Math.round(stats.fleschReadingEase)}</span>
              Flesch Reading Ease:
            </td>
            <td>
              <strong>${stats.fleschReadingEase}</strong>
              <div class="readability-explanation">
                ${stats.fleschReadingEase >= 90 ? 'Very easy to read' :
                 stats.fleschReadingEase >= 80 ? 'Easy to read' :
                 stats.fleschReadingEase >= 70 ? 'Fairly easy to read' :
                 stats.fleschReadingEase >= 60 ? 'Standard' :
                 stats.fleschReadingEase >= 50 ? 'Fairly difficult' :
                 stats.fleschReadingEase >= 30 ? 'Difficult' : 'Very difficult'}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span class="readability-score" style="background-color: ${getReadabilityColor(stats.gunningFogIndex, 'grade')}">${Math.min(Math.round(stats.gunningFogIndex), 19)}+</span>
              Gunning Fog Index:
            </td>
            <td>
              <strong>${stats.gunningFogIndex}</strong>
              <div class="readability-explanation">
                ${stats.gunningFogIndex <= 6 ? 'Readable by 6th graders' :
                 stats.gunningFogIndex <= 8 ? 'Readable by 8th graders' :
                 stats.gunningFogIndex <= 10 ? 'Readable by high schoolers' :
                 stats.gunningFogIndex <= 14 ? 'Readable by college students' :
                 stats.gunningFogIndex <= 18 ? 'Readable by college graduates' : 'Advanced material'}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span class="readability-score" style="background-color: ${getReadabilityColor(stats.smogIndex, 'grade')}">${Math.min(Math.round(stats.smogIndex), 19)}+</span>
              SMOG Index:
            </td>
            <td>
              <strong>${stats.smogIndex}</strong>
              <div class="readability-explanation">
                Years of education needed
              </div>
            </td>
          </tr>
          <tr><td colspan="2" style="padding-top: 15px; font-size: 12px; color: #666; line-height: 1.4;">
            <strong>Flesch Ease (0-100):</strong> Higher = easier reading.<br>
            <strong>Fog & SMOG:</strong> Approx. grade level needed.
          </td></tr>
        </table>
      </div>

      <!-- Structure Tab -->
      <div id="structure-tab" class="tab-content">
        <table>
          <tr>
            <td>Sentence Count:</td>
            <td><strong>${stats.sentenceCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Paragraph Count:</td>
            <td><strong>${stats.paragraphCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Average Syllables/Word:</td>
            <td><strong>${stats.avgSyllablesPerWord}</strong></td>
          </tr>
           <tr>
            <td>Complex Words (3+ Syllables):</td>
            <td><strong>${stats.complexWordCount.toLocaleString()}</strong> (${stats.complexWordPercentage}%)</td>
          </tr>
        </table>
        <div style="font-size: 12px; color: #666; margin-top: 15px; line-height: 1.4;">
          Complex words (3+ syllables) are a key factor in readability formulas.
        </div>
      </div>

      <!-- Advanced Tab -->
      <div id="advanced-tab" class="tab-content">
        <table>
          <tr>
            <td>Unique words:</td>
            <td><strong>${stats.uniqueWordCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Longest word:</td>
            <td><strong>${stats.longestWord}</strong> (${stats.longestWordLength} chars)</td>
          </tr>
          <tr>
            <td>Nonsensical words:</td>
            <td><strong>${stats.nonsensicalPercentage}%</strong> (${stats.nonsensicalCount})</td>
          </tr>
        </table>

        <div class="advanced-section-title">Top Words (excluding common words)</div>
        <div class="top-words-container">
          ${stats.topWords.length > 0 ? stats.topWords.map(item => `
            <div class="word-frequency">
              <span class="word">${item.word}</span>
              <span class="frequency">${item.frequency} times</span>
            </div>
          `).join('') : '<div style="color: #888; font-style: italic; padding: 10px 0;">No significant words found.</div>'}
        </div>

        <h4>Word Length Distribution:</h4>
        <div id="word-length-chart" class="chart-container"></div>
      </div>
    `;

    // Add popup to page
    document.body.appendChild(popup);

    // Add tab switching functionality
    const tabs = popup.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active content
        const tabContents = popup.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));
        popup.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');
      });
    });

    // Add close functionality
    document.getElementById("word-counter-close").addEventListener("click", () => {
      popup.remove();
    });

    // --- Render Simple HTML/CSS Histogram --- 
    const chartContainer = document.getElementById('word-length-chart');
    if (chartContainer && stats.wordLengthData && stats.wordLengthData.length > 0 && stats.maxWordLengthCount > 0) {
      // Clear any previous content (like error messages)
      chartContainer.innerHTML = ''; 
      
      // Determine bar width based on container width and number of bars
      const containerWidth = chartContainer.offsetWidth - (stats.wordLengthData.length * 4); // Subtract margin space
      const barWidth = Math.max(5, Math.floor(containerWidth / stats.wordLengthData.length)); // Ensure min width
      chartContainer.style.justifyContent = 'flex-start'; // Align bars to the start

      stats.wordLengthData.forEach((count, index) => {
        const bar = document.createElement('div');
        bar.classList.add('hist-bar');
        // Calculate height in pixels, capping at 60px
        const maxPixelHeight = 60;
        const barPixelHeight = Math.max(2, Math.min(maxPixelHeight, Math.round((count / stats.maxWordLengthCount) * maxPixelHeight))); // Min height 2px
        bar.style.height = `${barPixelHeight}px`;
        bar.style.width = `${barWidth}px`;
        const wordLength = stats.wordLengthLabels[index];
        bar.title = `${count} words of length ${wordLength}`;
        chartContainer.appendChild(bar);
      });
        // Add simple labels (optional, can get crowded)
        // const labelsContainer = document.createElement('div');
        // labelsContainer.style.cssText = 'display: flex; justify-content: space-around; font-size: 0.7em; color: #666; margin-top: 3px;';
        // stats.wordLengthLabels.forEach(label => {
        //     const labelSpan = document.createElement('span');
        //     labelSpan.textContent = label;
        //     labelsContainer.appendChild(labelSpan);
        // });
        // chartContainer.insertAdjacentElement('afterend', labelsContainer); // Add labels after chart
    } else if (chartContainer) {
        chartContainer.innerHTML = '<p style="text-align: center; color: #888; font-size: 0.9em; padding-top: 20px;">Not enough data for chart.</p>';
    }

    // Auto-close after 2 minutes (user can always close it sooner)
    setTimeout(() => {
      const currentPopup = document.getElementById("word-counter-plus-popup");
      if (currentPopup) {
        currentPopup.remove();
      }
    }, 120000);
  }
}