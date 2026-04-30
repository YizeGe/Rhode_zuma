// 计时挑战界面
function renderChallenge() {
    const el = document.getElementById('challenge-screen');
    if (!el) return;

    const configs = window.CHALLENGE_LEVELS || {};
    const records = saveData.challengeRecords || {};

    let html = `
        <div class="screen-header">
            <button class="back-btn" onclick="UI.showScreen('main-menu')">← 返回</button>
            <span class="screen-title">⏱️ 计时挑战</span>
            <span class="gold-display">💰 <span class="gold-amount">${saveData.gold}</span></span>
        </div>
        <div class="challenge-list">`;

    for (const [key, config] of Object.entries(configs)) {
        const record = records[key] || { best: 0, cleared: 0 };
        html += `
            <div class="challenge-card" onclick="startChallengeMode('${key}')">
                <div class="challenge-header">
                    <span class="challenge-duration">⏱ ${config.duration}s</span>
                    <span class="challenge-name">${config.name}</span>
                </div>
                <div class="challenge-subtitle">${config.subtitle || ''}</div>
                <div class="challenge-record">
                    <span>🏆 最佳: ${record.best}球</span>
                    <span>通关: ${record.cleared}次</span>
                </div>
                <div class="challenge-action">▶ 开始挑战</div>
            </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
}

function startChallengeMode(levelId) {
    const chars = saveData.ownedCharacters;
    if (chars.length === 0) {
        alert('请先去扭蛋获取角色！');
        return;
    }
    const charId = saveData.selectedCharacter || chars[0].id;
    UI.startChallenge(levelId, charId);
}
