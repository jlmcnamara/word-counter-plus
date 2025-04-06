// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showStats" && message.stats) {
    // Display the statistics
    showStatsPopup(message.stats);
  }
});

// Function to display statistics in a popup
function showStatsPopup(stats) {
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
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: fadeIn 0.3s;
  `;
  
  // Create content for popup
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 16px;">Word Counter Plus</h3>
      <button id="word-counter-close" style="border: none; background: none; cursor: pointer; font-size: 16px;">&times;</button>
    </div>
    <hr style="margin: 0 0 10px 0; border: none; border-top: 1px solid #eee;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td>Words:</td>
        <td style="text-align: right;"><strong>${stats.wordCount}</strong></td>
      </tr>
      <tr>
        <td>Characters (with spaces):</td>
        <td style="text-align: right;"><strong>${stats.charCount}</strong></td>
      </tr>
      <tr>
        <td>Characters (no spaces):</td>
        <td style="text-align: right;"><strong>${stats.charNoSpacesCount}</strong></td>
      </tr>
      <tr>
        <td>Average word length:</td>
        <td style="text-align: right;"><strong>${stats.avgWordLength}</strong></td>
      </tr>
      <tr>
        <td>Longest word:</td>
        <td style="text-align: right;"><strong>${stats.longestWord}</strong> (${stats.longestWordLength})</td>
      </tr>
    </table>
  `;
  
  // Add styles for animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  // Add popup to the page
  document.body.appendChild(popup);
  
  // Add close functionality
  document.getElementById("word-counter-close").addEventListener("click", () => {
    popup.remove();
  });
  
  // Auto-close after 5 seconds
  setTimeout(() => {
    if (document.getElementById("word-counter-plus-popup")) {
      document.getElementById("word-counter-plus-popup").remove();
    }
  }, 5000);
}