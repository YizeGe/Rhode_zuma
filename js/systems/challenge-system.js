// 计时挑战系统
const ChallengeSystem = {
    config: null,
    levelId: null,
    timeLeft: 0,
    totalCleared: 0,
    state: 'IDLE',  // IDLE / PLAYING / GAMEOVER / TIMEOUT
    timerInterval: null,
    challengeStartTime: 0,

    // 初始化挑战
    init(levelId) {
        this.levelId = levelId;
        this.config = (window.CHALLENGE_LEVELS || {})[levelId];
        if (!this.config) return false;

        this.timeLeft = this.config.duration;
        this.totalCleared = 0;
        this.state = 'PLAYING';
        this.challengeStartTime = Date.now();
        return true;
    },

    // 获取配置
    getConfig() {
        return this.config;
    },

    // 更新计时
    update(dtMs) {
        if (this.state !== 'PLAYING') return;

        this.timeLeft -= dtMs / 1000;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.end('TIMEOUT');
        }
    },

    // 消除时记录
    onEliminated(count) {
        if (this.state === 'PLAYING') {
            this.totalCleared += count;
        }
    },

    // 球链触底（Game Over）
    onGameOver() {
        if (this.state === 'PLAYING') {
            this.end('GAMEOVER');
        }
    },

    // 结束挑战
    end(reason) {
        this.state = reason;
        if (gameInfo) gameInfo.state = 'GAMEOVER';

        // 计算金币
        let gold = 0;
        if (this.config && this.config.goldFormula) {
            const { base, bonus, threshold } = this.config.goldFormula;
            const baseGold = this.totalCleared * base;
            const bonusGold = Math.max(0, this.totalCleared - threshold) * bonus;
            gold = baseGold + bonusGold;
        }

        // 更新记录
        let newBest = false;
        const record = saveData.challengeRecords[this.levelId] || { best: 0, cleared: 0 };
        if (this.totalCleared > record.best) {
            record.best = this.totalCleared;
            newBest = true;
        }
        record.cleared = (record.cleared || 0) + 1;
        saveData.gold += gold;
        saveSaveData();
        updateGoldDisplays();

        // 更新每日任务
        QuestSystem.advance('totalMatch', this.totalCleared);

        // 显示结算界面
        this.showResult(gold, newBest);
    },

    // 结算界面
    showResult(gold, newBest) {
        const record = saveData.challengeRecords[this.levelId] || { best: 0 };
        const dur = this.config ? this.config.duration : 0;

        const resultHTML = `
            <div class="challenge-result">
                <h2>⏱️ 挑战结束！</h2>
                <div class="result-stats">
                    <div class="stat-row">
                        <span>消除球数</span>
                        <span class="stat-value">${this.totalCleared}</span>
                    </div>
                    <div class="stat-row${newBest ? ' new-record' : ''}">
                        <span>最高纪录</span>
                        <span class="stat-value">${record.best}${newBest ? ' 🆕' : ''}</span>
                    </div>
                    <div class="stat-row">
                        <span>获得金币</span>
                        <span class="stat-value gold">💰 ${gold}</span>
                    </div>
                </div>
                <div class="result-buttons">
                    <button onclick="ChallengeSystem.restart()">🔄 再来一局</button>
                    <button onclick="window.UI?.showScreen('main-menu')">🏠 返回</button>
                </div>
            </div>
        `;

        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');
        if (overlay && title) {
            title.textContent = '⏱️ 挑战结束！';
            document.getElementById('final-score').textContent = this.totalCleared;
            overlay.classList.remove('hidden');
            // 更新 overlay 内容
            const statsDiv = overlay.querySelector('.final-stats');
            if (statsDiv) {
                statsDiv.innerHTML = `
                    <p>消除: <span>${this.totalCleared}</span></p>
                    <p>最高纪录: <span>${record.best}${newBest ? ' 🆕' : ''}</span></p>
                    <p>💰 +${gold} 金币</p>
                `;
            }
            const btn = document.getElementById('restart-btn');
            if (btn) {
                btn.textContent = '🔄 再来一局';
                btn.onclick = () => ChallengeSystem.restart();
            }
        }
    },

    // 重新开始
    restart() {
        document.getElementById('game-overlay').classList.add('hidden');
        document.getElementById('score').textContent = '0';
        if (gameInfo) {
            gameInfo.score = 0;
            gameInfo.state = 'PLAYING';
        }
        this.init(this.levelId);
        initChallengeLevel(this.config);
        if (window.gameInfo) {
            window.gameInfo.state = 'PLAYING';
        }
    },

    // 获取剩余时间（秒）
    getTimeLeft() {
        return Math.max(0, Math.ceil(this.timeLeft));
    },

    // 获取时间字符串
    getTimeStr() {
        const sec = this.getTimeLeft();
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    // 是否进行中
    isPlaying() {
        return this.state === 'PLAYING';
    }
};

// 初始化挑战关卡游戏
function initChallengeLevel(config) {
    if (!config) return;

    // 创建 gameInfo（如果还不存在）
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

    gameInfo.grid = new Grid();
    gameInfo.grid.init(config.gridRows || 5);

    // 填充初始行
    for (let r = 0; r < Math.min(config.gridRows || 5, 4); r++) {
        const cols = (r % 2 === 0) ? GRID_CONFIG.cols : GRID_CONFIG.cols - 1;
        for (let c = 0; c < cols; c++) {
            const typeInfo = MARBLE_TYPES[Math.floor(Math.random() * Math.min(config.marbleTypes || 5, MARBLE_TYPES.length))];
            const pos = gameInfo.grid.getScreenPos(r, c);
            const marble = new Marble(r, c, typeInfo, pos.x, pos.y);
            marble.triggerBounce();
            gameInfo.grid.addMarble(marble);
        }
    }

    gameInfo.cannon = new Cannon(480 / 2, 640 - 40);
    gameInfo.score = 0;
    document.getElementById('score').textContent = '0';

    // 隐藏挑战结束 overlay
    document.getElementById('game-overlay').classList.add('hidden');
}
