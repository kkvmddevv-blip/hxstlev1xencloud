let CLIENT_ID = 'u2ydppvwXCUxV6VITwH4OXk8JBySpoNr';
let currentTracks = [];
let currentIndex = -1;
let favorites = JSON.parse(localStorage.getItem('myLikes')) || [];
let audio = new Audio();
let audioContext;
let analyser;
 
// !!! Инициализация Telegram Mini App !!!
const tg = window.Telegram.WebApp;
if (tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0) {
    console.log("Запущено в Telegram");
    tg.expand(); // Развернуть на весь экран
    tg.ready();
    // При желании можно использовать цвета темы: tg.themeParams.bg_color
} else {
    console.log("Запущено не в Telegram (браузер/electron)");
}
 
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsList = document.getElementById('resultsList');
const favoritesList = document.getElementById('favoritesList');
const trackInfo = document.getElementById('trackInfo');
const playPauseBtn = document.getElementById('playPauseBtn');
const likeBtn = document.getElementById('likeBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchBox = document.querySelector('.search-box'); // Элемент поиска
 
audio.volume = localStorage.getItem('playerVolume') || 0.5;
 
// Вкладки
function showTab(tabName) {
    if (tabName === 'search') {
        resultsList.style.display = 'block';
        favoritesList.style.display = 'none';
        searchBox.style.display = 'flex'; // Показать поиск
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.querySelectorAll('.tab-btn')[1].classList.remove('active');
    } else {
        resultsList.style.display = 'none';
        favoritesList.style.display = 'block';
        searchBox.style.display = 'none'; // Скрыть поиск
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.querySelectorAll('.tab-btn')[0].classList.remove('active');
        renderFavorites();
    }
}
 
// Поиск ключа SoundCloud
async function refreshId() {
    try {
        const response = await fetch('https://soundcloud.com');
        const html = await response.text();
        const scriptUrls = html.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/[a-zA-Z0-9-]+\.js/g);
        if (!scriptUrls) throw new Error("Скрипты не найдены");
 
        for (let url of scriptUrls.reverse()) {
            const scriptRes = await fetch(url);
            const scriptContent = await scriptRes.text();
            const match = scriptContent.match(/client_id[:=]\s*["']([a-zA-Z0-9]{32})["']/);
            if (match && match[1]) {
                CLIENT_ID = match[1];
                return;
            }
        }
    } catch (e) { console.error("Ошибка получения CLIENT_ID", e); }
}
 
// Поиск треков
function performSearch() {
    if (!CLIENT_ID) { refreshId(); return; }
    const query = searchInput.value.trim();
    if (!query) return;
    trackInfo.innerText = "Поиск...";
 
    const url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${CLIENT_ID}&limit=20`;
    fetch(url)
        .then(r => r.json())
        .then(data => {
            currentTracks = data.collection || [];
            renderResults();
            trackInfo.innerText = "Выберите трек";
        })
        .catch(e => { trackInfo.innerText = "Ошибка поиска"; console.error(e); });
}
 
searchBtn.onclick = performSearch;
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
 
// Рендер списков
function renderTrackList(list, container) {
    container.innerHTML = '';
    list.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'track-item';
        const artist = track.user ? track.user.username : "Unknown Artist";
        li.innerHTML = `<span class="track-title">${track.title}</span>
                       <span class="track-artist">${artist}</span>`;
        li.onclick = () => playTrack(index, list);
        container.appendChild(li);
    });
}
function renderResults() { renderTrackList(currentTracks, resultsList); }
function renderFavorites() { renderTrackList(favorites, favoritesList); }
 
// Визуализатор
function initVisualizer() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 256; // Меньше для производительности на мобильных
    }
 
    const canvas = document.getElementById('visualizerCanvas');
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
 
    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
 
        const barWidth = (canvas.width / bufferLength);
        let x = 0;
 
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            ctx.fillStyle = `rgba(255, 85, 0, 0.2)`; 
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth;
        }
    }
    draw();
}
 
// Воспроизведение
async function playTrack(index, list) {
    if (index < 0 || index >= list.length) return;
    const track = list[index];
    currentTracks = list;
    currentIndex = index;
    const isLiked = favorites.find(t => t.id === track.id);
    likeBtn.innerText = isLiked ? '❤' : '♡';
    trackInfo.innerText = "Загрузка...";
 
    try {
        const progressive = track.media.transcodings.find(t => t.format.protocol === 'progressive');
        const res = await fetch(`${progressive.url}?client_id=${CLIENT_ID}`);
        const streamData = await res.json();
 
        audio.src = streamData.url;
        audio.play();
        trackInfo.innerText = track.title;
        playPauseBtn.innerText = '⏸';
 
        if (analyser) initVisualizer();
    } catch (e) { trackInfo.innerText = "Ошибка"; console.error(e); }
}
 
playPauseBtn.onclick = () => {
    if (audio.paused) { audio.play(); playPauseBtn.innerText = '⏸'; }
    else { audio.pause(); playPauseBtn.innerText = '▶️'; }
};
 
likeBtn.onclick = () => {
    if (currentIndex === -1) return;
    const track = currentTracks[currentIndex];
    const existsIndex = favorites.findIndex(t => t.id === track.id);
    if (existsIndex > -1) { favorites.splice(existsIndex, 1); likeBtn.innerText = '♡'; }
    else { favorites.push(track); likeBtn.innerText = '❤'; }
    localStorage.setItem('myLikes', JSON.stringify(favorites));
    renderFavorites();
};
 
nextBtn.onclick = () => playTrack(currentIndex + 1, currentTracks);
prevBtn.onclick = () => playTrack(currentIndex - 1, currentTracks);
audio.onended = () => playTrack(currentIndex + 1, currentTracks);
 
// Прогресс бар
audio.ontimeupdate = () => {
    if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
        const formatTime = (time) => {
            const m = Math.floor(time / 60);
            const s = Math.floor(time % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        };
        currentTimeEl.innerText = formatTime(audio.currentTime);
        durationTimeEl.innerText = formatTime(audio.duration);
    }
};
 
progressBar.oninput = () => {
    if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
};
 
// Ресайз
window.addEventListener('resize', () => {
    const canvas = document.getElementById('visualizerCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
 
const canvas = document.getElementById('visualizerCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
 
// Инициализация
// Поиск ключа SoundCloud через прокси
async function refreshId() {
    console.log("Запрос CLIENT_ID...");
    
    // Используем прокси для обхода CORS ограничений
    // ВАЖНО: Если прокси не работает, нужно найти другой бесплатный прокси
    const proxyUrl = 'https://api.allorigins.win/raw?url='; 
    const targetUrl = 'https://soundcloud.com';

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        const html = await response.text();
        const scriptUrls = html.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/[a-zA-Z0-9-]+\.js/g);
        if (!scriptUrls) throw new Error("Скрипты не найдены");
        
        for (let url of scriptUrls.reverse()) {
            try {
                const scriptRes = await fetch(proxyUrl + encodeURIComponent(url));
                const scriptContent = await scriptRes.text();
                const match = scriptContent.match(/client_id[:=]\s*["']([a-zA-Z0-9]{32})["']/);
                if (match && match[1]) {
                    CLIENT_ID = match[1];
                    console.log("CLIENT_ID найден:", CLIENT_ID);
                    return;
                }
            } catch (innerE) {}
        }
    } catch (e) { console.error("Ошибка получения CLIENT_ID", e); }
}