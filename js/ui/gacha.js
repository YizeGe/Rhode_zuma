// 扭蛋界面
function renderGacha() {
    const el = document.getElementById('gacha-screen');
    if (!el) return;

    const pity = GachaSystem.getPityText();
    const rates = window.GACHA_RATES || {};

    let html = `
        <div class="screen-header">
            <button class="back-btn" onclick="UI.showScreen('main-menu')">← 返回</button>
            <span class="screen-title">🎰 扭蛋抽卡</span>
            <span class="gold-display">💰 <span class="gold-amount">${saveData.gold}</span></span>
        </div>
        <div class="gacha-machine-area">
            <div class="gacha-visual">🎰</div>
            <div class="gacha-pity">
                <div class="pity-row">
                    <span>SR 保底</span>
                    <div class="pity-bar"><div class="pity-fill" style="width:${(pity.srProgress / pity.srMax) * 100}%"></div></div>
                    <span>${pity.srProgress}/${pity.srMax}</span>
                </div>
                <div class="pity-row">
                    <span>SSR 保底</span>
                    <div class="pity-bar"><div class="pity-fill ssr" style="width:${(pity.ssrProgress / pity.ssrMax) * 100}%"></div></div>
                    <span>${pity.ssrProgress}/${pity.ssrMax}</span>
                </div>
            </div>
            <div class="gacha-buttons">
                <button class="gacha-btn" onclick="doGachaSingle()">
                    单抽<br><small>💰 ${rates.single?.cost || 200}</small>
                </button>
                <button class="gacha-btn multi" onclick="doGachaMulti()">
                    十连<br><small>💰 ${rates.multi?.cost || 1800}</small>
                </button>
            </div>
        </div>
        <div id="gacha-result"></div>
    `;
    el.innerHTML = html;
}

function doGachaSingle() {
    const rates = window.GACHA_RATES;
    if (!rates) return;
    if (!spendGold(rates.single?.cost || 200)) { alert('金币不足！'); return; }
    const result = GachaSystem.roll();
    saveSaveData();
    showGachaResult(result);
    renderGacha();
}

function doGachaMulti() {
    const rates = window.GACHA_RATES;
    if (!rates) return;
    if (!spendGold(rates.multi?.cost || 1800)) { alert('金币不足！'); return; }
    const results = GachaSystem.rollMulti();
    saveSaveData();
    showGachaMultiResult(results);
    renderGacha();
}

function showGachaResult(result) {
    if (!result || !result.character) return;
    const rarityColor = result.character.rarityColor || '#666';
    const detail = document.getElementById('gacha-result');
    if (!detail) return;

    detail.innerHTML = `
        <div class="gacha-result-card" style="border-color:${rarityColor}">
            <div class="result-rarity" style="background:${rarityColor}">${result.character.rarity}</div>
            <div class="result-emoji">${result.character.emoji}</div>
            <div class="result-name">${result.character.name}</div>
            <div class="result-type">${result.newChar ? '🆕 新角色获取！' : `已有角色 +${result.compensation}金币补偿`}</div>
        </div>`;
}

function showGachaMultiResult(results) {
    const detail = document.getElementById('gacha-result');
    if (!detail) return;

    let html = '';
    for (const r of results) {
        if (!r || !r.character) continue;
        const rc = r.character.rarityColor || '#666';
        html += `
            <div class="gacha-result-card mini" style="border-color:${rc}">
                <span style="background:${rc}" class="mini-rarity">${r.character.rarity}</span>
                <span>${r.character.emoji} ${r.character.name}</span>
                <span>${r.newChar ? '🆕' : `+${r.compensation}💰`}</span>
            </div>`;
    }
    detail.innerHTML = `<div class="gacha-multi-results">${html}</div>`;
}
