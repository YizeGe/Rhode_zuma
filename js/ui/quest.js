// 每日任务界面
function renderQuest() {
    const el = document.getElementById('quest-screen');
    if (!el) return;

    QuestSystem.checkAndReset();
    const quests = QuestSystem.getAll();

    let html = `
        <div class="screen-header">
            <button class="back-btn" onclick="UI.showScreen('main-menu')">← 返回</button>
            <span class="screen-title">📋 每日任务</span>
            <span class="gold-display">💰 <span class="gold-amount">${saveData.gold}</span></span>
        </div>
        <div class="quest-list">`;

    for (const q of quests) {
        const progress = Math.min(q.progress || 0, q.target || 1);
        const pct = (progress / q.target) * 100;
        const done = progress >= q.target;
        const claimed = q.claimed;

        html += `
            <div class="quest-card${done ? ' done' : ''}${claimed ? ' claimed' : ''}">
                <div class="quest-icon">${q.icon || '📋'}</div>
                <div class="quest-info">
                    <div class="quest-name">${q.name}</div>
                    <div class="quest-desc">${q.desc}</div>
                    <div class="quest-progress">
                        <div class="quest-bar"><div class="quest-fill" style="width:${pct}%"></div></div>
                        <span>${progress}/${q.target}</span>
                    </div>
                </div>
                <div class="quest-reward">
                    <div>💰 ${q.reward}</div>
                    ${claimed ? '<span class="claimed-tag">已领取</span>' :
                      done ? `<button onclick="claimQuest('${q.id}')">领取</button>` :
                      ''}
                </div>
            </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
}

function claimQuest(questId) {
    const reward = QuestSystem.claim(questId);
    if (reward) {
        updateGoldDisplays();
        renderQuest();
    }
}
