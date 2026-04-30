// 关卡选择界面
function renderLevelSelect() {
    const el = document.getElementById('level-select');
    if (!el) return;

    const chapters = [
        { id: 1, name: '新手村', desc: '基础操作教学', emoji: '🏡' },
        { id: 2, name: '火山遗迹', desc: '下压节奏加快', emoji: '🌋' },
        { id: 3, name: '雷电试炼', desc: '额外掉落清场', emoji: '⚡' },
        { id: 4, name: '暗影森林', desc: '定时额外下压', emoji: '🌲' },
        { id: 5, name: '最终试炼', desc: '双重压力极限', emoji: '🔥' }
    ];

    let html = `
        <div class="screen-header">
            <button class="back-btn" onclick="UI.showScreen('main-menu')">← 返回</button>
            <span class="screen-title">📋 关卡选择</span>
            <span class="gold-display">💰 <span class="gold-amount">${saveData.gold}</span></span>
        </div>
        <div class="level-grid">`;

    for (const ch of chapters) {
        const unlocked = saveData.unlockedLevels.some(l => l.startsWith(`${ch.id}-`));
        html += `
            <div class="chapter-card${unlocked ? '' : ' locked'}" onclick="${unlocked ? `showChapterLevels(${ch.id})` : ''}">
                <div class="chapter-emoji">${unlocked ? ch.emoji : '🔒'}</div>
                <div class="chapter-name">第${ch.id}章 ${ch.name}</div>
                <div class="chapter-desc">${ch.desc}</div>
            </div>`;
    }
    html += `</div><div id="level-detail"></div>`;
    el.innerHTML = html;
}

function showChapterLevels(chapter) {
    const detail = document.getElementById('level-detail');
    if (!detail) return;

    const levels = [];
    for (let i = 1; i <= 3; i++) {
        const id = `${chapter}-${i}`;
        const config = getLevelConfig(id);
        if (config) levels.push({ id, config });
    }

    let html = `<div class="level-detail-header">
        <button class="back-btn" onclick="renderLevelSelect();document.getElementById('level-detail').innerHTML=''">← 返回章节</button>
        <span>选择关卡</span>
    </div>`;

    for (const { id, config } of levels) {
        const unlocked = saveData.unlockedLevels.includes(id);
        const stars = saveData.levelStars[id] || 0;
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

        html += `
            <div class="level-card${unlocked ? '' : ' locked'}" ${unlocked ? `onclick="selectCharacter('${id}')"` : ''}>
                <div class="level-info">
                    <div class="level-name">${id} ${config.name}</div>
                    <div class="level-stars">${unlocked ? starStr : '🔒 未解锁'}</div>
                </div>
                <div class="level-reward">💰 ${config.rewards.gold}</div>
            </div>`;
    }
    detail.innerHTML = html;
}

function selectCharacter(levelId) {
    window._selectedLevelId = levelId;
    UI.showScreen('character-select');
}
