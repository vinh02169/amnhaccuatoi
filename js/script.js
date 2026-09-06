document.addEventListener("DOMContentLoaded", () => {
    // Audio Data - Strict Relative Paths
    const songs = [
        { title: "BLUE M", artist: "BIGBANG", src: "./songs/BIGBANG - BLUE M V.mp3" },
        { title: "하루하루 하루", artist: "CORTIS", src: "./songs/CORTIS (코르티스) - 하루하루 ♬ (Original by BIGBANG) UP코노 EP.15.mp3" },
        { title: "Perfect", artist: "Shiki", src: "./songs/Shiki - Perfect (ft. Tyronee) ['Lặng' EP] [U1usrHw-GvI].mp3" }
    ];

    let songIndex = 0, isPlaying = false, noteInterval;
    let musicManLottie = null, darkModeLottie = null;
    let isDarkMode = localStorage.getItem("themeMode") === "night";

    const UI = {
        audio: document.getElementById("audio"),
        playBtn: document.getElementById("play"),
        prevBtn: document.getElementById("prev"),
        nextBtn: document.getElementById("next"),
        title: document.getElementById("title"),
        artist: document.getElementById("artist"),
        progressContainer: document.getElementById("progress-container"),
        progress: document.getElementById("progress"),
        currTime: document.getElementById("currTime"),
        durTime: document.getElementById("durTime"),
        playIcon: document.querySelector("#play i"),
        notesContainer: document.getElementById("notes-container"),
        themeBtn: document.getElementById("dark-mode-btn")
    };

    // 1. Core Fetch Wrapper
    async function loadJsonWithFetch(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to load ${url}:`, error);
            if (window.location.protocol === 'file:') {
                console.error("CORS Blocked: Project uses Fetch API. Run via HTTP server.");
                document.getElementById('fetch-error-msg').style.display = 'block';
            }
            return null;
        }
    }

    // 2. Initialize Lottie
    async function initLotties() {
        const [manData, btnData] = await Promise.all([
            loadJsonWithFetch('./js/Music%20Man.json'),
            loadJsonWithFetch('./js/Dark%20Mode%20Button.json')
        ]);

        if (manData) {
            musicManLottie = lottie.loadAnimation({
                container: document.getElementById('music-man-container'),
                renderer: 'svg', loop: true, autoplay: false, animationData: manData
            });
        }
        if (btnData) {
            darkModeLottie = lottie.loadAnimation({
                container: UI.themeBtn, renderer: 'svg', loop: false, autoplay: false, animationData: btnData
            });
            darkModeLottie.addEventListener('DOMLoaded', () => {
                if(isDarkMode) darkModeLottie.goToAndStop(darkModeLottie.totalFrames - 1, true);
            });
        }
    }

    // 3. Audio Controller
    function loadSong(song) {
        UI.title.innerText = song.title;
        UI.artist.innerText = song.artist;
        UI.audio.src = song.src;
    }

    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) {
            UI.audio.play();
            UI.playIcon.className = "fas fa-pause";
            if (musicManLottie) musicManLottie.play();
            noteInterval = setInterval(spawnNote, 800);
        } else {
            UI.audio.pause();
            UI.playIcon.className = "fas fa-play";
            if (musicManLottie) musicManLottie.pause();
            clearInterval(noteInterval);
        }
    }

    function spawnNote() {
        if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const note = document.createElement("i");
        note.className = "fas fa-music music-note";
        note.style.left = "50%";
        note.style.top = "42%";
        note.style.setProperty('--dx', `${(Math.random() - 0.5) * 150}px`);
        UI.notesContainer.appendChild(note);
        setTimeout(() => note.remove(), 2500);
    }

    // 4. Generate Environment
    function initFlora() {
        const flora = document.getElementById('flora');
        const treeSVGs = [
            `<svg viewBox="0 0 100 120"><path d="M45,120 Q50,70 50,50 Q48,40 55,120 Z" fill="var(--tree-trunk,#5c3a21)"/><circle cx="50" cy="40" r="35" fill="var(--tree-crown,#3b7d4f)"/><circle cx="30" cy="50" r="25" fill="var(--tree-crown,#3b7d4f)"/></svg>`,
            `<svg viewBox="0 0 100 150"><path d="M40,150 Q50,80 50,60 Q55,40 60,150 Z" fill="var(--tree-trunk,#4a2e1b)"/><ellipse cx="50" cy="50" rx="40" ry="50" fill="var(--tree-crown,#2d663f)"/></svg>`
        ];

        // Foreground framing trees
        [5, 85].forEach(x => {
            const t = document.createElement('div');
            t.className = 'tree';
            t.style.left = `${x}%`;
            t.style.width = `${Math.random() * 40 + 100}px`;
            t.style.height = `${Math.random() * 60 + 150}px`;
            t.style.bottom = `${Math.random() * 5 + 15}%`;
            t.style.zIndex = "6";
            t.innerHTML = treeSVGs[0];
            flora.appendChild(t);
        });
        
        // Background depth trees
        for(let i=0; i<6; i++) {
            const t = document.createElement('div');
            t.className = 'tree';
            t.style.left = `${Math.random() * 100}%`;
            t.style.width = `${Math.random() * 30 + 50}px`;
            t.style.height = `${Math.random() * 40 + 80}px`;
            t.style.bottom = `${Math.random() * 10 + 22}%`;
            t.style.zIndex = "4";
            t.style.opacity = "0.7";
            t.innerHTML = treeSVGs[1];
            flora.appendChild(t);
        }
    }

    function initFauna() {
        const isMobile = window.innerWidth < 768;
        const birds = document.getElementById('birds');
        const flies = document.getElementById('fireflies');
        const bfly = document.getElementById('butterflies');

        // Birds
        for(let i=0; i < (isMobile ? 2 : 4); i++) {
            const b = document.createElement('div');
            b.className = 'bird';
            b.style.top = `${Math.random() * 30 + 5}%`;
            b.style.animationDuration = `${Math.random() * 10 + 10}s`;
            b.style.animationDelay = `${Math.random() * 5}s`;
            b.style.setProperty('--y-start', `${Math.random() * 50 - 25}px`);
            b.style.setProperty('--y-end', `${Math.random() * 50 - 25}px`);
            b.style.setProperty('--s', `${Math.random() * 0.5 + 0.5}`);
            b.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24"><path class="bird-wing" d="M2,12 Q8,4 12,12 Q16,4 22,12 Q12,16 2,12 Z"/></svg>`;
            birds.appendChild(b);
        }

        // Fireflies
        for(let i=0; i < (isMobile ? 10 : 20); i++) {
            const f = document.createElement('div');
            f.className = 'firefly';
            f.style.left = `${Math.random() * 96 + 2}%`;
            f.style.bottom = `${Math.random() * 60 + 10}%`;
            f.style.animationDuration = `${Math.random() * 3 + 2}s`;
            f.style.animationDelay = `${Math.random() * 2}s`;
            flies.appendChild(f);
        }

        // Butterflies
        for(let i=0; i < (isMobile ? 3 : 6); i++) {
            const bf = document.createElement('div');
            bf.className = 'butterfly';
            bf.style.left = `${Math.random() * 80 + 10}%`;
            bf.style.bottom = `${Math.random() * 20 + 5}%`;
            bf.style.animationDuration = `${Math.random() * 5 + 4}s`;
            bf.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24"><path class="bf-wing" d="M12,12 C8,4 2,8 12,12 C22,8 16,4 12,12 Z"/></svg>`;
            bfly.appendChild(bf);
        }
    }

    // 5. Events & Observers
    UI.themeBtn.addEventListener("click", () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem("themeMode", isDarkMode ? "night" : "day");
        document.body.setAttribute("data-theme", isDarkMode ? "night" : "day");
        if(darkModeLottie) {
            darkModeLottie.setDirection(isDarkMode ? 1 : -1);
            darkModeLottie.play();
        }
    });

    UI.playBtn.addEventListener("click", togglePlay);
    UI.prevBtn.addEventListener("click", () => { songIndex = (songIndex - 1 + songs.length) % songs.length; loadSong(songs[songIndex]); if(isPlaying) { UI.audio.play(); } });
    UI.nextBtn.addEventListener("click", () => { songIndex = (songIndex + 1) % songs.length; loadSong(songs[songIndex]); if(isPlaying) { UI.audio.play(); } });
    UI.audio.addEventListener("ended", () => UI.nextBtn.click());
    
    UI.audio.addEventListener("timeupdate", () => {
        if(UI.audio.duration) {
            UI.progress.style.width = `${(UI.audio.currentTime / UI.audio.duration) * 100}%`;
            let cM = Math.floor(UI.audio.currentTime / 60), cS = Math.floor(UI.audio.currentTime % 60);
            let dM = Math.floor(UI.audio.duration / 60), dS = Math.floor(UI.audio.duration % 60);
            UI.currTime.innerText = `${cM}:${cS < 10 ? '0'+cS : cS}`;
            UI.durTime.innerText = `${dM}:${dS < 10 ? '0'+dS : dS}`;
        }
    });

    UI.progressContainer.addEventListener("click", (e) => {
        UI.audio.currentTime = (e.offsetX / UI.progressContainer.clientWidth) * UI.audio.duration;
    });

    // Run
    document.body.setAttribute("data-theme", isDarkMode ? "night" : "day");
    loadSong(songs[songIndex]);
    initFlora();
    initFauna();
    initLotties();
});