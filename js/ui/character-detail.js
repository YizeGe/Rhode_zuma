// 角色详情/养成界面
function renderCharacterDetail() {
    const el = document.getElementById('character-detail');
    if (!el) return;

    const allChars = window.CHARACTERS || [];
    const owned = saveData.ownedCharacters;

    let html = `
        <div class="screen-header">
            <button class="back-btn" onclick="UI.showScreen('main-menu')">← 返回</button>
            <span class="screen-title">🔮 角色图鉴</span>
            <span class="gold-display">💰 <span class="gold-amount">${saveData.gold}</span></span>
        </div>
        <div class="character-list">`;

    for (const def of allChars) {
        const oc = owned.find(c => c.id === def.id);
        const owned_ = !!oc;
        const level = oc ? oc.level : 1;
        const skillLevel = oc ? oc.skillLevel : 1;
        const rarityBg = {
            'N': '#666', 'R': '#4caf50', 'SR': '#2196f3', 'SSR': '#ff9800'
        }[def.rarity] || '#666';

        html += `
            <div class="char-detail-card" style="border-left: 4px solid ${rarityBg}">
                <div class="char-detail-header">
                    <span class="char-rarity-badge" style="background:${rarityBg}">${def.rarity}</span>
                    <span class="char-emoji">${def.emoji}</span>
                    <div>
                        <div class="char-name">${def.name}</div>
                        <div class="char-desc">${def.desc}</div>
                    </div>
                </div>
                ${owned_ ? `
                <div class="char-stats">
                    <div>Lv.${level} / 10</div>
                    <div>技能: ${def.skill.name} Lv.${skillLevel} / ${def.skill.maxLevel}</div>
                    <div class="skill-desc">${def.skill.desc}</div>
                    <div class="char-actions">
                        <button onclick="upgradeCharacterAction('${def.id}')" ${level >= 10 ? 'disabled' : ''}>
                            ⬆️ 升级 (${100 + level * 50}金币)
                        </button>
                        <button onclick="upgradeSkillAction('${def.id}')" ${skillLevel >= def.skill.maxLevel ? 'disabled' : ''}>
                            ⚡ 升级技能 (${200 + skillLevel * 100}金币)
                        </button>
                    </div>
                </div>` : `
                <div class="char-locked">🔒 未获得 — 去扭蛋抽取！</div>`}
            </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
}

function upgradeCharacterAction(charId) {
    if (upgradeCharacter(charId)) {
        renderCharacterDetail();
    }
}

function upgradeSkillAction(charId) {
    if (upgradeSkill(charId)) {
        renderCharacterDetail();
    }
}
