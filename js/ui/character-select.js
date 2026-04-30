// 角色选择界面
function renderCharacterSelect() {
    const el = document.getElementById('character-select');
    if (!el) return;
    window._selectedLevelId = window._selectedLevelId || '1-1';

    const chars = saveData.ownedCharacters.map(oc => {
        const def = getCharacterDef(oc.id);
        return def ? { ...def, level: oc.level, skillLevel: oc.skillLevel } : null;
    }).filter(Boolean);

    const selected = saveData.selectedCharacter;
    let html = `
        <div class="screen-header">
            <button class="back-btn" onclick="UI.showScreen('level-select')">← 返回</button>
            <span class="screen-title">⚔️ 选择角色</span>
            <span class="gold-display">💰 <span class="gold-amount">${saveData.gold}</span></span>
        </div>
        <div class="character-grid">`;

    if (chars.length === 0) {
        html += `<p class="empty-msg">还没有角色，去扭蛋抽卡吧！</p>`;
    } else {
        for (const ch of chars) {
            const isSelected = selected === ch.id;
            const rarityBg = {
                'N': '#666', 'R': '#4caf50', 'SR': '#2196f3', 'SSR': '#ff9800'
            }[ch.rarity] || '#666';

            html += `
                <div class="char-select-card${isSelected ? ' selected' : ''}" 
                     style="border-color:${rarityBg}" 
                     onclick="selectcharacter('${ch.id}')">
                    <div class="char-select-rarity" style="background:${rarityBg}">${ch.rarity}</div>
                    <div class="char-select-emoji">${ch.emoji}</div>
                    <div class="char-select-name">${ch.name}</div>
                    <div class="char-select-level">Lv.${ch.level} 技能 ${ch.skillLevel}</div>
                    <div class="char-select-skill">${ch.skill.name}</div>
                    ${isSelected ? '<div class="char-selected-badge">✓ 已选</div>' : ''}
                </div>`;
        }
    }
    html += `</div>`;
    el.innerHTML = html;
}

function selectcharacter(charId) {
    console.log('[Select] clicked', charId, 'selected:', saveData.selectedCharacter);
    if (saveData.selectedCharacter === charId) {
        // 已选择，点第二次开始游戏
        const levelId = window._selectedLevelId || '1-1';
        UI.startGame(levelId, charId);
        return;
    }
    // 第一次点击：标记选择
    saveData.selectedCharacter = charId;
    saveSaveData();
    renderCharacterSelect();
}

function startWithCharacter(charId) {
    saveData.selectedCharacter = charId;
    saveSaveData();
    const levelId = window._selectedLevelId || '1-1';
    UI.startGame(levelId, charId);
}

window.selectcharacter = selectcharacter;
window.startWithCharacter = startWithCharacter;
