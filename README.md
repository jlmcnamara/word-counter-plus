# Word Counter Plus - Enhanced Text Analysis Extension

Word Counter Plus is a browser extension that goes beyond simple word counting. Select text on any webpage, right-click, and get detailed statistics and insights about the content.

## Features

*   **Context Menu Integration:** Activate by selecting text and right-clicking.
*   **Comprehensive Statistics:**
    *   Word Count
    *   Character Count (with and without spaces)
    *   Sentence Count
    *   Paragraph Count
    *   Average Word Length
    *   Average Words per Sentence
    *   Longest Word
*   **Readability Analysis:**
    *   Flesch-Kincaid Readability Score (0-100)
    *   Estimated Reading Level (approximated)
    *   Visual Readability Meter
*   **Time Estimation:**
    *   Estimated Reading Time (based on average reading speed)
*   **Content Insights:**
    *   Word Length Distribution Chart
    *   Character Type Analysis (Vowels, Consonants, Numbers, Symbols) with Pie Chart
    *   Most Frequent Words List
*   **Dynamic Popup Display:** Statistics are presented in a clean, tabbed popup injected directly into the page.
*   **Fallback Alert:** Provides basic stats via an alert if the popup injection fails.

## How to Use

1.  Install the extension in your Chromium-based browser (Chrome, Edge, etc.).
2.  Navigate to any webpage containing text.
3.  Select the portion of text you want to analyze using your mouse.
4.  Right-click on the selected text.
5.  Choose "Word Counter Plus" from the context menu.
6.  A popup will appear on the page displaying the calculated statistics. Explore the "Summary" and "Frequency" tabs for different insights.
7.  Click the 'X' button or wait 30 seconds for the popup to close automatically.

## Technical Overview

*   **Manifest V3:** Built using the modern Chrome Extension platform standard.
*   **Permissions:** Uses `contextMenus` for the right-click option, `scripting` and `activeTab` to inject the analysis popup into the current page. Needs `<all_urls>` host permission to function on any website.
*   **Background Script (`background.js`):**
    *   Listens for the context menu click.
    *   Receives the selected text.
    *   Performs all statistical calculations (`calculateEnhancedStats`).
    *   Injects the `showEnhancedStatsPopup` function into the active tab to display results.
*   **Content Script Functionality (Injected via `background.js`):**
    *   The `showEnhancedStatsPopup` function dynamically creates the HTML, CSS, and JavaScript for the results popup directly within the webpage's DOM. It includes tabbed navigation, charts, and data display.
*   **No Persistent Content Script:** Unlike some extensions, it doesn't have a `content.js` file constantly running on pages. Functionality is injected on demand.

## Files

*   `manifest.json`: Defines the extension's metadata, permissions, and background script.
*   `background.js`: Contains the core logic for context menu handling, text analysis, and triggering the results popup.
*   `icons/`: Contains the extension icons (16x16, 48x48, 128x128).
*   `README.md`: This file.
