const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

const gameInfo = {
    score: 0,
    state: 'PLAYING',
    grid: new Grid(),
    cannon: null,
    particles: new ParticleSystem(),
    audio: new AudioSystem(),
    gridOffset: 0
};
window.gameInfo = gameInfo; // Ensure it's globally available for logic.js

function createBackgroundBubbles() {
    const numBubbles = 25; 
    const body = document.body;

    for (let i = 0; i < numBubbles; i++) {
        let bubble = document.createElement('div');
        bubble.className = 'bg-bubble';

        // Random properties
        let size = Math.random() * 80 + 40; // 40px to 120px
        let left = Math.random() * 100; // 0% to 100% width
        let top = Math.random() * 100; // 0% to 100% height
        let duration = Math.random() * 15 + 15; // 15s to 30s
        let delay = Math.random() * 20; // 0s to 20s
        let typeInfo = MARBLE_TYPES[Math.floor(Math.random() * MARBLE_TYPES.length)];

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}vw`;
        bubble.style.top = `${top}vh`;
        bubble.style.animationDuration = `${duration}s`;
        bubble.style.animationDelay = `-${delay}s`; // start at random points
        bubble.style.backgroundColor = typeInfo.color;

        let img = document.createElement('img');
        img.src = typeInfo.imageSrc;
        bubble.appendChild(img);

        body.appendChild(bubble);
    }
}

let totalShots = 0;
let bestScore = localStorage.getItem('rhodeZumaBestScore') || 0;
document.getElementById('best-score').innerText = bestScore;

// Handle High DPI (Retina) displays to prevent blurry images
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // We want the CSS size to remain 480x640
    canvas.style.width = '480px';
    canvas.style.height = '640px';

    // Set actual internal dimensions based on DPR
    canvas.width = 480 * dpr;
    canvas.height = 640 * dpr;

    // Normalize coordinates system to use css pixels
    ctx.scale(dpr, dpr);
}

function initLevel() {
    gameInfo.grid.init(6);
    // Fill first 4 rows fully as initial level state
    for (let r = 0; r < 4; r++) {
        let cols = (r % 2 === 0) ? GRID_CONFIG.cols : GRID_CONFIG.cols - 1;
        for (let c = 0; c < cols; c++) {
            let typeInfo = MARBLE_TYPES[Math.floor(Math.random() * MARBLE_TYPES.length)];
            let pos = gameInfo.grid.getScreenPos(r, c);
            let marble = new Marble(r, c, typeInfo, pos.x, pos.y);
            marble.triggerBounce(); // Bounce on start
            gameInfo.grid.addMarble(marble);
        }
    }

    gameInfo.cannon = new Cannon(480 / 2, 640 - 40);
}

// Initial setup
resizeCanvas();

canvas.addEventListener('mousemove', e => {
    let bounds = canvas.getBoundingClientRect();
    let mouseX = e.clientX - bounds.left;
    let mouseY = e.clientY - bounds.top;
    if (gameInfo.state === 'PLAYING' && gameInfo.cannon) {
        gameInfo.cannon.aim(mouseX, mouseY);
    }
});

canvas.addEventListener('click', e => {
    if (gameInfo.state === 'PLAYING' && gameInfo.cannon) {
        if (!gameInfo.cannon.flyingMarble) {
            gameInfo.audio.play('fire');
        }
        gameInfo.cannon.fire();
    }
});

let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw(ctx);

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (gameInfo.state !== 'PLAYING') return;

    gameInfo.particles.update();

    if (gameInfo.cannon) {
        gameInfo.cannon.update(dt, gameInfo.grid, (snappedMarble) => {
            let matchMade = Logic.processSnap(snappedMarble, gameInfo.grid, gameInfo);

            totalShots++;
            if (totalShots >= 4) {
                if (matchMade) {
                    // Delay push down to allow popping animation to complete without glitching
                    setTimeout(() => {
                        if (gameInfo.state === 'PLAYING') {
                            Logic.pushDownGrid(gameInfo.grid);
                            if (Logic.checkGameOver(gameInfo.grid, gameInfo.cannon.y - 40)) {
                                gameOver();
                            }
                        }
                    }, 500);
                } else {
                    Logic.pushDownGrid(gameInfo.grid);
                }
                totalShots = 0;
            }

            if (Logic.checkGameOver(gameInfo.grid, gameInfo.cannon.y - 40)) {
                gameOver();
            }
        });
    }

    for (let r = 0; r < gameInfo.grid.cells.length; r++) {
        for (let c = 0; c < gameInfo.grid.cells[r].length; c++) {
            let m = gameInfo.grid.cells[r][c];
            if (m) {
                m.update();
                if (m.dead) {
                    gameInfo.grid.cells[r][c] = null;
                }
            }
        }
    }
}

function draw(ctx) {
    // We clear 480x640 because the context is scaled
    ctx.clearRect(0, 0, 480, 640);

    ctx.save();

    // Apply camera shake before drawing the game world
    gameInfo.particles.applyShake(ctx);

    ctx.save();
    ctx.translate(0, gameInfo.gridOffset);
    gameInfo.grid.draw(ctx);
    ctx.restore();

    if (gameInfo.cannon) {
        gameInfo.cannon.draw(ctx);
    }

    gameInfo.particles.draw(ctx);

    ctx.restore();
}

function gameOver() {
    gameInfo.state = 'GAMEOVER';
    gameInfo.audio.play('gameover');
    document.getElementById('final-score').innerText = gameInfo.score;

    const newRecordMsg = document.getElementById('new-record-msg');
    if (gameInfo.score > bestScore) {
        bestScore = gameInfo.score;
        localStorage.setItem('rhodeZumaBestScore', bestScore);
        document.getElementById('best-score').innerText = bestScore;
        newRecordMsg.classList.remove('hidden');
    } else {
        newRecordMsg.classList.add('hidden');
    }

    document.getElementById('game-overlay').classList.remove('hidden');
}

document.getElementById('restart-btn').addEventListener('click', () => {
    gameInfo.state = 'PLAYING';
    gameInfo.score = 0;
    totalShots = 0;
    document.getElementById('score').innerText = 0;
    document.getElementById('game-overlay').classList.add('hidden');
    document.getElementById('new-record-msg').classList.add('hidden');
    initLevel();
});

// Start
initLevel();
createBackgroundBubbles();
requestAnimationFrame(gameLoop);
