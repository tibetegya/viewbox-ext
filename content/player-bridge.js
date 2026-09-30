// Isolated world → MAIN world: player.js can't use chrome.*, so settings travel as a DOM attribute + event.
(() => {
  const DEFAULTS = { autoplayEnabled: true, creditsOffset: 20, countdownSecs: 10, autoplayOff: [], stillWatching: true, swEpisodes: 3, swMinutes: 90 }; // same defaults as options.js
  async function push() {
    document.documentElement.dataset.fcSettings = JSON.stringify(await chrome.storage.sync.get(DEFAULTS));
    document.dispatchEvent(new Event('fc-settings'));
  }
  chrome.storage.onChanged.addListener((_c, area) => area === 'sync' && push());
  push();
})();
