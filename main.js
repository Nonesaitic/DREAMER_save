/* ==============================
   DOM REFERENCES
================================ */

const recommendedSongs = document.querySelector('#recommendedSongs');
const hotSongs = document.querySelector('#hotSongs');
const loading = document.querySelector('#loading');
const empty = document.querySelector('#empty');
const overlay = document.querySelector('#playerOverlay');
const closeBtn = document.querySelector('#playerClose');
const cover = document.querySelector('#playerCover');
const title = document.querySelector('#playerTitle');
const artist = document.querySelector('#playerArtist');
const progress = document.querySelector('#progressBar');
const currentTime = document.querySelector('#currentTime');
const duration = document.querySelector('#duration');
const playBtn = document.querySelector('#playBtn');
const prevBtn = document.querySelector('#prevBtn');
const nextBtn = document.querySelector('#nextBtn');
const volume = document.querySelector('#volumeBar');
const recommend = document.querySelector('#playerRecommendList');
const shuffleBtn = document.querySelector('#shuffleBtn');
const repeatBtn = document.querySelector('#repeatBtn');
const searchInput = document.querySelector('#searchInput');
const searchBtn = document.querySelector('#searchBtn');
const searchResults = document.querySelector('#searchResults');
const searchResultSection = document.querySelector('#searchResultSection');
const onlineSearchNote = document.querySelector('#onlineSearchNote');

let songs = [];
let playlists = [];
let currentSong = null;
let currentIndex = 0;
let audio = null;
let shuffleMode = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'

const mini = document.createElement('div');
mini.className = 'mini-player';
mini.innerHTML = `
  <div class="mini-left">
    <img id="miniCover">
    <div class="mini-info">
      <strong id="miniTitle">Chưa phát</strong>
      <span id="miniArtist">---</span>
    </div>
  </div>
  <div class="mini-center">
    <button id="miniPrev"><i class="fa-solid fa-backward-step"></i></button>
    <button class="mini-play" id="miniPlay"><i class="fa-solid fa-play"></i></button>
    <button id="miniNext"><i class="fa-solid fa-forward-step"></i></button>
  </div>
  <div class="mini-progress">
    <span id="miniCurrent">0:00</span>
    <input id="miniProgress" type="range" min="0" max="100" value="0">
    <span id="miniDuration">0:00</span>
  </div>
  <button class="mini-playlist-btn" id="miniPlaylistBtn"><i class="fa-solid fa-list"></i></button>
`;
document.body.appendChild(mini);

const playlistPanel = document.createElement('div');
playlistPanel.className = 'playlist-panel';
playlistPanel.innerHTML = `
  <div class="playlist-header">
    <div>
      <h3>Playlist</h3>
      <span id="playlistCount">0 bài hát</span>
    </div>
    <button id="playlistClose"><i class="fa-solid fa-xmark"></i></button>
  </div>
  <div class="playlist-list" id="playlistList"></div>
`;
document.body.appendChild(playlistPanel);

const miniCover = document.querySelector('#miniCover');
const miniTitle = document.querySelector('#miniTitle');
const miniArtist = document.querySelector('#miniArtist');
const miniPrev = document.querySelector('#miniPrev');
const miniPlay = document.querySelector('#miniPlay');
const miniNext = document.querySelector('#miniNext');
const miniProgress = document.querySelector('#miniProgress');
const miniCurrent = document.querySelector('#miniCurrent');
const miniDuration = document.querySelector('#miniDuration');
const miniPlaylistBtn = document.querySelector('#miniPlaylistBtn');
const playlistClose = document.querySelector('#playlistClose');
const playlistList = document.querySelector('#playlistList');
const playlistCount = document.querySelector('#playlistCount');


/* ==============================
   TOAST NOTIFICATIONS
   Thay cho alert()/confirm() mặc định của trình duyệt.
================================ */

const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

const TOAST_ICONS = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  info: 'fa-circle-info'
};

function showToast(message, type = 'info', duration = 3200) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const dismiss = () => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(dismiss, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); dismiss(); });

  return toast;
}

function showConfirmToast(message) {
  return new Promise(resolve => {
    const toast = document.createElement('div');
    toast.className = 'toast toast-confirm';
    toast.innerHTML = `
      <div class="toast-confirm-message">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>${message}</span>
      </div>
      <div class="toast-confirm-actions">
        <button class="toast-btn toast-btn-cancel">Hủy</button>
        <button class="toast-btn toast-btn-ok">Xóa</button>
      </div>
    `;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    const close = (result) => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      resolve(result);
    };

    toast.querySelector('.toast-btn-cancel').onclick = () => close(false);
    toast.querySelector('.toast-btn-ok').onclick = () => close(true);
  });
}


/* ==============================
   LOCAL MUSIC DATABASE (IndexedDB)
================================ */

const DB_NAME = "AlbumMusicDB";
const DB_VERSION = 2;
const STORE_NAME = "uploads";
const PLAYLIST_STORE = "playlists";

function openMusicDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PLAYLIST_STORE)) {
        db.createObjectStore(PLAYLIST_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getUploadedSongs() {
  try {
    const db = await openMusicDB();

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => {
        const result = request.result.map(song => ({
          id: song.id,
          name: song.name,
          author: song.author ?? song.auther, // song.auther: bản ghi cũ đã lưu trước khi đổi tên
          image: URL.createObjectURL(song.image),
          mp3: URL.createObjectURL(song.audio),
          local: true
        }));

        resolve(result);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB:", error);
    return [];
  }
}

async function saveUploadedSong(song) {
  const db = await openMusicDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(song);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteUploadedSong(id) {
  const db = await openMusicDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}


/* ==============================
   PLAYLISTS (IndexedDB)
================================ */

async function getPlaylists() {
  try {
    const db = await openMusicDB();

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE, "readonly");
      const request = tx.objectStore(PLAYLIST_STORE).getAll();

      request.onsuccess = () => {
        resolve(request.result.sort((a, b) => a.createdAt - b.createdAt));
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB playlists:", error);
    return [];
  }
}

async function savePlaylistRecord(playlist) {
  const db = await openMusicDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLIST_STORE, "readwrite");
    tx.objectStore(PLAYLIST_STORE).put(playlist);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function deletePlaylistRecord(id) {
  const db = await openMusicDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLIST_STORE, "readwrite");
    tx.objectStore(PLAYLIST_STORE).delete(id);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}


/* ==============================
   HIDDEN SONGS (bài hát gốc đã bị xóa)
   Bài trong file.json không nằm trong IndexedDB nên không thể
   xóa vật lý khỏi file — thay vào đó ta lưu danh sách id đã ẩn
   vào localStorage để những lần tải sau không hiện lại nữa.
================================ */

const HIDDEN_SONGS_KEY = "albumHiddenSongIds";

function getHiddenSongIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(HIDDEN_SONGS_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function hideSongId(id) {
  const hidden = getHiddenSongIds();
  if (!hidden.includes(id)) {
    hidden.push(id);
    localStorage.setItem(HIDDEN_SONGS_KEY, JSON.stringify(hidden));
  }
}


/* ==============================
   YOUTUBE SEARCH
================================ */
const YT_SETTINGS_KEY = 'dreamer_youtube_settings_v1';
const youtubeApiKeyInput = document.querySelector('#youtubeApiKey');
const youtubeStatus = document.querySelector('#youtubeStatus');
const saveYoutubeSettingsBtn = document.querySelector('#saveYoutubeSettings');
const clearYoutubeSettingsBtn = document.querySelector('#clearYoutubeSettings');
const autoDownloadToggle = document.querySelector('#autoDownloadToggle');
const youtubeFrame = document.querySelector('#youtubePlayerFrame');
let youtubePlayer = null;
let youtubeReady = false;
let pendingYoutubeVideoId = null;
let youtubeProgressTimer = null;
let youtubeIsPlaying = false;

let youtubeAutoUnmuteArmed = false;

// Trình duyệt chặn tự phát có tiếng: phát tắt tiếng trước cho nhạc chạy ngay, rồi bật lại tiếng ở lần chạm/bấm phím đầu tiên.
function enableYoutubeAutoUnmute() {
  if (youtubeAutoUnmuteArmed) return;
  youtubeAutoUnmuteArmed = true;
  const restore = () => {
    document.removeEventListener('pointerdown', restore, true);
    document.removeEventListener('keydown', restore, true);
    youtubeAutoUnmuteArmed = false;
    try {
      youtubePlayer?.unMute();
      youtubePlayer?.setVolume(Math.round(Number(volume.value) * 100));
    } catch {}
  };
  document.addEventListener('pointerdown', restore, { capture: true });
  document.addEventListener('keydown', restore, { capture: true });
}

function mountYoutubePlayer(videoId) {
  pendingYoutubeVideoId = videoId;
  if (!youtubeReady || !window.YT?.Player || !youtubeFrame) return;
  if (youtubePlayer) { try { youtubePlayer.destroy(); } catch {} youtubePlayer = null; }
  youtubeFrame.innerHTML = '';
  youtubePlayer = new YT.Player(youtubeFrame, {
    width: '100%', height: '100%', videoId,
    playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3, cc_load_policy: 0, enablejsapi: 1 },
    events: {
      onReady: (event) => {
        event.target.setVolume(Math.round(Number(volume.value) * 100));
        event.target.playVideo();
        setTimeout(() => {
          if (youtubePlayer !== event.target) return;
          const state = event.target.getPlayerState();
          if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
            event.target.mute();
            event.target.playVideo();
            enableYoutubeAutoUnmute();
          }
        }, 1200);
        progress.max = miniProgress.max = Math.max(1, event.target.getDuration() || 1);
        duration.textContent = miniDuration.textContent = formatTime(event.target.getDuration());
        updateYoutubeProgress();
        if (youtubeProgressTimer) clearInterval(youtubeProgressTimer);
        youtubeProgressTimer = setInterval(updateYoutubeProgress, 500);
        updateUI();
      },
      onStateChange: (event) => {
        youtubeIsPlaying = event.data === YT.PlayerState.PLAYING;

        // Yêu cầu YouTube tắt phụ đề khi video bắt đầu phát.
        if (event.data === YT.PlayerState.PLAYING) {
          try {
            event.target.unloadModule('captions');
          } catch (error) {
            console.warn('Không thể tắt phụ đề YouTube:', error);
          }
        }

        if (event.data === YT.PlayerState.ENDED) nextSong(true);
        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.BUFFERING) updateYoutubeProgress();
        updateUI();
      },
      onAutoplayBlocked: () => {
        youtubeIsPlaying = false;
        try { youtubePlayer.mute(), youtubePlayer.playVideo(), enableYoutubeAutoUnmute(); } catch {}
        updateUI();
        showToast('Trình duyệt chặn tự phát có tiếng: đang phát tắt tiếng, chạm vào màn hình để bật tiếng.', 'info', 5000);
      },
      onError: (event) => {
        youtubeIsPlaying = false;
        const messages = {2:'Video ID không hợp lệ.',5:'Trình phát HTML5 không phát được video này.',100:'Video đã bị xóa hoặc đặt riêng tư.',101:'Chủ video không cho phép phát nhúng.',150:'Chủ video không cho phép phát nhúng.',153:'YouTube không nhận được thông tin Referrer của trang.'};
        showToast(messages[event.data] || `YouTube Player lỗi ${event.data}.`, 'error', 5000);
        updateUI();
      }
    }
  });
  pendingYoutubeVideoId = null;
}

function updateYoutubeProgress() {
  if (!youtubePlayer || typeof youtubePlayer.getCurrentTime !== 'function') return;
  try {
    const now = youtubePlayer.getCurrentTime() || 0;
    const total = youtubePlayer.getDuration() || 0;
    if (total > 0) {
      progress.max = miniProgress.max = total;
      progress.value = miniProgress.value = Math.min(now, total);
      duration.textContent = miniDuration.textContent = formatTime(total);
      currentTime.textContent = miniCurrent.textContent = formatTime(now);
      setRangeFill(progress); setRangeFill(miniProgress);
    }
  } catch {}
}

function destroyYoutubePlayer() {
  if (youtubeProgressTimer) clearInterval(youtubeProgressTimer);
  youtubeProgressTimer = null; youtubeIsPlaying = false;
  if (youtubePlayer) { try { youtubePlayer.destroy(); } catch {} youtubePlayer = null; }
  if (youtubeFrame) { youtubeFrame.innerHTML = ''; youtubeFrame.hidden = true; }
}
function getDreamerSettings(){ try{return JSON.parse(localStorage.getItem(YT_SETTINGS_KEY)||'{}')}catch{return {}} }
function updateYoutubeSettingsUI(){ const x=getDreamerSettings(); if(youtubeApiKeyInput)youtubeApiKeyInput.value=x.apiKey||''; if(autoDownloadToggle)autoDownloadToggle.checked=!!x.autoDownload; if(youtubeStatus)youtubeStatus.textContent=x.apiKey?'Đã lưu API Key':'Chưa cấu hình API'; }
updateYoutubeSettingsUI();
saveYoutubeSettingsBtn?.addEventListener('click',()=>{const apiKey=youtubeApiKeyInput?.value.trim();if(!apiKey)return showToast('Nhập YouTube API Key trước nhé.');const old=getDreamerSettings();localStorage.setItem(YT_SETTINGS_KEY,JSON.stringify({...old,apiKey,autoDownload:!!autoDownloadToggle?.checked}));updateYoutubeSettingsUI();showToast('Đã lưu API Key.','success');});
clearYoutubeSettingsBtn?.addEventListener('click',()=>{const old=getDreamerSettings();localStorage.setItem(YT_SETTINGS_KEY,JSON.stringify({...old,apiKey:''}));updateYoutubeSettingsUI();showToast('Đã xóa API Key.','success');});
window.onYouTubeIframeAPIReady=()=>{youtubeReady=true;if(pendingYoutubeVideoId)mountYoutubePlayer(pendingYoutubeVideoId);};
if(!document.querySelector('script[data-youtube-iframe-api]')){const tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';tag.dataset.youtubeIframeApi='1';document.head.appendChild(tag);}
async function searchOnlineMusic(query,auto=false){
 const keyword=query.trim(); if(!keyword)return auto?undefined:showToast('Nhập tên bài hát hoặc nghệ sĩ trước nhé.');
 const apiKey=getDreamerSettings().apiKey;if(!apiKey){if(auto)return;document.querySelector('#dreamerSettings')?.setAttribute('open','');return showToast('Nhập YouTube API Key trong Cài đặt DREAMER nhé.','info',4500);}
 const seq=++searchSeq;if(!auto)rememberSearch(keyword);loading.hidden=false;loading.querySelector('span').textContent='Đang tìm trên YouTube...';empty.hidden=true;searchResultSection.hidden=false;document.body.classList.add('is-searching');searchResults.innerHTML='';onlineSearchNote.textContent=`Đang tìm “${keyword}” trên YouTube...`;setSearchBusy(true);if(!searchCache.has(keyword.toLowerCase()))showSearchSkeleton();
 try{
  const q=new URLSearchParams({part:'snippet',type:'video',videoCategoryId:'10',videoEmbeddable:'true',maxResults:'24',q:keyword,regionCode:'VN',relevanceLanguage:'vi',key:apiKey});
  const cacheKey=keyword.toLowerCase();let data=searchCache.get(cacheKey);if(!data){const res=await fetch('https://www.googleapis.com/youtube/v3/search?'+q);data=await res.json();if(!res.ok)throw new Error(data.error?.message||`YouTube API ${res.status}`);searchCache.set(cacheKey,data);}if(seq!==searchSeq)return;clearSearchSkeleton();
  const results=(data.items||[]).filter(x=>x.id?.videoId).map(x=>({id:'youtube-'+x.id.videoId,videoId:x.id.videoId,name:x.snippet.title,author:x.snippet.channelTitle,image:fixThumb(x.snippet.thumbnails?.maxres?.url||x.snippet.thumbnails?.medium?.url||x.snippet.thumbnails?.high?.url)||'./img/images.jpg',duration:0,isYouTube:true,isOnline:true,source:'YouTube'}));
  if(!results.length){onlineSearchNote.textContent='Không tìm thấy video phù hợp.';empty.hidden=false;return;}
  results.forEach(song=>{const card=createCard(song,-1);card.classList.add('online-song-card');card.querySelector('h3').textContent=song.name;card.querySelector('p').textContent=song.author;card.onclick=e=>{if(e.target.closest('button,a'))return;playOnlineSong(song)};searchResults.appendChild(card);});onlineSearchNote.textContent=`Tìm thấy ${results.length} kết quả YouTube.`;
 }catch(e){console.error(e);onlineSearchNote.textContent=e.message;showToast(e.message,'error',5000);}finally{loading.hidden=true;loading.querySelector('span').textContent='Đang tìm kiếm...';if(seq===searchSeq){clearSearchSkeleton();setSearchBusy(false);}}
}
function playOnlineSong(song,options){let i=songs.findIndex(x=>x.id===song.id);if(i<0){songs.push(song);i=songs.length-1;renderPlaylist();}currentIndex=i;openPlayer(song,options);}
searchBtn.addEventListener('click',()=>searchOnlineMusic(searchInput.value));searchInput.addEventListener('keydown',e=>{if(e.key==='Enter')searchOnlineMusic(searchInput.value)});

/* ==============================
   LOAD & RENDER SONGS
================================ */

async function loadSongs() {
  try {
    loading.hidden = false;
    const res = await fetch('./file.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawJsonSongs = await res.json();
    const uploadedSongs = await getUploadedSongs();
    const hiddenIds = getHiddenSongIds();

    const jsonSongs = (Array.isArray(rawJsonSongs) ? rawJsonSongs : [])
      .map(song => ({ ...song, id: song.id || `json-${song.mp3}` }))
      .filter(song => !hiddenIds.includes(song.id));

    songs = [
      ...jsonSongs,
      ...uploadedSongs
    ];

    playlists = await getPlaylists();
    renderMyPlaylists();

    if (!songs.length) throw new Error('Chưa có bài hát nào');

    renderSongs();
    renderPlaylist();
    renderHistory();
    setHero(getLastSong());
  } catch (err) {
    console.error(err);
    empty.hidden = false;
    const p = empty.querySelector('p');
    if (p) p.textContent = 'Không thể tải danh sách nhạc.';
  } finally {
    loading.hidden = true;
  }
}

const CARD_TEXT_LIMIT = 13;

// Cắt chuỗi còn tối đa `max` ký tự (đếm theo ký tự Unicode, hợp với tiếng Việt), thừa thì thêm "…"
function limitText(text, max) {
  const chars = [...String(text ?? '').normalize('NFC')];
  return chars.length > max ? chars.slice(0, max).join('').trimEnd() + '…' : chars.join('');
}

function createCard(song, index) {
  const card = document.createElement('div');
  card.className = 'song-card';
  card.innerHTML = `
    <img src="${song.image}" alt="${song.name}">
    <div class="song-card-info">
      <h3></h3>
      <p></p>
    </div>
    <button class="song-card-add-btn" title="Thêm vào playlist">
      <i class="fa-solid fa-square-plus"></i>
    </button>
    <button class="song-card-delete-btn" title="Xóa bài hát">
      <i class="fa-solid fa-trash"></i>
    </button> 
  `;

  // Tên bài và tác giả trên thẻ: tối đa 11 ký tự, đủ tên hiện khi rê chuột (title)
  const cardTitle = card.querySelector('h3');
  const cardAuthor = card.querySelector('p');
  cardTitle.textContent = limitText(song.name, CARD_TEXT_LIMIT);
  cardTitle.title = song.name;
  cardAuthor.textContent = limitText(song.author, CARD_TEXT_LIMIT);
  cardAuthor.title = song.author;

  card.onclick = () => {
    currentIndex = index;
    openPlayer(song);
  };

  card.querySelector('.song-card-add-btn').onclick = (event) => openAddToPlaylistModal(song, event);
  card.querySelector('.song-card-delete-btn').onclick = (event) => handleDeleteSong(song, event);

  return card;
}

function renderSongs() {
  recommendedSongs.innerHTML = '';
  songs.forEach((song, i) => recommendedSongs.appendChild(createCard(song, i)));

  hotSongs.innerHTML = '';
  songs.slice(0, 6).forEach((song, i) => {
    const item = document.createElement('div');
    item.className = 'hot-song';
    item.innerHTML = `
      <div class="hot-number">${i + 1}</div>
      <img src="${song.image}" alt="${song.name}">
      <div class="hot-info">
        <h3>${song.name}</h3>
        <p>${song.author}</p>
      </div>
      <div class="hot-song-actions">
        <button class="hot-song-add-btn" title="Thêm vào playlist">
          <i class="fa-solid fa-square-plus"></i>
        </button>
        <button class="hot-song-delete-btn" title="Xóa bài hát">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    item.onclick = () => {
      currentIndex = i;
      openPlayer(song);
    };
    item.querySelector('.hot-song-add-btn').onclick = (event) => openAddToPlaylistModal(song, event);
    item.querySelector('.hot-song-delete-btn').onclick = (event) => handleDeleteSong(song, event);
    hotSongs.appendChild(item);
  });
}


/* ==============================
   DELETE SONG (áp dụng cho mọi bài hát)
================================ */

async function handleDeleteSong(song, event) {
  if (event) event.stopPropagation();
  if (!song) return;

  const confirmed = await showConfirmToast(`Xóa "${song.name}" khỏi danh sách?`);
  if (!confirmed) return;

  try {
    if (song.local) {
      // Bài upload local -> xóa thẳng khỏi IndexedDB
      await deleteUploadedSong(song.id);

      // Giải phóng bộ nhớ object URL đã tạo cho bài hát local
      if (song.image) URL.revokeObjectURL(song.image);
      if (song.mp3) URL.revokeObjectURL(song.mp3);
    } else {
      // Bài gốc từ file.json -> ẩn vĩnh viễn qua localStorage
      hideSongId(song.id);
    }

    const deletedIndex = songs.indexOf(song);
    const wasPlaying = currentSong === song;

    songs = songs.filter(s => s !== song);

    if (wasPlaying) {
      if (audio) { audio.pause(); audio.src = ''; audio = null; }
      currentSong = null;
      closePlayer();
      mini.classList.remove('active');
    } else if (deletedIndex > -1 && deletedIndex < currentIndex) {
      currentIndex -= 1;
    }

    renderSongs();
    renderPlaylist();
    showToast(`Đã xóa "${song.name}"`, 'success');
  } catch (error) {
    console.error("Xóa bài hát:", error);
    showToast("Không thể xóa bài hát. Vui lòng thử lại.", 'error');
  }
}


/* ==============================
   PLAYER
================================ */

function openPlayer(song, options = {}) {
  if (song?.isYouTube) {
    const sameYT = currentSong === song && Boolean(youtubePlayer);
    currentIndex = songs.indexOf(song) > -1 ? songs.indexOf(song) : currentIndex;
    if (audio) { audio.pause(); audio.src = ''; audio = null; }
    currentSong = song; cover.hidden = true;
    if (youtubeFrame) youtubeFrame.hidden = false;
    progress.value = miniProgress.value = 0; progress.max = miniProgress.max = 1;
    currentTime.textContent = miniCurrent.textContent = '0:00';
    duration.textContent = miniDuration.textContent = '0:00';
    setRangeFill(progress); setRangeFill(miniProgress);
    title.textContent=song.name; artist.textContent=song.author; if(options.background){mini.classList.add('active');}else{overlay.classList.add('active'); mini.classList.remove('active'); document.body.style.overflow='hidden';} miniCover.src=song.image;miniTitle.textContent=song.name;miniArtist.textContent=song.author; try{localStorage.setItem(LAST_SONG_KEY,song.id);localStorage.setItem(LAST_YOUTUBE_SONG_KEY,JSON.stringify(song));}catch{} if (!sameYT) { mountYoutubePlayer(song.videoId); recordHistory(song); } setHero(song); updateUI(); loadRecommendations(); return;
  }
  destroyYoutubePlayer(); cover.hidden = false;
  currentIndex = songs.indexOf(song) > -1 ? songs.indexOf(song) : currentIndex;
  // Phải xác định trước khi gán currentSong: đang mở lại đúng bài đang phát thì giữ nguyên tiến trình.
  const isSameSong = Boolean(audio) && currentSong === song;
  currentSong = song;
  cover.src = song.image;
  title.textContent = song.name;
  artist.textContent = song.author;
  overlay.classList.add('active');
  mini.classList.remove('active'); // ẩn mini-player khi popup player chính đang mở
  document.body.style.overflow = 'hidden';
  loadRecommendations();

  if (isSameSong) {
    updateUI();
  } else {
    playSong(song);
  }
}

function playSong(song) {
  if (!song?.mp3) return;
  if (audio) { audio.pause(); audio.src = ''; }

  audio = new Audio();
  audio.volume = Number(volume.value);
  audio.src = song.mp3;
  currentSong = song;
  try { localStorage.setItem(LAST_SONG_KEY, song.id); } catch {}
  setHero(song);
  recordHistory(song);

  cover.src = song.image;
  title.textContent = song.name;
  artist.textContent = song.author;
  miniCover.src = song.image;
  miniTitle.textContent = song.name;
  miniArtist.textContent = song.author;

  progress.value = 0;
  miniProgress.value = 0;
  currentTime.textContent = '0:00';
  miniCurrent.textContent = '0:00';
  duration.textContent = '0:00';
  miniDuration.textContent = '0:00';
  setRangeFill(progress);
  setRangeFill(miniProgress);

  audio.addEventListener('loadedmetadata', () => {
    progress.max = audio.duration;
    miniProgress.max = audio.duration;
    duration.textContent = formatTime(audio.duration);
    miniDuration.textContent = formatTime(audio.duration);
    setRangeFill(progress);
    setRangeFill(miniProgress);
  });

  audio.addEventListener('timeupdate', () => {
    progress.value = audio.currentTime;
    miniProgress.value = audio.currentTime;
    currentTime.textContent = formatTime(audio.currentTime);
    miniCurrent.textContent = formatTime(audio.currentTime);
    setRangeFill(progress);
    setRangeFill(miniProgress);
  });

  audio.addEventListener('play', updateUI);
  audio.addEventListener('pause', updateUI);
  audio.addEventListener('ended', () => nextSong(true));
  audio.addEventListener('error', () => {
    if (song.isOnline) showToast('Nguồn stream này hiện không phát được. Thử bài khác nhé.', 'error', 4200);
  });


  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(error => {
      console.error('Autoplay bị chặn:', error);
      showToast('Trình duyệt chặn tự động phát, bấm Play để tiếp tục.', 'info', 4000);
    });
  }

  // Chỉ hiện mini-player khi popup player chính đang đóng
  if (!overlay.classList.contains('active')) {
    mini.classList.add('active');
  }
  updateUI();
}

function togglePlay() {
  if (currentSong?.isYouTube) {
    if (!youtubePlayer || !youtubeReady || !window.YT?.PlayerState) return;

    try {
      const state = youtubePlayer.getPlayerState();

      if (
        state === YT.PlayerState.PLAYING ||
        state === YT.PlayerState.BUFFERING
      ) {
        youtubePlayer.pauseVideo();
      } else {
        // Gửi lệnh phát qua YouTube IFrame Player API.
        // YouTube vẫn có thể chặn autoplay theo chính sách trình duyệt.
        youtubePlayer.playVideo();
      }
    } catch (error) {
      console.warn('Không thể điều khiển YouTube Player:', error);
    }
    return;
  }

  if (!audio) {
    if (currentSong) playSong(currentSong);
    return;
  }

  audio.paused ? audio.play() : audio.pause();
}

function updateUI() {
  const playing = currentSong?.isYouTube ? youtubeIsPlaying : Boolean(audio && !audio.paused);
  syncHeroBtn();

  playBtn.querySelector('i').className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  miniPlay.querySelector('i').className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';

  document.querySelectorAll('.playlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
    const icon = el.querySelector('.playlist-status');
    if (icon) icon.className = `playlist-status fa-solid fa-${i === currentIndex && playing ? 'pause' : 'play'}`;
  });
}

function nextSong(auto = false) {
  if (auto && sleepEndOfTrack) { fireSleep(); return; }
  if (!songs.length) return;

  // Repeat 1 bài: khi tự động hết bài thì phát lại chính bài đó
  if (auto && repeatMode === 'one') {
    if (currentSong?.isYouTube && youtubePlayer) { youtubePlayer.seekTo(0, true); youtubePlayer.playVideo(); }
    else playSong(currentSong);
    return;
  }

  // Trộn bài: chọn ngẫu nhiên một bài khác trong danh sách
  if (shuffleMode) {
    if (songs.length === 1) { playSong(currentSong); return; }
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * songs.length);
    } while (randomIndex === currentIndex);
    currentIndex = randomIndex;
    openPlayer(songs[currentIndex]);
    return;
  }

  const isLastSong = currentIndex === songs.length - 1;

  // Hết playlist mà không bật lặp lại -> dừng, không quay vòng
  if (auto && isLastSong && repeatMode === 'off') {
    updateUI();
    return;
  }

  if (songs.length === 1) { playSong(currentSong); return; }

  currentIndex = (currentIndex + 1) % songs.length;
  openPlayer(songs[currentIndex]);
}

function prevSong() {
  if (!songs.length) return;

  if (shuffleMode) {
    if (songs.length === 1) { playSong(currentSong); return; }
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * songs.length);
    } while (randomIndex === currentIndex);
    currentIndex = randomIndex;
    openPlayer(songs[currentIndex]);
    return;
  }

  if (songs.length === 1) { playSong(currentSong); return; }

  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  openPlayer(songs[currentIndex]);
}

function toggleShuffle() {
  shuffleMode = !shuffleMode;
  shuffleBtn.classList.toggle('active', shuffleMode);
  shuffleBtn.title = `Phát ngẫu nhiên: ${shuffleMode ? 'Bật' : 'Tắt'}`;
}

function cycleRepeat() {
  repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';

  repeatBtn.classList.toggle('active', repeatMode !== 'off');
  repeatBtn.classList.toggle('mode-one', repeatMode === 'one');

  const label = repeatMode === 'off' ? 'Tắt' : repeatMode === 'all' ? 'Toàn bộ' : '1 bài';
  repeatBtn.title = `Lặp lại: ${label}`;
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// Tô màu phần đã tua/đã chỉnh của thanh range (progress, volume)
// bằng cách set biến CSS --range-progress theo % giá trị hiện tại.
function setRangeFill(input) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const val = Number(input.value) || 0;
  const percent = max > min ? ((val - min) / (max - min)) * 100 : 0;
  input.style.setProperty('--range-progress', `${percent}%`);
}

function loadRecommendations() {
  recommend.innerHTML = '';
  songs.filter(s => s !== currentSong).slice(0, 8).forEach(song => {
    const item = document.createElement('div');
    item.className = 'player-recommend-item';
    item.innerHTML = `
      <img src="${song.image}" alt="${song.name}">
      <h4>${song.name}</h4>
      <p>${song.author}</p>
    `;
    item.onclick = () => openPlayer(song);
    recommend.appendChild(item);
  });
}

function renderPlaylist() {
  playlistList.innerHTML = '';
  playlistCount.textContent = `${songs.length} bài hát`;

  songs.forEach((song, i) => {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    item.innerHTML = `
      <span class="playlist-number">${i + 1}</span>
      <img src="${song.image}" alt="${song.name}">
      <div class="playlist-info">
        <strong>${song.name}</strong>
        <span>${song.author}</span>
      </div>
      <i class="playlist-status fa-solid fa-play"></i>
      <div class="playlist-item-actions">
        <button class="playlist-add-btn" title="Thêm vào playlist">
          <i class="fa-solid fa-square-plus"></i>
        </button>
        <button class="playlist-delete-btn" title="Xóa bài hát">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    item.onclick = () => {
      currentIndex = i;
      openPlayer(song);
      playlistPanel.classList.remove('active');
    };

    item.querySelector('.playlist-add-btn').onclick = (event) => openAddToPlaylistModal(song, event);
    item.querySelector('.playlist-delete-btn').onclick = (event) => handleDeleteSong(song, event);

    playlistList.appendChild(item);
  });

  updateUI();
}

function closePlayer() {
  // Không hủy trình phát YouTube khi đóng popup: nhạc vẫn chạy nền, mini-player điều khiển tiếp.
  if (cover && !currentSong?.isYouTube) cover.hidden = false;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  if (currentSong) mini.classList.add('active'); // popup đóng thì mini-player mới hiện
  updateUI();
}

progress.oninput = () => { if (audio) audio.currentTime = Number(progress.value); else if (currentSong?.isYouTube && youtubePlayer) youtubePlayer.seekTo(Number(progress.value), true); setRangeFill(progress); };
miniProgress.oninput = () => { if (audio) audio.currentTime = Number(miniProgress.value); else if (currentSong?.isYouTube && youtubePlayer) youtubePlayer.seekTo(Number(miniProgress.value), true); setRangeFill(miniProgress); };
volume.oninput = () => { if (audio) audio.volume = Number(volume.value); else if (currentSong?.isYouTube && youtubePlayer) youtubePlayer.setVolume(Math.round(Number(volume.value) * 100)); setRangeFill(volume); };

// Khởi tạo màu lấp đầy ban đầu cho các thanh range (đặc biệt là volume, mặc định 100%)
setRangeFill(progress);
setRangeFill(miniProgress);
setRangeFill(volume);

playBtn.onclick = togglePlay;
miniPlay.onclick = togglePlay;
nextBtn.onclick = () => nextSong(false);
miniNext.onclick = () => nextSong(false);
prevBtn.onclick = prevSong;
miniPrev.onclick = prevSong;
closeBtn.onclick = closePlayer;
shuffleBtn.onclick = toggleShuffle;
repeatBtn.onclick = cycleRepeat;

miniCover.onclick = miniTitle.onclick = () => { if (currentSong) openPlayer(currentSong); };
miniPlaylistBtn.onclick = () => { closePlaylistDetail(); playlistPanel.classList.toggle('active'); };
playlistClose.onclick = () => playlistPanel.classList.remove('active');

overlay.onclick = e => { if (e.target === overlay) closePlayer(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlayer(); });

loadSongs();


/* ==============================
   MY PLAYLISTS (UI)
================================ */

const createPlaylistBtn = document.querySelector('#createPlaylistBtn');
const myPlaylistsGrid = document.querySelector('#myPlaylistsGrid');
const myPlaylistsEmpty = document.querySelector('#myPlaylistsEmpty');

function renderMyPlaylists() {
  myPlaylistsGrid.innerHTML = '';
  myPlaylistsEmpty.hidden = playlists.length > 0;

  playlists.forEach(playlist => {
    const coverSong = songs.find(s => playlist.songIds.includes(s.id));

    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.innerHTML = `
      <div class="playlist-card-cover">
        ${coverSong ? `<img src="${coverSong.image}" alt="${playlist.name}">` : `<i class="fa-solid fa-music"></i>`}
      </div>
      <div class="playlist-card-info">
        <h3>${playlist.name}</h3>
        <p>${playlist.songIds.length} bài hát</p>
      </div>
      <button class="playlist-card-delete-btn" title="Xóa playlist">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;

    card.onclick = () => openPlaylistDetail(playlist);
    card.querySelector('.playlist-card-delete-btn').onclick = (event) => handleDeletePlaylist(playlist, event);

    myPlaylistsGrid.appendChild(card);
  });
}

async function handleDeletePlaylist(playlist, event) {
  if (event) event.stopPropagation();

  const confirmed = await showConfirmToast(`Xóa playlist "${playlist.name}"?`);
  if (!confirmed) return;

  try {
    await deletePlaylistRecord(playlist.id);
    playlists = playlists.filter(p => p.id !== playlist.id);
    renderMyPlaylists();
    closePlaylistDetail();
    showToast(`Đã xóa playlist "${playlist.name}"`, 'success');
  } catch (error) {
    console.error("Xóa playlist:", error);
    showToast("Không thể xóa playlist. Vui lòng thử lại.", 'error');
  }
}


/* -- Modal: tạo playlist mới -- */

const createPlaylistModal = document.createElement("div");
createPlaylistModal.className = "upload-modal";
createPlaylistModal.innerHTML = `
  <div class="upload-box">
    <button class="upload-close" id="playlistNameClose">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="upload-heading">
      <span>NEW PLAYLIST</span>
      <h2>Tạo playlist mới</h2>
      <p>Đặt tên cho playlist của bạn.</p>
    </div>

    <form id="playlistNameForm">
      <label class="upload-field">
        <span>Tên playlist</span>
        <input id="playlistNameInput" type="text" placeholder="VD: Nhạc chill cuối tuần" maxlength="60" required>
      </label>

      <button class="upload-submit" type="submit">
        <i class="fa-solid fa-plus"></i>
        Tạo playlist
      </button>
    </form>
  </div>
`;
document.body.appendChild(createPlaylistModal);

const playlistNameClose = createPlaylistModal.querySelector('#playlistNameClose');
const playlistNameForm = createPlaylistModal.querySelector('#playlistNameForm');
const playlistNameInput = createPlaylistModal.querySelector('#playlistNameInput');

function openCreatePlaylistModal() {
  playlistNameInput.value = '';
  createPlaylistModal.classList.add('active');
  setTimeout(() => playlistNameInput.focus(), 60);
}

function closeCreatePlaylistModal() {
  createPlaylistModal.classList.remove('active');
}

createPlaylistBtn.onclick = openCreatePlaylistModal;
playlistNameClose.onclick = closeCreatePlaylistModal;
createPlaylistModal.addEventListener('click', e => { if (e.target === createPlaylistModal) closeCreatePlaylistModal(); });

playlistNameForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = playlistNameInput.value.trim();
  if (!name) return;

  try {
    const newPlaylist = { id: `pl-${Date.now()}`, name, songIds: [], createdAt: Date.now() };
    await savePlaylistRecord(newPlaylist);
    playlists.push(newPlaylist);
    renderMyPlaylists();
    closeCreatePlaylistModal();
    showToast(`Đã tạo playlist "${name}"`, 'success');
  } catch (error) {
    console.error("Tạo playlist:", error);
    showToast("Không thể tạo playlist. Vui lòng thử lại.", 'error');
  }
});


/* -- Modal: thêm bài hát vào playlist -- */

const addToPlaylistModal = document.createElement("div");
addToPlaylistModal.className = "upload-modal";
addToPlaylistModal.innerHTML = `
  <div class="upload-box">
    <button class="upload-close" id="addToPlaylistClose">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="upload-heading">
      <span>ADD TO PLAYLIST</span>
      <h2>Thêm vào playlist</h2>
      <p id="addToPlaylistSongName"></p>
    </div>

    <div class="add-to-playlist-list" id="addToPlaylistList"></div>

    <button class="upload-submit" id="addToPlaylistCreateBtn" type="button">
      <i class="fa-solid fa-plus"></i>
      Tạo playlist mới
    </button>
  </div>
`;
document.body.appendChild(addToPlaylistModal);

const addToPlaylistClose = addToPlaylistModal.querySelector('#addToPlaylistClose');
const addToPlaylistSongName = addToPlaylistModal.querySelector('#addToPlaylistSongName');
const addToPlaylistList = addToPlaylistModal.querySelector('#addToPlaylistList');
const addToPlaylistCreateBtn = addToPlaylistModal.querySelector('#addToPlaylistCreateBtn');

let addToPlaylistTargetSong = null;

function renderAddToPlaylistList() {
  addToPlaylistList.innerHTML = '';

  if (!playlists.length) {
    addToPlaylistList.innerHTML = `<p class="add-to-playlist-empty">Bạn chưa có playlist nào. Tạo playlist mới bên dưới nhé!</p>`;
    return;
  }

  playlists.forEach(playlist => {
    const inPlaylist = playlist.songIds.includes(addToPlaylistTargetSong.id);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = `add-to-playlist-row${inPlaylist ? ' checked' : ''}`;
    row.innerHTML = `
      <i class="fa-solid ${inPlaylist ? 'fa-square-check' : 'fa-square'}"></i>
      <span>${playlist.name}</span>
      <small>${playlist.songIds.length} bài</small>
    `;
    row.onclick = () => toggleSongInPlaylist(playlist, addToPlaylistTargetSong, row);

    addToPlaylistList.appendChild(row);
  });
}

function openAddToPlaylistModal(song, event) {
  if (event) event.stopPropagation();
  addToPlaylistTargetSong = song;
  addToPlaylistSongName.textContent = `${song.name} • ${song.author}`;
  renderAddToPlaylistList();
  addToPlaylistModal.classList.add('active');
}

function closeAddToPlaylistModal() {
  addToPlaylistModal.classList.remove('active');
  addToPlaylistTargetSong = null;
}

addToPlaylistClose.onclick = closeAddToPlaylistModal;
addToPlaylistModal.addEventListener('click', e => { if (e.target === addToPlaylistModal) closeAddToPlaylistModal(); });

addToPlaylistCreateBtn.onclick = () => {
  closeAddToPlaylistModal();
  openCreatePlaylistModal();
};

async function toggleSongInPlaylist(playlist, song, rowEl) {
  const has = playlist.songIds.includes(song.id);

  try {
    playlist.songIds = has
      ? playlist.songIds.filter(id => id !== song.id)
      : [...playlist.songIds, song.id];

    await savePlaylistRecord(playlist);

    rowEl.classList.toggle('checked', !has);
    rowEl.querySelector('i').className = `fa-solid ${!has ? 'fa-square-check' : 'fa-square'}`;
    rowEl.querySelector('small').textContent = `${playlist.songIds.length} bài`;

    renderMyPlaylists();

    if (playlistDetailState.playlist && playlistDetailState.playlist.id === playlist.id) {
      renderPlaylistDetailList();
    }

    showToast(has ? `Đã bỏ khỏi "${playlist.name}"` : `Đã thêm vào "${playlist.name}"`, 'success', 1800);
  } catch (error) {
    console.error("Cập nhật playlist:", error);
    showToast("Không thể cập nhật playlist. Vui lòng thử lại.", 'error');
  }
}


/* -- Panel: chi tiết 1 playlist -- */

const playlistDetailPanel = document.createElement('div');
playlistDetailPanel.className = 'playlist-panel playlist-detail-panel';
playlistDetailPanel.innerHTML = `
  <div class="playlist-header">
    <div>
      <h3 id="playlistDetailName">Playlist</h3>
      <span id="playlistDetailCount">0 bài hát</span>
    </div>
    <div class="playlist-detail-actions">
      <button id="playlistDetailDelete" title="Xóa playlist">
        <i class="fa-solid fa-trash"></i>
      </button>
      <button id="playlistDetailClose">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  </div>
  <div class="playlist-list" id="playlistDetailList"></div>
`;
document.body.appendChild(playlistDetailPanel);

const playlistDetailName = playlistDetailPanel.querySelector('#playlistDetailName');
const playlistDetailCount = playlistDetailPanel.querySelector('#playlistDetailCount');
const playlistDetailList = playlistDetailPanel.querySelector('#playlistDetailList');
const playlistDetailDelete = playlistDetailPanel.querySelector('#playlistDetailDelete');
const playlistDetailClose = playlistDetailPanel.querySelector('#playlistDetailClose');

const playlistDetailState = { playlist: null };

function renderPlaylistDetailList() {
  const currentPlaylist = playlistDetailState.playlist;
  if (!currentPlaylist) return;

  const playlistSongs = currentPlaylist.songIds
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean);

  playlistDetailName.textContent = currentPlaylist.name;
  playlistDetailCount.textContent = `${playlistSongs.length} bài hát`;
  playlistDetailList.innerHTML = '';

  if (!playlistSongs.length) {
    playlistDetailList.innerHTML = `
      <p class="add-to-playlist-empty">
        Playlist chưa có bài hát nào. Bấm nút <i class="fa-solid fa-square-plus"></i> trên bài hát để thêm vào đây.
      </p>
    `;
    return;
  }

  playlistSongs.forEach((song, i) => {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    item.innerHTML = `
      <span class="playlist-number">${i + 1}</span>
      <img src="${song.image}" alt="${song.name}">
      <div class="playlist-info">
        <strong>${song.name}</strong>
        <span>${song.author}</span>
      </div>
      <button class="playlist-delete-btn" title="Bỏ khỏi playlist">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    item.onclick = () => {
      const globalIndex = songs.indexOf(song);
      if (globalIndex > -1) currentIndex = globalIndex;
      openPlayer(song);
    };

    item.querySelector('.playlist-delete-btn').onclick = async (event) => {
      event.stopPropagation();

      try {
        currentPlaylist.songIds = currentPlaylist.songIds.filter(id => id !== song.id);
        await savePlaylistRecord(currentPlaylist);
        renderPlaylistDetailList();
        renderMyPlaylists();
        showToast(`Đã bỏ "${song.name}" khỏi "${currentPlaylist.name}"`, 'success', 1800);
      } catch (error) {
        console.error("Cập nhật playlist:", error);
        showToast("Không thể cập nhật playlist. Vui lòng thử lại.", 'error');
      }
    };

    playlistDetailList.appendChild(item);
  });
}

function openPlaylistDetail(currentPlaylist) {
  playlistPanel.classList.remove('active');
  playlistDetailState.playlist = currentPlaylist;
  renderPlaylistDetailList();
  playlistDetailPanel.classList.add('active');
}

function closePlaylistDetail() {
  playlistDetailPanel.classList.remove('active');
  playlistDetailState.playlist = null;
}

playlistDetailClose.onclick = closePlaylistDetail;
playlistDetailDelete.onclick = (event) => {
  if (playlistDetailState.playlist) handleDeletePlaylist(playlistDetailState.playlist, event);
};


/* ==============================
   HAMBURGER NAVBAR
================================ */

const navbar = document.querySelector(".navbar");
const links = document.querySelector(".links");

const hamburger = document.createElement("button");
hamburger.className = "hamburger-btn";
hamburger.innerHTML = `<i class="fa-solid fa-bars"></i>`;
hamburger.setAttribute("aria-label", "Mở menu");
navbar.appendChild(hamburger);

const mobileMenu = document.createElement("div");
mobileMenu.className = "mobile-menu";
mobileMenu.innerHTML = `
  <a href="#">Home</a>
  <a href="#">About</a>
  <a href="#">Original</a>
  <a href="#myPlaylistsSection">Playlists</a>
  <button id="openUploadBtn">
    <i class="fa-solid fa-cloud-arrow-up"></i>
    Đăng nhạc
  </button>
`;
document.body.appendChild(mobileMenu);

hamburger.addEventListener("click", () => {
  mobileMenu.classList.toggle("active");
  const icon = hamburger.querySelector("i");
  icon.className = mobileMenu.classList.contains("active")
    ? "fa-solid fa-xmark"
    : "fa-solid fa-bars";
});

mobileMenu.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => mobileMenu.classList.remove("active"));
});


/* ==============================
   UPLOAD MUSIC MODAL
================================ */

const uploadModal = document.createElement("div");
uploadModal.className = "upload-modal";
uploadModal.innerHTML = `
  <div class="upload-box">
    <button class="upload-close" id="uploadClose">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="upload-heading">
      <span>MUSIC UPLOAD</span>
      <h2>Đăng bài hát</h2>
      <p>Thêm nhạc local vào playlist của bạn.</p>
    </div>

    <form id="uploadForm">
      <label class="upload-field">
        <span>Tên bài hát</span>
        <input id="uploadTitle" type="text" placeholder="Nhập tên bài hát" required>
      </label>

      <label class="upload-field">
        <span>Tác giả</span>
        <input id="uploadAuthor" type="text" placeholder="Nhập tên tác giả" required>
      </label>

      <label class="upload-field">
        <span>Ảnh bìa</span>
        <input id="uploadImage" type="file" accept="image/*" required>
      </label>

      <label class="upload-field">
        <span>File nhạc</span>
        <input id="uploadAudio" type="file" accept="audio/*" required>
      </label>

      <button class="upload-submit" type="submit">
        <i class="fa-solid fa-plus"></i>
        Thêm vào playlist
      </button>
    </form>
  </div>
`;
document.body.appendChild(uploadModal);

const uploadClose = document.querySelector("#uploadClose");
const uploadForm = document.querySelector("#uploadForm");
const openUploadBtn = document.querySelector("#openUploadBtn");

function openUpload() {
  mobileMenu.classList.remove("active");
  hamburger.querySelector("i").className = "fa-solid fa-bars";
  location.hash = 'profile';
}

function closeUpload() {
  uploadModal.classList.remove("active");
}

openUploadBtn.addEventListener("click", openUpload);
uploadClose.addEventListener("click", closeUpload);

uploadModal.addEventListener("click", event => {
  if (event.target === uploadModal) closeUpload();
});

uploadForm.addEventListener("submit", async event => {
  event.preventDefault();

  const titleInput = document.querySelector("#uploadTitle");
  const authorInput = document.querySelector("#uploadAuthor");
  const imageInput = document.querySelector("#uploadImage");
  const audioInput = document.querySelector("#uploadAudio");

  const titleValue = titleInput.value.trim();
  const authorValue = authorInput.value.trim();
  const imageFile = imageInput.files[0];
  const audioFile = audioInput.files[0];

  if (!titleValue || !authorValue || !imageFile || !audioFile) return;

  try {
    const id = `local-${Date.now()}`;

    await saveUploadedSong({
      id,
      name: titleValue,
      author: authorValue,
      image: imageFile,
      audio: audioFile
    });

    const song = {
      id,
      name: titleValue,
      author: authorValue,
      image: URL.createObjectURL(imageFile),
      mp3: URL.createObjectURL(audioFile),
      local: true
    };

    songs.push(song);

    renderSongs();
    renderPlaylist();
    renderProfileSongs();

    uploadForm.reset();
    closeUpload();

    currentIndex = songs.length - 1;
    openPlayer(song);
    showToast(`Đã thêm "${song.name}" vào playlist`, 'success');

  } catch (error) {
    console.error("Upload:", error);
    showToast("Không thể thêm bài hát.", 'error');
  }
});

// Cho phép nút Đăng nhạc xuất hiện cả trên desktop.
const desktopUpload = document.createElement("button");
desktopUpload.className = "desktop-upload-btn";
desktopUpload.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Đăng nhạc`;
navbar.insertBefore(desktopUpload, document.querySelector(".avatar"));
desktopUpload.addEventListener("click", openUpload);


loading.style.display = 'none'

/* ==============================
   GIAO DIỆN ĐIỆN THOẠI: HERO "CONTINUE" + TAB BAR
================================ */

const LAST_SONG_KEY = 'albumLastSongId';
const LAST_YOUTUBE_SONG_KEY = 'dreamerLastYoutubeSong';
let heroSong = null;

function setHero(song) {
  if (!song) return;
  heroSong = song;
  document.querySelector('.hero').style.setProperty('--hero-img', `url("${song.image}")`);
  document.documentElement.style.setProperty('--hero-img', `url("${song.image}")`);   // nền kính lấy màu từ ảnh bìa
  document.querySelector('#heroTitle').textContent = song.name;
  syncHeroBtn();
}

// Bài nghe gần nhất: bài local tìm trong thư viện; bài YouTube lấy từ bản đã lưu
function getLastSong() {
  const id = localStorage.getItem(LAST_SONG_KEY);
  const local = songs.find(s => s.id === id);
  if (local) return local;
  try {
    const yt = JSON.parse(localStorage.getItem(LAST_YOUTUBE_SONG_KEY) || 'null');
    if (yt && yt.id === id && yt.videoId) return { ...yt, image: fixThumb(yt.image) };
  } catch {}
  return songs[0];
}

function syncHeroBtn() {
  const btn = document.querySelector('#heroPlay');
  if (!btn) return;
  const sameSong = Boolean(heroSong) && currentSong?.id === heroSong.id;
  const playing = sameSong && (Boolean(audio && !audio.paused) || Boolean(heroSong.isYouTube && youtubeIsPlaying));
  btn.querySelector('i').className = `fa-solid fa-${playing ? 'pause' : 'play'}`;
  btn.querySelector('span').textContent = playing ? 'Pause' : 'Play';
}

document.querySelector('#heroPlay').onclick = () => {
  if (!heroSong) return;
  if (currentSong?.id === heroSong.id && (audio || youtubePlayer)) { togglePlay(); return; }
  if (heroSong.isYouTube) { playOnlineSong(heroSong, { background: true }); return; }
  currentIndex = songs.indexOf(heroSong);
  playSong(heroSong);
};

const tabbar = document.createElement('nav');
tabbar.className = 'tabbar';
tabbar.innerHTML = `
  <button data-tab="home" class="active" aria-label="Trang chủ"><i class="fa-solid fa-house"></i></button>
  <button data-tab="search" aria-label="Tìm kiếm"><i class="fa-solid fa-magnifying-glass"></i></button>
  <button data-tab="playlists" aria-label="Playlist"><i class="fa-solid fa-layer-group"></i></button>
  <button data-tab="profile" aria-label="Hồ sơ"><i class="fa-solid fa-user"></i></button>
`;
document.body.appendChild(tabbar);

/* ==============================
   CÁC TRANG: Home / Search / Playlists / Profile
================================ */

const profileSection = document.createElement('section');
profileSection.className = 'section profile';
profileSection.id = 'profileSection';
profileSection.innerHTML = `
  <div class="profile-head">
    <div class="profile-avatar"><i class="fa-solid fa-user"></i></div>
    <div><h2>Hồ sơ của bạn</h2><p id="profileStats"></p></div>
  </div>
  <div id="profileUploadSlot"></div>
  <div class="section-title">
    <h2>Thư viện MP3</h2>
    <button class="section-title-action" id="exportJsonBtn" type="button"><i class="fa-solid fa-file-export"></i> Xuất file.json</button>
  </div>
  <div id="profileSongs"></div>
`;
document.querySelector('.main').appendChild(profileSection);
document.querySelector('#profileUploadSlot').appendChild(uploadModal.querySelector('.upload-box'));

document.querySelectorAll('.main > *').forEach(el => {
  if (el === loading || el === empty) return;
  el.dataset.page = el.matches('.search-section, .category-header, .category') ? 'search'
    : el.matches('#myPlaylistsSection') ? 'playlists'
    : el.matches('#profileSection') ? 'profile' : 'home';
});

const PAGE_NAMES = ['home', 'search', 'playlists', 'profile'];

function showPage(page) {
  if (!PAGE_NAMES.includes(page)) page = 'home';
  document.querySelectorAll('.main > [data-page]').forEach(el => el.classList.toggle('page-off', el.dataset.page !== page));
  tabbar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === page));
  window.scrollTo({ top: 0 });
  if (page === 'profile') renderProfileSongs();
  if (page === 'search') setTimeout(() => { if (location.hash === '#search') document.querySelector('#searchInput')?.focus({ preventScroll: true }); }, 700);
}

tabbar.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  tabbar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));   // viên kính bắt đầu trượt ngay
  location.hash = btn.dataset.tab;
});
// Đổi nội dung (ẩn/hiện cả trang, cuộn lên đầu) hơi trễ để không chiếm luồng chính lúc viên kính đang bắt đầu trượt
window.addEventListener('hashchange', () => setTimeout(() => showPage(location.hash.slice(1)), 90));

/* ---------- Thư viện MP3: tải xuống + xuất file.json ---------- */

function slugify(t) {
  return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bai-hat';
}

function extFromMime(mime, fallback) {
  const sub = (mime || '').split('/')[1];
  if (!sub) return fallback;
  return ({ mpeg: 'mp3', mp4: 'm4a', 'x-m4a': 'm4a', jpeg: 'jpg', 'x-wav': 'wav' })[sub] || sub;
}

async function blobExt(url, fallback) {
  try { return extFromMime((await (await fetch(url)).blob()).type, fallback); } catch { return fallback; }
}

function saveFile(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

async function downloadSong(song) {
  const ext = song.local ? await blobExt(song.mp3, 'mp3') : (song.mp3.split('.').pop() || 'mp3');
  saveFile(song.mp3, `${slugify(song.name)}.${ext}`);
}

async function exportJson() {
  const out = [];
  for (const song of songs.filter(x => !x.isYouTube)) {
    if (song.local) {
      const slug = slugify(song.name);
      const [audioExt, imageExt] = await Promise.all([blobExt(song.mp3, 'mp3'), blobExt(song.image, 'jpg')]);
      out.push({ image: `./img/${slug}.${imageExt}`, name: song.name, author: song.author, mp3: `./mp3/${slug}.${audioExt}` });
    } else {
      out.push({ image: song.image, name: song.name, author: song.author, mp3: song.mp3 });
    }
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  saveFile(url, 'file.json');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Đã xuất file.json. Chép file mp3/ảnh vào đúng thư mục rồi thay file.json.', 'success');
}

function renderProfileSongs() {
  const box = document.querySelector('#profileSongs');
  const list = songs.filter(x => !x.isYouTube);
  document.querySelector('#profileStats').textContent = `${list.filter(x => x.local).length} bài đã đăng · ${list.length} bài trong thư viện`;
  box.innerHTML = '';
  list.forEach(song => {
    const row = document.createElement('div');
    row.className = 'lib-row';
    row.innerHTML = `<img alt=""><div class="lib-info"><h3></h3><p></p></div>
      <button data-act="play" aria-label="Phát"><i class="fa-solid fa-play"></i></button>
      <button data-act="mp3" aria-label="Tải MP3"><i class="fa-solid fa-download"></i></button>
      ${song.local ? '<button data-act="cover" aria-label="Tải ảnh bìa"><i class="fa-regular fa-image"></i></button>' : ''}`;
    row.querySelector('img').src = song.image;
    row.querySelector('h3').textContent = song.name;
    row.querySelector('p').textContent = song.author;
    row.onclick = async e => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'play') { currentIndex = songs.indexOf(song); openPlayer(song); }
      if (act === 'mp3') downloadSong(song);
      if (act === 'cover') saveFile(song.image, `${slugify(song.name)}.${await blobExt(song.image, 'jpg')}`);
    };
    box.appendChild(row);
  });
}

document.querySelector('#exportJsonBtn').onclick = exportJson;
showPage(location.hash.slice(1));


/* ==============================
   TỰ ĐỘNG TÌM + GỢI Ý KHI GÕ
================================ */

const searchCache = new Map();   // cùng từ khóa thì không gọi lại API (tiết kiệm quota)
let searchSeq = 0;               // bỏ kết quả của lần tìm cũ nếu đã gõ tiếp
const RECENT_KEY = 'dreamerRecentSearches';

const suggestBox = document.createElement('div');
suggestBox.className = 'suggestions';
document.querySelector('.search-box').appendChild(suggestBox);

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function rememberSearch(keyword) {
  try {
    const list = [keyword, ...getRecent().filter(x => x.toLowerCase() !== keyword.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

function runSearch(keyword) {
  searchInput.value = keyword;
  searchOnlineMusic(keyword);
}

function renderSuggestions() {
  const q = searchInput.value.trim().toLowerCase();
  const recent = row => ({ icon: true, title: row, sub: 'Tìm gần đây', run: () => runSearch(row) });
  const items = [];

  if (!q) {
    getRecent().forEach(k => items.push(recent(k)));
  } else {
    const recentMatches = getRecent().filter(k => k.toLowerCase().includes(q) && k.toLowerCase() !== q).slice(0, 2);
    recentMatches.forEach(k => items.push(recent(k)));
    if (remoteQuery === searchInput.value.trim()) {
      const seen = new Set([q, ...recentMatches.map(k => k.toLowerCase())]);
      remoteSuggestions.filter(t => !seen.has(t.toLowerCase())).slice(0, 6)
        .forEach(t => items.push({ icon: 'fa-magnifying-glass', title: t, sub: '', run: () => runSearch(t) }));
    }
    songs.filter(s => !s.isYouTube && `${s.name} ${s.author}`.toLowerCase().includes(q)).slice(0, 4)
      .forEach(s => items.push({
        img: s.image, title: s.name, sub: `${s.author} · Trong thư viện`,
        run: () => { currentIndex = songs.indexOf(s); openPlayer(s); }
      }));
  }

  suggestBox.innerHTML = '';
  items.forEach(it => {
    const row = document.createElement('div');
    row.className = 'suggestion-item';
    row.innerHTML = `${it.img ? '<img alt="">' : `<i class="fa-solid ${it.icon || 'fa-clock-rotate-left'}"></i>`}
      <div class="suggestion-info"><strong></strong><span></span></div>`;
    if (it.img) row.querySelector('img').src = it.img;
    setHighlighted(row.querySelector('strong'), it.title, searchInput.value.trim());
    row.querySelector('span').textContent = it.sub;
    row.onclick = () => { suggestBox.classList.remove('open'); it.run(); };
    suggestBox.appendChild(row);
  });
  suggestBox.classList.toggle('open', items.length > 0);
}

// Gõ xong ~1 giây (từ 3 ký tự trở lên) thì tự tìm trên YouTube
let autoSearchTimer;
function clearSearchResults() {
  searchSeq++;
  searchResultSection.hidden = true;
  searchResults.innerHTML = '';
  empty.hidden = true;
  document.body.classList.remove('is-searching');
}

searchInput.addEventListener('input', () => {
  renderSuggestions();
  scheduleRemoteSuggestions();
  clearTimeout(autoSearchTimer);
  if (!searchInput.value.trim()) clearSearchResults();
  const keyword = searchInput.value.trim();
  if (keyword.length >= 3) autoSearchTimer = setTimeout(() => searchOnlineMusic(keyword, true), 900);
});
searchInput.addEventListener('focus', renderSuggestions);
searchInput.addEventListener('blur', () => setTimeout(() => suggestBox.classList.remove('open'), 250));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { clearTimeout(autoSearchTimer); suggestBox.classList.remove('open'); }
});


/* ==============================
   LỊCH SỬ NGHE (Home) · THỜI GIAN NGHE + HẸN GIỜ NGỦ (Profile)
================================ */

/* ---------- Lịch sử nghe gần đây ---------- */
const HISTORY_KEY = 'dreamerHistory';

const historySection = document.createElement('section');
historySection.className = 'section';
historySection.id = 'historySection';
historySection.dataset.page = 'home';
historySection.setAttribute('data-empty', '');
historySection.innerHTML = `
  <div class="section-title">
    <h2>Nghe gần đây</h2>
    <button class="section-title-action" id="clearHistoryBtn" type="button">Xóa</button>
  </div>
  <div class="song-grid" id="historyRow"></div>
`;
document.querySelector('.hero').after(historySection);

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function recordHistory(song) {
  if (!song) return;
  // Bài local lưu id (tìm lại trong thư viện); bài YouTube lưu đủ thông tin vì không có sẵn trong thư viện
  const entry = song.isYouTube
    ? { id: song.id, yt: { id: song.id, videoId: song.videoId, name: song.name, author: song.author, image: song.image, duration: 0, isYouTube: true, isOnline: true, source: 'YouTube' } }
    : { id: song.id };
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...getHistory().filter(e => e.id !== song.id)].slice(0, 12)));
  } catch {}
  renderHistory();
}

function renderHistory() {
  const row = document.querySelector('#historyRow');
  const list = getHistory().map(e => e.yt ? { ...e.yt, image: fixThumb(e.yt.image) } : songs.find(s => s.id === e.id)).filter(Boolean);
  historySection.toggleAttribute('data-empty', !list.length);
  row.innerHTML = '';
  list.forEach(song => {
    const card = document.createElement('div');
    card.className = 'song-card hist-card';
    card.innerHTML = '<img alt=""><div class="song-card-info"><h3></h3><p></p></div>';
    card.querySelector('img').src = song.image;
    card.querySelector('h3').textContent = song.name;
    card.querySelector('p').textContent = song.author;
    card.onclick = () => {
      if (song.isYouTube) { playOnlineSong(song); return; }
      currentIndex = songs.indexOf(song);
      openPlayer(song);
    };
    row.appendChild(card);
  });
}

document.querySelector('#clearHistoryBtn').onclick = () => {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
  renderHistory();
};

/* ---------- Thống kê thời gian nghe + Hẹn giờ ngủ (trang Hồ sơ) ---------- */
const LISTEN_KEY = 'dreamerListenStats';
let sleepAt = 0;
let sleepEndOfTrack = false;

document.querySelector('.profile-head').insertAdjacentHTML('afterend', `
  <div class="listen-stats">
    <div><strong id="statToday">0 phút</strong><span>Hôm nay</span></div>
    <div><strong id="statWeek">0 phút</strong><span>7 ngày qua</span></div>
    <div><strong id="statTotal">0 phút</strong><span>Tổng cộng</span></div>
  </div>
  <div class="profile-card" id="sleepCard">
    <div class="profile-card-title"><span><i class="fa-solid fa-moon"></i> Hẹn giờ ngủ</span><em id="sleepStatus">Đang tắt</em></div>
    <div class="sleep-options">
      <button type="button" data-sleep="15">15 phút</button>
      <button type="button" data-sleep="30">30 phút</button>
      <button type="button" data-sleep="45">45 phút</button>
      <button type="button" data-sleep="60">60 phút</button>
      <button type="button" data-sleep="track">Hết bài này</button>
      <button type="button" data-sleep="0">Tắt</button>
    </div>
  </div>
`);

let listen = (() => {
  try { return { total: 0, days: {}, ...JSON.parse(localStorage.getItem(LISTEN_KEY) || '{}') }; }
  catch { return { total: 0, days: {} }; }
})();

const dayKey = d => d.toLocaleDateString('en-CA');   // YYYY-MM-DD theo giờ máy

function saveListen() {
  const keys = Object.keys(listen.days).sort().slice(-60);
  listen.days = Object.fromEntries(keys.map(k => [k, listen.days[k]]));
  try { localStorage.setItem(LISTEN_KEY, JSON.stringify(listen)); } catch {}
}

function fmtListen(sec) {
  const m = Math.floor(sec / 60);
  if (m < 1) return `${Math.floor(sec)} giây`;
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}

function renderListenStats() {
  let week = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    week += listen.days[dayKey(d)] || 0;
  }
  document.querySelector('#statToday').textContent = fmtListen(listen.days[dayKey(new Date())] || 0);
  document.querySelector('#statWeek').textContent = fmtListen(week);
  document.querySelector('#statTotal').textContent = fmtListen(listen.total);
}

function isPlayingNow() {
  return Boolean(audio && !audio.paused) || Boolean(currentSong?.isYouTube && youtubeIsPlaying);
}

function pauseAll() {
  if (audio && !audio.paused) audio.pause();
  if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') youtubePlayer.pauseVideo();
  updateUI();
}

function renderSleep() {
  const status = document.querySelector('#sleepStatus');
  if (sleepAt) {
    const left = Math.max(0, Math.round((sleepAt - Date.now()) / 1000));
    status.textContent = `Dừng sau ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  } else {
    status.textContent = sleepEndOfTrack ? 'Dừng khi hết bài' : 'Đang tắt';
  }
}

function setSleep(value) {
  sleepAt = 0; sleepEndOfTrack = false;
  if (value === 'track') {
    sleepEndOfTrack = true;
    showToast('Nhạc sẽ dừng khi hết bài đang phát.', 'success');
  } else if (Number(value) > 0) {
    sleepAt = Date.now() + Number(value) * 60000;
    showToast(`Nhạc sẽ tự dừng sau ${value} phút.`, 'success');
  }
  document.querySelectorAll('[data-sleep]').forEach(b => b.classList.toggle('active', b.dataset.sleep === String(value) && value !== '0'));
  renderSleep();
}

function fireSleep() {
  sleepAt = 0; sleepEndOfTrack = false;
  document.querySelectorAll('[data-sleep]').forEach(b => b.classList.remove('active'));
  pauseAll();
  renderSleep();
  showToast('Đến giờ ngủ rồi, mình đã dừng nhạc. Ngủ ngon nhé!', 'success', 6000);
}

document.querySelector('#sleepCard').addEventListener('click', e => {
  const btn = e.target.closest('[data-sleep]');
  if (btn) setSleep(btn.dataset.sleep);
});

// Mỗi giây: cộng thời gian đang nghe, kiểm tra hẹn giờ. Dùng mốc thời gian thật để không hụt khi tab bị trình duyệt làm chậm.
let lastTick = Date.now();
let tickCount = 0;
setInterval(() => {
  const now = Date.now();
  const delta = Math.min((now - lastTick) / 1000, 90);
  lastTick = now;
  if (isPlayingNow()) {
    listen.total += delta;
    const key = dayKey(new Date());
    listen.days[key] = (listen.days[key] || 0) + delta;
    if (++tickCount % 10 === 0) saveListen();
  }
  if (sleepAt && now >= sleepAt) fireSleep();
  if (location.hash === '#profile') { renderListenStats(); renderSleep(); }
}, 1000);
window.addEventListener('pagehide', saveListen);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveListen(); });

renderListenStats();
renderSleep();
renderHistory();
showPage(location.hash.slice(1));


/* ==============================
   THANH TRÊN CÙNG: LOGO + CHỮ TÊN TRANG HIỆN DẦN KHI CUỘN
================================ */

const TOP_TITLES = { home: 'Home', search: 'Search', playlists: 'Playlists', profile: 'Profile' };

const topbar = document.createElement('header');
topbar.className = 'topbar';
topbar.innerHTML = `
  <button class="topbar-logo" type="button" aria-label="Về trang chủ"><img src="./logo.svg" alt="DREAMER"></button>
  <span class="topbar-title"></span>
  <button class="topbar-avatar" type="button" aria-label="Hồ sơ"><i class="fa-solid fa-user"></i><img alt="" hidden></button>
`;
document.body.appendChild(topbar);

const topbarTitle = topbar.querySelector('.topbar-title');

topbar.querySelector('.topbar-logo').onclick = () => {
  if (!location.hash || location.hash === '#home') window.scrollTo({ top: 0, behavior: 'smooth' });
  else location.hash = 'home';
};

const topbarLogo = topbar.querySelector('.topbar-logo');
const topbarAvatar = topbar.querySelector('.topbar-avatar');

function onTopbarScroll() {
  const y = window.scrollY;

  // Chữ tên trang: dưới 30px ẩn; từ 30px hiện mờ mờ (25%) rồi rõ dần tới 100% ở khoảng 100px.
  const t = y < 30 ? 0 : 0.25 + 0.75 * Math.min(1, (y - 30) / 70);
  topbarTitle.style.opacity = t;
  topbarTitle.style.transform = `translateY(${(1 - t) * 6}px)`;

  // Logo to: kéo xuống 40px thì mờ hẳn, thu nhỏ và nhích lên rồi biến mất.
  const k = Math.min(1, y / 40);
  topbarLogo.style.opacity = 1 - k;
  topbarLogo.style.transform = `scale(${1 - 0.3 * k}) translateY(${-6 * k}px)`;
  topbarLogo.style.pointerEvents = k >= 1 ? 'none' : 'auto';
  topbarAvatar.style.opacity = 1 - k;
  topbarAvatar.style.transform = `scale(${1 - 0.3 * k}) translateY(${-6 * k}px)`;
  topbarAvatar.style.pointerEvents = k >= 1 ? 'none' : 'auto';

  // Lớp blur lan xuống nội dung bên dưới, đậm dần theo độ cuộn.
  topbar.style.setProperty('--blur-o', k);
}

function updateTopbar() {
  const hash = location.hash.slice(1);
  const page = PAGE_NAMES.includes(hash) ? hash : 'home';
  document.body.dataset.page = page;
  topbarTitle.textContent = TOP_TITLES[page];
  onTopbarScroll();
}

let topbarFrame = 0;
window.addEventListener('scroll', () => {
  if (!topbarFrame) topbarFrame = requestAnimationFrame(() => { topbarFrame = 0; onTopbarScroll(); });
}, { passive: true });
window.addEventListener('hashchange', updateTopbar);
updateTopbar();


/* ==============================
   HỒ SƠ: ĐỔI ẢNH ĐẠI DIỆN + TÊN
================================ */

const PROFILE_KEY = 'dreamerProfile';

const profileHead = document.querySelector('.profile-head');
profileHead.querySelector('.profile-avatar').outerHTML = `
  <button class="profile-avatar" id="avatarBtn" type="button" aria-label="Đổi ảnh đại diện">
    <i class="fa-solid fa-user"></i><img alt="" hidden>
    <span class="avatar-badge"><i class="fa-solid fa-camera"></i></span>
  </button>
  <input type="file" id="avatarInput" accept="image/*" hidden>`;
profileHead.querySelector('h2').outerHTML =
  '<input class="profile-name" id="profileName" type="text" maxlength="24" placeholder="Nhập tên của bạn" autocomplete="off">';

const avatarInput = document.querySelector('#avatarInput');
const profileName = document.querySelector('#profileName');

function getProfile() {
  try { return { name: '', avatar: '', ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }; }
  catch { return { name: '', avatar: '' }; }
}

function saveProfile(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
  catch { showToast('Không lưu được hồ sơ (bộ nhớ trình duyệt đầy).', 'error'); }
}

function applyProfile() {
  const profile = getProfile();
  document.querySelectorAll('.profile-avatar, .topbar-avatar').forEach(box => {
    const img = box.querySelector('img');
    const icon = box.querySelector(':scope > i');
    if (profile.avatar) img.src = profile.avatar;
    img.hidden = !profile.avatar;
    icon.hidden = Boolean(profile.avatar);
  });
  profileName.value = profile.name;
  topbarAvatar.title = profile.name || 'Hồ sơ';
}

// Cắt vuông ở giữa và thu về 256px để lưu gọn trong trình duyệt
function resizeAvatar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256, side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

document.querySelector('#avatarBtn').onclick = () => avatarInput.click();

avatarInput.onchange = async () => {
  const file = avatarInput.files[0];
  avatarInput.value = '';
  if (!file) return;
  try {
    const profile = getProfile();
    profile.avatar = await resizeAvatar(file);
    saveProfile(profile);
    applyProfile();
    showToast('Đã cập nhật ảnh đại diện.', 'success');
  } catch {
    showToast('Không đọc được ảnh này.', 'error');
  }
};

profileName.addEventListener('change', () => {
  const profile = getProfile();
  profile.name = profileName.value.trim();
  saveProfile(profile);
  applyProfile();
  showToast('Đã lưu tên.', 'success');
});
profileName.addEventListener('keydown', e => { if (e.key === 'Enter') profileName.blur(); });

topbarAvatar.onclick = () => { location.hash = 'profile'; };

applyProfile();


// hqdefault/sddefault của YouTube có sẵn 2 dải đen trên và dưới ảnh; mqdefault (16:9) thì không có.
function fixThumb(url) {
  return typeof url === 'string' ? url.replace(/\/(hqdefault|sddefault)\.jpg/, '/mqdefault.jpg') : url;
}


/* ==============================
   MÀN HÌNH CHÀO
================================ */

(() => {
  const splash = document.querySelector('#splash');
  if (!splash) return;
  let done = false;
  document.body.style.overflow = 'hidden';

  const hide = () => {
    if (done) return;
    done = true;
    splash.classList.add('hide');
    document.body.style.overflow = '';
    setTimeout(() => splash.remove(), 800);
  };

  const minTime = new Promise(resolve => setTimeout(resolve, 1500));   // đổi 1500 để chào lâu/ngắn hơn
  const loaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));

  Promise.all([minTime, loaded]).then(hide);
  setTimeout(hide, 5000);   // phòng khi trang tải quá lâu
})();


/* ==============================
   GỢI Ý TỪ KHÓA KHI GÕ (vd gõ "na" ra "nằm bên anh")
================================ */

let remoteSuggestions = [];
let remoteQuery = '';
const suggestCache = new Map();
let suggestTimer;

// Bôi đậm phần người dùng đã gõ trong gợi ý
function setHighlighted(el, text, q) {
  el.textContent = '';
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) { el.textContent = text; return; }
  const bold = document.createElement('b');
  bold.textContent = text.slice(i, i + q.length);
  el.append(text.slice(0, i), bold, text.slice(i + q.length));
}

// Lấy gợi ý từ khóa của Google/YouTube (JSONP, không tốn quota API). Lỗi hoặc bị chặn thì trả mảng rỗng.
function fetchQuerySuggestions(q) {
  return new Promise(resolve => {
    const cb = `ytSuggest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const script = document.createElement('script');
    const finish = list => { delete window[cb]; script.remove(); resolve(list); };
    window[cb] = data => finish((data?.[1] || []).map(x => (Array.isArray(x) ? x[0] : x)).filter(Boolean));
    script.onerror = () => finish([]);
    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=vi&q=${encodeURIComponent(q)}&jsonp=${cb}`;
    document.head.appendChild(script);
    setTimeout(() => { if (window[cb]) finish([]); }, 3000);
  });
}

function scheduleRemoteSuggestions() {
  clearTimeout(suggestTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { remoteSuggestions = []; remoteQuery = ''; return; }
  suggestTimer = setTimeout(async () => {
    const key = q.toLowerCase();
    let list = suggestCache.get(key);
    if (!list) { list = await fetchQuerySuggestions(q); suggestCache.set(key, list); }
    if (searchInput.value.trim() !== q) return;   // đã gõ tiếp thì bỏ kết quả cũ
    remoteSuggestions = list;
    remoteQuery = q;
    renderSuggestions();
  }, 220);
}

/* ==============================
   HIỆU ỨNG CHUYỂN TAB: viên kính trượt + co giãn như chất lỏng
================================ */

const tabPill = document.createElement('span');
tabPill.className = 'tabbar-pill';
tabbar.prepend(tabPill);

let pillX = null;

function movePill(animate = true) {
  const btn = tabbar.querySelector('button.active');
  if (!btn) return;
  const x = btn.offsetLeft;
  tabPill.style.width = `${btn.offsetWidth}px`;
  if (pillX !== null && animate && x !== pillX) {
    tabPill.animate([
      { transform: `translateX(${pillX}px) scale(1, 1)` },
      { transform: `translateX(${(pillX + x) / 2}px) scale(1.3, .88)`, offset: 0.45 },
      { transform: `translateX(${x}px) scale(1, 1)` }
    ], { duration: 560, easing: 'cubic-bezier(.3, 1.15, .4, 1)' });
  }
  tabPill.style.transform = `translateX(${x}px)`;
  pillX = x;
}

new MutationObserver(() => movePill()).observe(tabbar, { subtree: true, attributes: true, attributeFilter: ['class'] });
window.addEventListener('resize', () => movePill(false));
requestAnimationFrame(() => movePill(false));


/* ==============================
   HIỆU ỨNG LOAD KHI TÌM KIẾM: khung xương lấp lánh + nút Tìm quay tròn
================================ */

function showSearchSkeleton() {
  searchResults.innerHTML = Array.from({ length: 6 }, () =>
    '<div class="skeleton-row"><div class="sk-thumb"></div><div class="sk-lines"><i></i><i></i></div></div>'
  ).join('');
}

function clearSearchSkeleton() {
  searchResults.querySelectorAll('.skeleton-row').forEach(el => el.remove());
}

function setSearchBusy(busy) {
  document.querySelector('.search-box button')?.classList.toggle('is-loading', busy);
  searchResults.setAttribute('aria-busy', String(busy));
}
