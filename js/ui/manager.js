// UI 管理器 — 屏幕切换 + 通用逻辑
const UI = {
    currentScreen: null,

    init() {
        // 绑定所有屏幕
        this.screens = {
            'main-menu': document.getElementById('main-menu'),
            'level-select': document.getElementById('level-select'),
            'character-select': document.getElementById('character-select'),
            'gacha': document.getElementById('gacha-screen'),
            'character-detail': document.getElementById('character-detail'),
            'quest': document.getElementById('quest-screen'),
            'challenge': document.getElementById('challenge-screen')
        };
        this.overlay = document.getElementById('ui-overlay');
        this.canvasWrapper = document.querySelector('.canvas-wrapper');

        this.showScreen('main-menu');
        updateGoldDisplays();
        QuestSystem.checkAndReset();
    },

    showScreen(screenId) {
        // 隐藏所有
        Object.values(this.screens).forEach(s => s.classList.add('hidden'));
        // 显示目标
        const target = this.screens[screenId];
        if (target) {
            target.classList.remove('hidden');
            this.currentScreen = screenId;
            updateGoldDisplays();
            // 进入界面时重新渲染（数据可能已更改）
            if (screenId === 'level-select') renderLevelSelect();
            if (screenId === 'character-detail') renderCharacterDetail();
            if (screenId === 'character-select') {
            saveData.selectedCharacter = null;
            renderCharacterSelect();
        }
            if (screenId === 'gacha') renderGacha();
            if (screenId === 'quest') renderQuest();
            if (screenId === 'challenge') renderChallenge();
        }

        // 更新顶部导航红点
        const claimable = QuestSystem.getClaimableCount();
        const badge = document.getElementById('quest-badge');
        if (badge) badge.textContent = claimable > 0 ? claimable : '';
        if (badge) badge.style.display = claimable > 0 ? 'inline' : 'none';

        // 是否显示菜单 overlay 和 Canvas
        const isInGame = screenId === 'game';
        if (this.overlay) this.overlay.classList.toggle('hidden', isInGame);
        if (this.canvasWrapper) this.canvasWrapper.classList.toggle('hidden', !isInGame);
        
        // 游戏时隐藏 header，显示退出按钮，隐藏/显示 HUD
        const header = document.getElementById('game-header');
        const exitBtn = document.getElementById('exit-game-btn');
        const levelHud = document.getElementById('level-hud');
        if (header) header.classList.toggle('hidden', isInGame);
        if (exitBtn) exitBtn.classList.toggle('hidden', !isInGame);
        const infoBar = document.getElementById('game-info-bar');
        if (infoBar && !isInGame) infoBar.classList.add('hidden');
    },

    // 进入游戏
    startGame(levelId, characterId) {
        loadLevelConfig(levelId);
        CharacterSystem.init(characterId);

        initLevelWithConfig(currentLevelConfig);
        document.getElementById('game-overlay').classList.add('hidden');

        this.showScreen('game');
    },

    // 进入计时挑战
    startChallenge(levelId, characterId) {
        CharacterSystem.init(characterId);
        ChallengeSystem.init(levelId);
        const config = ChallengeSystem.getConfig();
        if (!config) return;

        initChallengeLevel(config);
        document.getElementById('game-overlay').classList.add('hidden');

        this.showScreen('game');

        // 显示挑战 HUD
        const hud = document.getElementById('challenge-hud');
        if (hud) hud.classList.remove('hidden');
    },

    // 关卡返回
    returnFromGame(reason) {
        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');

        // 隐藏所有 HUD
        document.getElementById('challenge-hud')?.classList.add('hidden');
        document.getElementById('game-info-bar')?.classList.add('hidden');

        if (reason === 'level_complete') {
            const stars = calculateStars();
            const config = currentLevelConfig;
            const gold = (config?.rewards?.gold || 50) * stars;
            const firstBonus = (!saveData.levelStars[currentLevelId] && config?.rewards?.firstClearBonus) ? config.rewards.firstClearBonus : 0;

            recordLevelResult(currentLevelId, levelTotalShots, stars);
            addGold(gold + firstBonus);
            QuestSystem.advance('levelClear', 1);
            QuestSystem.advance('totalMatch', levelClearCount);

            // 解锁下一关
            const parts = currentLevelId.split('-');
            const chapter = parseInt(parts[0]);
            const level = parseInt(parts[1]);
            if (level < 3) {
                unlockLevel(`${chapter}-${level + 1}`);
            } else {
                unlockLevel(`${chapter + 1}-1`);
            }

            title.textContent = '🎉 通关！';
            const statsDiv = overlay.querySelector('.final-stats');
            if (statsDiv) {
                statsDiv.innerHTML = `
                    <p>星级: <span>${'⭐'.repeat(stars)}</span></p>
                    <p>💰 +${gold} 金币</p>
                    ${firstBonus > 0 ? `<p>🎁 首次通关 +${firstBonus}</p>` : ''}
                `;
            }
            const btn = document.getElementById('restart-btn');
            if (btn) {
                btn.textContent = '📋 返回关卡选择';
                btn.onclick = () => {
                    overlay.classList.add('hidden');
                    UI.showScreen('level-select');
                };
            }
            overlay.classList.remove('hidden');

        } else if (reason === 'game_over') {
            title.textContent = '💔 游戏结束';
            const statsDiv = overlay.querySelector('.final-stats');
            if (statsDiv) {
                statsDiv.innerHTML = `<p>得分: <span>${gameInfo.score}</span></p>`;
            }
            const btn = document.getElementById('restart-btn');
            if (btn) {
                btn.textContent = '🔄 重试';
                btn.onclick = () => {
                    overlay.classList.add('hidden');
                    if (ChallengeSystem.isPlaying()) {
                        ChallengeSystem.restart();
                    } else {
                        UI.startGame(currentLevelId, CharacterSystem.activeCharId);
                    }
                };
            }
            overlay.classList.remove('hidden');
        }
    }
};

// 游戏循环控制
let gameLoopActive = false;
