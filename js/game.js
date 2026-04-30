// ── 游戏主循环（集成版） ────────────────────
let gameInfo = null;
let bestScore = 0;
let totalShots = 0;
let gameLoopRaf = null;

function initGameCanvas() {
    // 读最高分
    bestScore = parseInt(localStorage.getItem('lungpaopaoBestScore') || 0);
    document.getElementById('best-score').innerText = bestScore;

    // resizeCanvas 不再自动 initLevel（由 UI.startGame 触发）
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 480 * dpr;
    canvas.height = 640 * dpr;
    ctx.scale(dpr, dpr);

    // 动态缩放 CSS 尺寸以适应视口
    function fitCanvas() {
        const maxW = window.innerWidth * 0.95;
        const maxH = window.innerHeight - 160;
        const scale = Math.min(maxW / 480, maxH / 640, 1);
        canvas.style.width = (480 * scale) + 'px';
        canvas.style.height = (640 * scale) + 'px';
    }
    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    // 技能按钮点击监听（DOM 已就绪）
    document.getElementById('skill-btn').addEventListener('click', activateCharacterSkill);

    createBackgroundBubbles();
    startGameLoop();
}

// 根据关卡配置初始化游戏
function initLevelWithConfig(config) {
    const rows = config.gridRows || 5;
    const colorCount = config.marbleTypes || 5;

    gameInfo = {
        score: 0,
        state: 'PLAYING',
        grid: new Grid(),
        cannon: null,
        particles: new ParticleSystem(),
        audio: new AudioSystem(),
        gridOffset: 0
    };
    window.gameInfo = gameInfo;

    gameInfo.grid.init(rows);

    for (let r = 0; r < Math.min(rows, 4); r++) {
        const cols = (r % 2 === 0) ? GRID_CONFIG.cols : GRID_CONFIG.cols - 1;
        for (let c = 0; c < cols; c++) {
            const idx = Math.floor(Math.random() * Math.min(colorCount, MARBLE_TYPES.length));
            const typeInfo = MARBLE_TYPES[idx];
            const pos = gameInfo.grid.getScreenPos(r, c);
            const marble = new Marble(r, c, typeInfo, pos.x, pos.y);
            marble.triggerBounce();
            gameInfo.grid.addMarble(marble);
        }
    }

    gameInfo.cannon = new Cannon(480 / 2, 640 - 40);
    totalShots = 0;
    levelTotalShots = 0;
    levelClearCount = 0;

    document.getElementById('score').innerText = '0';

    updateSkillButton();
    startGameLoop();
}

function createBackgroundBubbles() {
    if (document.querySelector('.bg-bubble')) return; // 不重复创建
    const numBubbles = 25;
    const body = document.body;
    for (let i = 0; i < numBubbles; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bg-bubble';
        const size = Math.random() * 80 + 40;
        const left = Math.random() * 100;
        const top_ = Math.random() * 100;
        const duration = Math.random() * 15 + 15;
        const delay = Math.random() * 20;
        const typeInfo = MARBLE_TYPES[Math.floor(Math.random() * MARBLE_TYPES.length)];
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}vw`;
        bubble.style.top = `${top_}vh`;
        bubble.style.animationDuration = `${duration}s`;
        bubble.style.animationDelay = `-${delay}s`;
        bubble.style.backgroundColor = typeInfo.color;
        const img = document.createElement('img');
        img.src = typeInfo.imageSrc;
        bubble.appendChild(img);
        body.appendChild(bubble);
    }
}

// ── 输入处理 ──────────────────────────────────
function getMousePos(evt) {
    const canvas = document.getElementById('gameCanvas');
    const bounds = canvas.getBoundingClientRect();
    const scaleX = 480 / bounds.width;
    const scaleY = 640 / bounds.height;
    let clientX = evt.clientX;
    let clientY = evt.clientY;
    if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
    }
    return {
        x: (clientX - bounds.left) * scaleX,
        y: (clientY - bounds.top) * scaleY
    };
}

function handlePointerMove(e) {
    if (gameInfo && gameInfo.state === 'PLAYING' && gameInfo.cannon) {
        const pos = getMousePos(e);
        gameInfo.cannon.aim(pos.x, pos.y);
    }
}

function handlePointerDown(e) {
    if (!gameInfo || gameInfo.state !== 'PLAYING' || !gameInfo.cannon) return;
    if (!gameInfo.cannon.flyingMarble) {
        if (gameInfo.audio) gameInfo.audio.play('fire');
    }
    const pos = getMousePos(e);
    gameInfo.cannon.aim(pos.x, pos.y);
    gameInfo.cannon.fire();
    CharacterSystem.onShotFired();
}

// 玩家手动点击技能按钮
function activateCharacterSkill() {
    if (!gameInfo || gameInfo.state !== 'PLAYING') return;
    if (!CharacterSystem.isSkillReady()) return;
    CharacterSystem.activateSkill();
}

const canvas = document.getElementById('gameCanvas');
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePointerMove(e); }, { passive: false });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointerDown(e); }, { passive: false });

// ── 游戏循环 ──────────────────────────────────
function startGameLoop() {
    if (gameLoopRaf) { cancelAnimationFrame(gameLoopRaf); gameLoopRaf = null; }
    let lastTime = 0;
    function loop(timestamp) {
        // 游戏结束则停止循环
        if (!gameInfo || gameInfo.state !== 'PLAYING') {
            if (gameLoopRaf) { cancelAnimationFrame(gameLoopRaf); gameLoopRaf = null; }
            return;
        }
        if (!lastTime) lastTime = timestamp;
        const dt = timestamp - lastTime;
        lastTime = timestamp;
        update(dt);
        draw();
        gameLoopRaf = requestAnimationFrame(loop);
    }
    gameLoopRaf = requestAnimationFrame(loop);
}

function update(dt) {
    if (!gameInfo || gameInfo.state !== 'PLAYING') return;

    // 更新冻结技能计时（冰霜巫灵需要时间）
    CharacterSystem.updateFrozen(dt / 1000);
    updateSkillButton();
    updateLevelHUD();

    const dtSec = dt / 1000;
    gameInfo.particles.update();

    // 挑战模式计时
    if (ChallengeSystem.isPlaying()) {
        ChallengeSystem.update(dt);
        const hud = document.getElementById('challenge-timer');
        if (hud) hud.textContent = ChallengeSystem.getTimeStr();
        const clearsEl = document.getElementById('challenge-clears');
        if (clearsEl) clearsEl.textContent = ChallengeSystem.totalCleared;
        if (ChallengeSystem.state === 'TIMEOUT') {
            ChallengeSystem.end('TIMEOUT');
            return;
        }
    }

    // 关卡特殊机制
    if (currentLevelConfig && !ChallengeSystem.isPlaying()) {
        applyLevelMechanics(dtSec, gameInfo.grid, gameInfo);
    }

    // 炮台发射弹珠更新
    if (gameInfo.cannon) {
        gameInfo.cannon.update(dt, gameInfo.grid, (snappedMarble) => {
            if (gameInfo.state !== 'PLAYING') return;
            let matchMade = Logic.processSnap(snappedMarble, gameInfo.grid, gameInfo);

            // 触发角色技能（命中时）
            if (CharacterSystem.activeCharId) {
                CharacterSystem.onMarbleSnapped(snappedMarble, gameInfo.grid, gameInfo);
            }

            totalShots++;
            levelTotalShots++;

            // 消除计数
            if (matchMade) {
                levelClearCount += 3; // 至少消除3个

                // 挑战模式额外消除计数
                if (ChallengeSystem.isPlaying()) {
                    ChallengeSystem.onEliminated(levelClearCount);
                }

                // extra_drop 机制
                if (shouldExtraDrop()) {
                    for (let i = 0; i < getExtraDropCount(); i++) {
                        Logic.dropFloating(gameInfo.grid, gameInfo);
                    }
                }
            }

            // 下压逻辑
            const effectiveInterval = getEffectivePushInterval();
            const windRushActive = CharacterSystem.isWindRushActive();
            if (windRushActive) levelTotalShots++; // 风怒下白送一次射击计数
            const shouldPush = !windRushActive && totalShots >= effectiveInterval;

            if (shouldPush) {
                if (matchMade) {
                    setTimeout(() => {
                        if (gameInfo.state === 'PLAYING') {
                            pushDownSafely();
                        }
                    }, 500);
                } else {
                    pushDownSafely();
                }
                totalShots = 0;
            }

            // speed_up / double_pressure 射击驱动
            if (currentLevelConfig && currentLevelConfig.specialMechanic) {
                const mech = currentLevelConfig.specialMechanic;
                if ((mech.type === 'speed_up' || mech.type === 'double_pressure') && !mech._shotCount) {
                    mech._shotCount = 0;
                }
                if (mech._shotCount !== undefined) {
                    mech._shotCount++;
                    if (mech._shotCount >= mech.interval) {
                        mech._shotCount = 0;
                        const extras = mech.pushExtra || 1;
                        for (let i = 0; i < extras; i++) {
                            pushDownSafely();
                            if (gameInfo.state !== 'PLAYING') break;
                        }
                    }
                }
            }

            if (gameInfo.state === 'PLAYING') {
                checkGameStatus();
            }
        });
    }

    // 清理死球
    for (let r = 0; r < gameInfo.grid.cells.length; r++) {
        for (let c = 0; c < gameInfo.grid.cells[r].length; c++) {
            const m = gameInfo.grid.cells[r][c];
            if (m) {
                m.update();
                if (m.dead) {
                    gameInfo.grid.cells[r][c] = null;
                }
            }
        }
    }

    // 更新每日任务统计
    if (levelTotalShots === 1) { /* 只在开局时更新一次 */ }
}

function pushDownSafely() {
    const frozen = CharacterSystem.getFrozenRows();
    if (frozen > 0) {
        // 冻结：完全跳过本次下压（不只是延迟）
        console.log('[Frost] 霜冻跳过本次下压，剩余行数:' + frozen);
        return;
    }
    if (isLevelFrozen()) return;

    Logic.pushDownGrid(gameInfo.grid);

    if (Logic.checkGameOver(gameInfo.grid, gameInfo.cannon.y - 40)) {
        // 清理飞行弹珠防止卡死
        if (gameInfo.cannon) {
            gameInfo.cannon.flyingMarble = null;
            gameInfo.cannon.piercingMode = false;
            gameInfo.cannon.piercingShots = 0;
        }
        gameOver();
    }
}

function checkGameStatus() {
    if (Logic.checkGameOver(gameInfo.grid, gameInfo.cannon.y - 40)) {
        gameOver();
        return;
    }

    // 关卡通关检查
    if (!ChallengeSystem.isPlaying() && checkLevelComplete()) {
        if (gameInfo.state === 'PLAYING') {
            gameInfo.state = 'GAMEOVER';
            // 清理飞行弹珠防止 draw 循环卡死
            if (gameInfo.cannon) {
                gameInfo.cannon.flyingMarble = null;
                gameInfo.cannon.piercingMode = false;
                gameInfo.cannon.piercingShots = 0;
            }
            if (gameInfo.score > bestScore) {
                bestScore = gameInfo.score;
                localStorage.setItem('lungpaopaoBestScore', bestScore);
                document.getElementById('best-score').innerText = bestScore;
            }
            try { UI.returnFromGame('level_complete'); } catch(e) { console.error(e); }
        }
    }
}

function draw() {
    if (!gameInfo || gameInfo.state !== 'PLAYING') return;
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 480, 640);
    ctx.save();
    gameInfo.particles.applyShake(ctx);
    ctx.save();
    ctx.translate(0, gameInfo.gridOffset || 0);
    gameInfo.grid.draw(ctx);
    ctx.restore();
    if (gameInfo.cannon) gameInfo.cannon.draw(ctx);
    gameInfo.particles.draw(ctx);
    ctx.restore();
}

function gameOver() {
    if (!gameInfo || gameInfo.state === 'GAMEOVER') return;
    gameInfo.state = 'GAMEOVER';
    // 清理所有飞行弹珠防止卡死
    if (gameInfo.cannon) {
        gameInfo.cannon.flyingMarble = null;
        gameInfo.cannon.piercingMode = false;
        gameInfo.cannon.piercingShots = 0;
    }
    if (gameInfo.audio) gameInfo.audio.play('gameover');

    if (gameInfo.score > bestScore) {
        bestScore = gameInfo.score;
        localStorage.setItem('lungpaopaoBestScore', bestScore);
        document.getElementById('best-score').innerText = bestScore;
    }

    document.getElementById('game-info-bar')?.classList.add('hidden');
    document.getElementById('level-hud')?.classList.add('hidden');

    if (ChallengeSystem.isPlaying()) {
        ChallengeSystem.onGameOver();
    } else {
        UI.returnFromGame('game_over');
    }
}

// ── 技能按钮 ──────────────────────────────────
function updateLevelHUD() {
    const bar = document.getElementById('game-info-bar');
    if (!bar) return;
    const config = currentLevelConfig;
    if (!config || (gameInfo && gameInfo.state !== 'PLAYING')) { bar.classList.add('hidden'); return; }

    bar.classList.remove('hidden');
    document.getElementById('level-hud-name').textContent = '🏰 ' + (config.name || '');

    if (config.condition.type === 'survive') {
        document.getElementById('level-hud-target').textContent = `${levelTotalShots}/${config.condition.shots}发`;
    } else if (config.condition.type === 'clear_count') {
        document.getElementById('level-hud-target').textContent = `${levelClearCount}/${config.condition.count}球`;
    }
    document.getElementById('level-hud-shots').textContent = levelTotalShots;

    const hudScore = document.getElementById('hud-score');
    if (hudScore) hudScore.textContent = gameInfo ? gameInfo.score : 0;
}

function updateSkillButton() {
    const btn = document.getElementById('skill-btn');
    if (!btn) return;

    if (gameInfo && gameInfo.state === 'PLAYING') {
        btn.classList.remove('hidden');
        const def = CharacterSystem.getDef();
        const icon = btn.querySelector('.skill-icon');
        if (def && icon) {
            icon.textContent = def.skill.icon || '⚡';
        }

        const ready = CharacterSystem.isSkillReady();
        const queued = CharacterSystem.skillQueued;
        const remaining = CharacterSystem.getShotsRemaining();
        const progress = CharacterSystem.getCooldownProgress();

        // 三态视觉效果
        if (queued) {
            // 已点击等待发射：暗橙色 + ▶
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
            btn.style.background = 'rgba(255, 152, 0, 0.4)';
        } else if (ready) {
            // 就绪：绿色高光脉冲
            btn.style.transform = 'scale(1.15)';
            btn.style.boxShadow = '0 0 24px rgba(76,175,80,0.9), 0 0 48px rgba(76,175,80,0.4)';
            btn.style.background = 'rgba(76, 175, 80, 0.3)';
        } else {
            // 冷却中：正常
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
            btn.style.background = 'rgba(0,0,0,0.6)';
        }

        const ring = document.getElementById('skill-cooldown-ring');
        if (ring) {
            const ctx = ring.getContext('2d');
            const r = 26, cx = 30, cy = 30;
            ctx.clearRect(0, 0, 60, 60);

            // 背景环
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = queued ? '#e65100' : (ready ? '#2e7d32' : '#444');
            ctx.lineWidth = 4;
            ctx.stroke();

            // 进度环
            ctx.beginPath();
            ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.strokeStyle = queued ? '#ff6d00' : (ready ? '#4caf50' : '#ff9800');
            ctx.lineWidth = 4;
            ctx.stroke();

            // 中间文字
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (queued) ctx.fillText('▶', cx, cy);
            else if (ready) ctx.fillText('✓', cx, cy);
            else ctx.fillText(remaining, cx, cy);

            // 就绪脉冲
            if (ready) {
                ctx.beginPath();
                ctx.arc(cx, cy, r + 4 + Math.sin(Date.now() / 180) * 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(76,175,80,0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    } else {
        btn.classList.add('hidden');
    }
}

// 游戏退出按钮
// Show exit button during gameplay
document.getElementById('exit-game-btn').classList.remove('hidden');
document.getElementById('exit-game-btn').addEventListener('click', exitGame);
