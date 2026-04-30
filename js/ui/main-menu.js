// 主菜单
function renderMainMenu() {
    const el = document.getElementById('main-menu');
    if (!el) return;
    el.innerHTML = `
        <div class="menu-logo">
            <img src="js/assests/red.png" class="logo-big" alt="">
            <h1>🐉 龙泡泡大作战</h1>
        </div>
        <div class="menu-buttons">
            <button class="menu-btn primary" onclick="UI.showScreen('level-select')">
                <span class="btn-icon">🎮</span> 开始游戏
            </button>
            <button class="menu-btn" onclick="UI.showScreen('challenge')">
                <span class="btn-icon">⏱️</span> 计时挑战
            </button>
            <button class="menu-btn" onclick="UI.showScreen('character-detail')">
                <span class="btn-icon">🔮</span> 角色图鉴
            </button>
            <button class="menu-btn" onclick="UI.showScreen('gacha')">
                <span class="btn-icon">🎰</span> 扭蛋抽卡
            </button>
            <button class="menu-btn" onclick="UI.showScreen('quest')">
                <span class="btn-icon">📋</span> 每日任务
                <span class="badge" id="quest-badge" style="display:none"></span>
            </button>
        </div>
        <div class="menu-gold">💰 <span class="gold-amount">${saveData.gold}</span></div>
    `;
}
