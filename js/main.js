const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let distance = 0;
let score = 0;
let speed = 4.5;
let animationId;

// DOM Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreDisplay = document.getElementById('scoreDisplay');
const finalScore = document.getElementById('finalScore');
const seasonDisplay = document.getElementById('seasonDisplay');
const hud = document.getElementById('hud');
const warningBanner = document.getElementById('fileProtocolWarning');

// --- 1. PROTOCOL DETECTION & AUDIO SYSTEM ---
function checkProtocol() {
    if (window.location.protocol === 'file:') {
        console.warn("[Protocol Warning] App running via file:// protocol. Local media autoplay might be restricted. Use a local development server (e.g. VS Code Live Server).");
        if (warningBanner) warningBanner.classList.remove('hidden');
    }
}

const songList = [
    'songs/blue.mp3',
    'songs/haruharu.mp3',
    'songs/perfect.mp3'
];

const bgm = new Audio();
bgm.loop = true;

bgm.onerror = (e) => {
    console.error(`[Audio Error 404] Failed to load audio file: "${bgm.src}". Ensure the file exists in 'songs/' with exact name.`, e);
};

function playRandomSong() {
    if (songList.length === 0) return;
    const randomSong = songList[Math.floor(Math.random() * songList.length)];
    bgm.src = randomSong;
    bgm.currentTime = 0;
    bgm.play().catch(err => {
        console.warn("Audio playback blocked by browser autoplay policy:", err);
    });
}

function stopSong() {
    bgm.pause();
    bgm.currentTime = 0;
}

// --- 2. COLOR LERP & CONTINUOUS SEASONS ENGINE ---
const SEASONS_DATA = [
    {
        name: 'Spring',
        skyTop: '#ff9a9e', skyBottom: '#fecfef',
        terrainTop: '#a8e6cf', terrainBottom: '#56ab91',
        celestial: '#ffffff',
        trunk: '#5d4037', foliage1: '#ffb7b2', foliage2: '#e8aeb7',
        particleType: 'blossom'
    },
    {
        name: 'Summer',
        skyTop: '#4facfe', skyBottom: '#00f2fe',
        terrainTop: '#8bc34a', terrainBottom: '#388e3c',
        celestial: '#fff9c4',
        trunk: '#4e342e', foliage1: '#4caf50', foliage2: '#2e7d32',
        particleType: 'ray'
    },
    {
        name: 'Autumn',
        skyTop: '#f6d365', skyBottom: '#fda085',
        terrainTop: '#ff8a65', terrainBottom: '#d84315',
        celestial: '#ffe082',
        trunk: '#3e2723', foliage1: '#ff7043', foliage2: '#e65100',
        particleType: 'leaf'
    },
    {
        name: 'Winter',
        skyTop: '#a1c4fd', skyBottom: '#c2e9fb',
        terrainTop: '#eceff1', terrainBottom: '#90a4ae',
        celestial: '#e0e0e0',
        trunk: '#37474f', foliage1: '#78909c', foliage2: '#455a64',
        particleType: 'snow'
    }
];

function parseColor(colorStr) {
    if (colorStr.startsWith('#')) {
        let hex = colorStr.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    return [255, 255, 255];
}

function lerpColor(c1, c2, t) {
    const rgb1 = parseColor(c1);
    const rgb2 = parseColor(c2);
    const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
    const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
    const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
}

function getCurrentEnvironment() {
    // 1 Season Cycle = 800 Days (200 Days per Season)
    const totalCycle = 800;
    const cycleProgress = (score % totalCycle) / (totalCycle / 4); // 0 to 4
    const seasonIdx = Math.floor(cycleProgress) % 4;
    const nextSeasonIdx = (seasonIdx + 1) % 4;
    const t = cycleProgress - Math.floor(cycleProgress); // Interpolation factor 0..1

    const current = SEASONS_DATA[seasonIdx];
    const next = SEASONS_DATA[nextSeasonIdx];

    return {
        skyTop: lerpColor(current.skyTop, next.skyTop, t),
        skyBottom: lerpColor(current.skyBottom, next.skyBottom, t),
        terrainTop: lerpColor(current.terrainTop, next.terrainTop, t),
        terrainBottom: lerpColor(current.terrainBottom, next.terrainBottom, t),
        celestial: lerpColor(current.celestial, next.celestial, t),
        trunk: lerpColor(current.trunk, next.trunk, t),
        foliage1: lerpColor(current.foliage1, next.foliage1, t),
        foliage2: lerpColor(current.foliage2, next.foliage2, t),
        seasonIdx: seasonIdx,
        nextSeasonIdx: nextSeasonIdx,
        transitionFactor: t,
        displayName: t < 0.5 ? current.name : next.name
    };
}

// --- 3. TERRAIN & GEOMETRY CALCULATIONS ---
function getTerrainHeight(worldX) {
    const baseHeight = height * 0.75;
    const wave1 = Math.sin(worldX * 0.0025) * 60;
    const wave2 = Math.sin(worldX * 0.006) * 35;
    return baseHeight + wave1 + wave2;
}

function getTerrainAngle(worldX) {
    const delta = 2;
    const y1 = getTerrainHeight(worldX - delta);
    const y2 = getTerrainHeight(worldX + delta);
    return Math.atan2(y2 - y1, delta * 2);
}

// --- 4. GAME OBJECTS & PARTICLES ---
const player = {
    x: 0, y: 0, vy: 0, radius: 14,
    gravity: 0.4, jumpPower: -8.5,
    trail: [],

    reset() {
        this.x = width * 0.3;
        this.y = height * 0.4;
        this.vy = 0;
        this.trail = [];
    },

    jump() {
        this.vy = this.jumpPower;
    },

    update() {
        this.vy += this.gravity;
        this.y += this.vy;

        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > 25) this.trail.shift();
        for (let t of this.trail) t.alpha -= 0.04;
    },

    draw() {
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            if (t.alpha <= 0) continue;
            let offsetX = t.x - ((this.trail.length - i) * speed * 0.5);
            ctx.beginPath();
            ctx.arc(offsetX, t.y, this.radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 245, 157, ${t.alpha})`;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff9c4';
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ffee58';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
};

let obstacles = [];
let trees = [];
let particles = [];
let clouds = [];

function initBackground() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
        clouds.push({
            x: Math.random() * width,
            y: Math.random() * (height * 0.4),
            size: Math.random() * 40 + 30,
            speed: Math.random() * 0.3 + 0.1
        });
    }
}

function spawnWorldElements() {
    if (distance % 350 === 0 && distance > 600) {
        obstacles.push({
            worldX: distance + width + 50,
            width: 30, height: Math.random() * 40 + 35
        });
    }

    if (Math.random() < 0.03) {
        trees.push({
            worldX: distance + width + 50,
            size: Math.random() * 25 + 22
        });
    }
}

// Particle system with smooth seasonal cross-fading
function handleWeather(env) {
    if (Math.random() < 0.3) {
        // Decide particle type based on weighted interpolation between seasons
        const currentType = SEASONS_DATA[env.seasonIdx].particleType;
        const nextType = SEASONS_DATA[env.nextSeasonIdx].particleType;
        const activeType = Math.random() > env.transitionFactor ? currentType : nextType;
        const activeColor = Math.random() > env.transitionFactor ? env.foliage1 : env.foliage2;

        particles.push({
            x: Math.random() * width,
            y: -20,
            vy: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 2.5,
            size: Math.random() * 5 + 3,
            type: activeType,
            color: activeColor,
            angle: Math.random() * Math.PI * 2
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.y += p.vy;
        p.x += p.vx;
        p.angle += 0.03;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;

        if (p.type === 'blossom' || p.type === 'leaf') {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.type === 'snow') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'ray') {
            ctx.globalAlpha = 0.4;
            ctx.fillRect(0, 0, 2, p.size * 4);
        }
        ctx.restore();

        if (p.y > height) particles.splice(i, 1);
    }
}

// --- 5. PROCEDURAL FLORA & GROUND RENDERING ---
function drawProceduralTree(screenX, terrainY, angle, size, env) {
    ctx.save();
    ctx.translate(screenX, terrainY);
    ctx.rotate(angle); // Align tree perpendicular to surface normal

    // Draw Trunk
    ctx.fillStyle = env.trunk;
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, 0);
    ctx.lineTo(-size * 0.08, -size * 0.85);
    ctx.lineTo(size * 0.08, -size * 0.85);
    ctx.lineTo(size * 0.15, 0);
    ctx.fill();

    ctx.translate(0, -size * 0.85);

    // Render Foliage based on blended season
    if (env.seasonIdx === 3 && env.transitionFactor > 0.5) {
        // Winter Evergreen Pine with Snow Caps
        ctx.fillStyle = env.foliage2;
        for (let layer = 0; layer < 3; layer++) {
            let w = size * (0.65 - layer * 0.12);
            let h = size * 0.4;
            let yOffset = -layer * size * 0.25;

            ctx.beginPath();
            ctx.moveTo(0, yOffset - h);
            ctx.lineTo(-w / 2, yOffset);
            ctx.lineTo(w / 2, yOffset);
            ctx.closePath();
            ctx.fill();

            // Snow Cap
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, yOffset - h);
            ctx.lineTo(-w * 0.25, yOffset - h * 0.5);
            ctx.lineTo(w * 0.25, yOffset - h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = env.foliage2;
        }
    } else {
        // Soft rounded foliage (Spring Blossom, Summer Palm/Oak, Autumn Maple)
        ctx.fillStyle = env.foliage1;
        ctx.beginPath();
        ctx.arc(0, -size * 0.15, size * 0.42, 0, Math.PI * 2);
        ctx.arc(-size * 0.22, 0, size * 0.32, 0, Math.PI * 2);
        ctx.arc(size * 0.22, 0, size * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = env.foliage2;
        ctx.beginPath();
        ctx.arc(0, -size * 0.25, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawGroundVegetation(env) {
    const step = 28;
    const startX = Math.floor(distance / step) * step;
    const endX = startX + width + 100;

    for (let wx = startX; wx < endX; wx += step) {
        let screenX = wx - distance;
        if (screenX < -20 || screenX > width + 20) continue;

        let terrainY = getTerrainHeight(wx);
        let angle = getTerrainAngle(wx);

        // Pseudo-random hash based on world position
        let hash = Math.sin(wx * 12.9898) * 43758.5453;
        hash = hash - Math.floor(hash);

        ctx.save();
        ctx.translate(screenX, terrainY);
        ctx.rotate(angle);

        if (hash < 0.25) {
            // Grass Tufts
            ctx.strokeStyle = env.terrainBottom;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(-3, -7);
            ctx.moveTo(0, 0); ctx.lineTo(0, -9);
            ctx.moveTo(0, 0); ctx.lineTo(3, -6);
            ctx.stroke();
        } else if (hash < 0.4) {
            // Wildflowers
            ctx.fillStyle = env.foliage1;
            ctx.beginPath();
            ctx.arc(0, -5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -5, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = env.terrainBottom;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(0, -3);
            ctx.stroke();
        } else if (hash < 0.52) {
            // Small Pebbles
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(0, -1, 3, 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// --- 6. MAIN GAME RENDER PIPELINE ---
function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    hud.style.display = 'flex';

    distance = 0;
    score = 0;
    speed = 4.5;
    obstacles = [];
    trees = [];
    particles = [];
    player.reset();

    playRandomSong();
    gameLoop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    stopSong();
    hud.style.display = 'none';
    finalScore.innerText = score;
    gameOverScreen.classList.add('active');
    cancelAnimationFrame(animationId);
}

function drawBackground(env) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, env.skyTop);
    gradient.addColorStop(1, env.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.25, 45, 0, Math.PI * 2);
    ctx.fillStyle = env.celestial;
    ctx.shadowBlur = 40;
    ctx.shadowColor = env.celestial;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    clouds.forEach(c => {
        c.x -= c.speed;
        if (c.x < -c.size * 3) c.x = width + c.size;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.9, c.y - c.size * 0.4, c.size * 0.8, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 1.6, c.y, c.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawTerrain(env) {
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let screenX = 0; screenX <= width + 20; screenX += 20) {
        let worldX = screenX + distance;
        ctx.lineTo(screenX, getTerrainHeight(worldX));
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);

    const groundGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
    groundGrad.addColorStop(0, env.terrainTop);
    groundGrad.addColorStop(1, env.terrainBottom);
    ctx.fillStyle = groundGrad;
    ctx.fill();
}

function updateAndDrawEntities(env) {
    // Draw Trees aligned to surface normal
    for (let i = trees.length - 1; i >= 0; i--) {
        let t = trees[i];
        let screenX = t.worldX - distance;
        let terrainY = getTerrainHeight(t.worldX);
        let angle = getTerrainAngle(t.worldX);

        drawProceduralTree(screenX, terrainY, angle, t.size, env);

        if (screenX < -100) trees.splice(i, 1);
    }

    // Draw Obstacles (Spikes) anchored to terrain normal
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        let screenX = obs.worldX - distance;
        let terrainY = getTerrainHeight(obs.worldX);
        let angle = getTerrainAngle(obs.worldX);

        ctx.save();
        ctx.translate(screenX, terrainY);
        ctx.rotate(angle);
        ctx.fillStyle = '#2d3436';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-obs.width / 2, 0);
        ctx.lineTo(0, -obs.height);
        ctx.lineTo(obs.width / 2, 0);
        ctx.fill();
        ctx.restore();

        // Collision detection
        let dx = player.x - screenX;
        let dy = player.y - (terrainY - obs.height / 2);
        if (Math.abs(dx) < obs.width / 2 + player.radius && Math.abs(dy) < obs.height / 2 + player.radius) {
            gameOver();
        }

        if (screenX < -100) obstacles.splice(i, 1);
    }
}

function gameLoop() {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, width, height);

    distance += speed;
    score = Math.floor(distance / 50);
    scoreDisplay.innerText = score;
    speed += 0.0005;

    const env = getCurrentEnvironment();
    seasonDisplay.innerText = env.displayName;
    seasonDisplay.style.color = env.foliage1;

    spawnWorldElements();

    drawBackground(env);
    handleWeather(env);
    drawGroundVegetation(env);
    updateAndDrawEntities(env);
    drawTerrain(env);

    player.update();
    player.draw();

    // Ground collision check
    let currentTerrainY = getTerrainHeight(distance + player.x);
    if (player.y + player.radius >= currentTerrainY) {
        gameOver();
    }

    if (player.y - player.radius <= 0) {
        player.y = player.radius;
        player.vy = 0;
    }

    animationId = requestAnimationFrame(gameLoop);
}

// --- 7. EVENT LISTENERS ---
window.addEventListener('resize', resizeCanvas);

function handleInput(e) {
    if (e.type !== 'keydown') e.preventDefault();
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (gameState === 'PLAYING') {
        player.jump();
    }
}

window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, { passive: false });
window.addEventListener('keydown', handleInput);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initialize setup
checkProtocol();
resizeCanvas();
initBackground();