// Elements
const vodContainer = document.getElementById('vod-container');
const refreshBtn = document.getElementById('refresh-btn');
const connectionStatus = document.getElementById('connection-status');
const totalVodsEl = document.getElementById('total-vods');
const lastUpdatedEl = document.getElementById('last-updated');
const searchInput = document.getElementById('search-input');
const streamerSearchInput = document.getElementById('streamer-search');
const streamerSearchBtn = document.getElementById('streamer-search-btn');

// API URL
const API_URL = 'https://api.vodvod.top/all/private';
const BASE_URL = 'https://api.vodvod.top';
const CHANNEL_URL = 'https://api.vodvod.top/channels/@';

// Current view state
let currentData = [];
let currentStreamer = null;

// Format duration (seconds to HH:MM:SS)
function formatDuration(seconds) {
  if (!seconds) return '?:??:??';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

// Format date
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit',
      hour: '2-digit', 
      minute: '2-digit'
    });
  } catch (e) {
    return 'Unknown Date';
  }
}

// Copy text to clipboard
function copyToClipboard(text) {
  // Use Electron API if available
  if (window.api && window.api.copyToClipboard) {
    window.api.copyToClipboard(text);
    showNotification('LINK COPIED TO CLIPBOARD');
    return;
  }
  
  // Fallback for browser testing
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  
  showNotification('LINK COPIED TO CLIPBOARD');
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 2000);
}

// Open in VLC
function openInVLC(link) {
  // Use Electron API
  if (window.api && window.api.openVLC) {
    window.api.openVLC(link);
    showNotification('OPENING IN VLC...');
    return;
  }
  
  // Fallback for browser testing
  console.log('Opening in VLC:', link);
  showNotification('OPENING IN VLC...');
}

// Fetch all VODs from API
async function fetchAllVODs() {
  currentStreamer = null;
  updateLoadingState('CONNECTING TO NETWORK...', 'SCANNING DATABASE');
  
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }
    
    const data = await response.json();
    connectionStatus.textContent = 'CONNECTION ESTABLISHED';
    connectionStatus.style.color = 'var(--primary)';
    
    currentData = data;
    renderVODs(data);
    updateStats(data);
    
  } catch (error) {
    handleFetchError(error);
  }
}

// Fetch VODs for a specific streamer
async function fetchStreamerVODs(streamerName) {
  if (!streamerName || streamerName.trim() === '') {
    return fetchAllVODs();
  }
  
  const cleanStreamerName = streamerName.trim().toLowerCase();
  currentStreamer = cleanStreamerName;
  
  updateLoadingState(
    `CONNECTING TO NETWORK: STREAMER @${cleanStreamerName}`, 
    `SCANNING @${cleanStreamerName} DATABASE`
  );
  
  try {
    const response = await fetch(`${CHANNEL_URL}${cleanStreamerName}`);
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }
    
    const data = await response.json();
    connectionStatus.textContent = `CONNECTION ESTABLISHED: @${cleanStreamerName}`;
    connectionStatus.style.color = 'var(--primary)';
    
    currentData = data;
    renderVODs(data);
    updateStats(data, cleanStreamerName);
    
  } catch (error) {
    handleFetchError(error);
  }
}

// Update loading state
function updateLoadingState(statusText, loadingText) {
  connectionStatus.textContent = statusText;
  connectionStatus.style.color = '#fff';
  
  vodContainer.innerHTML = `
    <div class="loading">
      <div class="loading-text">${loadingText}</div>
      <div class="loading-bar"></div>
    </div>
  `;
}

// Handle fetch errors
function handleFetchError(error) {
  connectionStatus.textContent = `CONNECTION FAILED: ${error.message}`;
  connectionStatus.style.color = 'var(--accent)';
  
  vodContainer.innerHTML = `
    <div class="error-message">
      <h3>DATA_ACCESS_ERROR</h3>
      <p>${error.message}</p>
      <button class="cyber-btn" onclick="fetchAllVODs()">RETRY CONNECTION</button>
    </div>
  `;
}

// Render VODs in UI
function renderVODs(data) {
  if (!data || data.length === 0) {
    vodContainer.innerHTML = '<div class="no-results">NO VODS FOUND</div>';
    return;
  }
  
  vodContainer.innerHTML = '';
  
  data.forEach(vod => {
    const metadata = vod.Metadata || {};
    const streamLink = BASE_URL + vod.Link;
    
    // Extract box art and profile image
    const boxArtUrl = metadata.BoxArtUrlAtStart?.String || 'https://via.placeholder.com/40x56/111122/00ffff?text=Game';
    const profileImageUrl = metadata.ProfileImageUrlAtStart?.String || 'https://via.placeholder.com/50/111122/00ffff?text=User';
    
    // Extract duration
    const durationSeconds = metadata.HlsDurationSeconds?.Float64 || 0;
    const durationText = formatDuration(durationSeconds);
    
    // Create VOD card
    const vodCard = document.createElement('div');
    vodCard.className = 'vod-card';
    vodCard.innerHTML = `
      <div class="vod-thumbnail" style="background-image: url('${boxArtUrl.replace('-40x56', '-320x180')}')">
        <div class="vod-duration">${durationText}</div>
      </div>
      <div class="vod-info">
        <div class="vod-title">${metadata.TitleAtStart || 'Unnamed Stream'}</div>
        <div class="vod-meta">
          <div class="vod-streamer">
            <img class="streamer-avatar" src="${profileImageUrl}" alt="Streamer">
            <span>${metadata.StreamerLoginAtStart || 'Unknown'}</span>
          </div>
          <div class="vod-date">${formatDate(metadata.StartTime)}</div>
        </div>
        <div class="vod-badges">
          <span class="badge">${metadata.GameNameAtStart || 'Unknown Game'}</span>
          <span class="badge">${metadata.LanguageAtStart || 'en'}</span>
          <span class="badge views">${metadata.MaxViews?.toLocaleString() || '0'} views</span>
        </div>
        <div class="vod-actions">
          <button class="cyber-btn cyber-btn-sm copy-link-btn" data-link="${streamLink}">
            <i class="fas fa-copy"></i> COPY LINK
          </button>
          <button class="cyber-btn cyber-btn-sm open-vlc-btn" data-link="${streamLink}">
            <i class="fas fa-play"></i> OPEN IN VLC
          </button>
        </div>
      </div>
    `;
    
    // Add copy link functionality
    const copyBtn = vodCard.querySelector('.copy-link-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const link = e.target.closest('button').dataset.link;
      copyToClipboard(link);
    });
    
    // Add open in VLC functionality
    const openVlcBtn = vodCard.querySelector('.open-vlc-btn');
    openVlcBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const link = e.target.closest('button').dataset.link;
      openInVLC(link);
    });
    
    vodContainer.appendChild(vodCard);
  });
}

// Update stats in the footer
function updateStats(data, streamerName = '') {
  totalVodsEl.textContent = `VODs: ${data.length}${streamerName ? ` (@${streamerName})` : ''}`;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  lastUpdatedEl.textContent = `LAST SYNC: ${timeStr}`;
}

// Filter displayed VODs based on search term
function filterVODs(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    // If search is empty, show all current data
    renderVODs(currentData);
    return;
  }
  
  searchTerm = searchTerm.toLowerCase().trim();
  
  const filteredData = currentData.filter(vod => {
    const metadata = vod.Metadata || {};
    const title = (metadata.TitleAtStart || '').toLowerCase();
    const streamer = (metadata.StreamerLoginAtStart || '').toLowerCase();
    const game = (metadata.GameNameAtStart || '').toLowerCase();
    
    return title.includes(searchTerm) || 
           streamer.includes(searchTerm) || 
           game.includes(searchTerm);
  });
  
  renderVODs(filteredData);
  totalVodsEl.textContent = `VODs: ${filteredData.length}/${currentData.length}${currentStreamer ? ` (@${currentStreamer})` : ''}`;
}

// Event Listeners
// Content search
searchInput.addEventListener('input', (e) => {
  filterVODs(e.target.value);
});

// Streamer search - on button click
streamerSearchBtn.addEventListener('click', () => {
  fetchStreamerVODs(streamerSearchInput.value);
});

// Streamer search - on Enter key
streamerSearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    fetchStreamerVODs(streamerSearchInput.value);
  }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  if (currentStreamer) {
    fetchStreamerVODs(currentStreamer);
  } else {
    fetchAllVODs();
  }
});

// Initial load
document.addEventListener('DOMContentLoaded', fetchAllVODs);