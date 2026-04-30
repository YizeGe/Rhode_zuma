// 存档系统 — localStorage 读写
const SAVE_KEY = 'lungpaopao_save';
const SAVE_VERSION = 1;

let saveData = null;

function getDefaultSave() {
    return {
        version: SAVE_VERSION,
        gold: 1000,
        ownedCharacters: [{ id: 'n001', level: 1, skillLevel: 1 }],
        selectedCharacter: 'n001',
        unlockedLevels: ['1-1'],
        levelStars: {},
        totalLevelClears: 0,
        gachaPitySR: 0,
        gachaPitySSR: 0,
        dailyQuests: [],
        dailyQuestResetDate: '',
        achievements: [],
        stats: { totalShots: 0, totalMatches: 0, totalClears: 0, totalSkillUses: 0, totalGacha: 0 },
        bestScore: 0,
        challengeRecords: { '60s': { best: 0, cleared: 0 }, '90s': { best: 0, cleared: 0 }, '120s': { best: 0, cleared: 0 } }
    };
}

function loadSaveData() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            saveData = JSON.parse(raw);
            if (saveData.version !== SAVE_VERSION) {
                saveData = getDefaultSave();
            }
        } else {
            saveData = getDefaultSave();
        }
    } catch (e) {
        saveData = getDefaultSave();
    }
    // 确保内部结构完整
    const defaults = getDefaultSave();
    for (const key of Object.keys(defaults)) {
        if (!(key in saveData)) saveData[key] = defaults[key];
    }
    if (!saveData.challengeRecords) saveData.challengeRecords = defaults.challengeRecords;
    if (!saveData.stats) saveData.stats = defaults.stats;
    if (!saveData.gachaPitySR) saveData.gachaPitySR = 0;
    if (!saveData.gachaPitySSR) saveData.gachaPitySSR = 0;
    if (!saveData.dailyQuests || saveData.dailyQuests.length === 0) {
        saveData.dailyQuests = [];
        saveData.dailyQuestResetDate = '';
    }
    return saveData;
}

function saveSaveData() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
        console.error('存档保存失败:', e);
    }
}

function addGold(amount) {
    saveData.gold += amount;
    saveSaveData();
    updateGoldDisplays();
}

function spendGold(amount) {
    if (saveData.gold < amount) return false;
    saveData.gold -= amount;
    saveSaveData();
    updateGoldDisplays();
    return true;
}

function updateGoldDisplays() {
    document.querySelectorAll('.gold-amount').forEach(el => {
        el.textContent = saveData.gold;
    });
}

function hasCharacter(charId) {
    return saveData.ownedCharacters.some(c => c.id === charId);
}

function getOwnedCharacter(charId) {
    return saveData.ownedCharacters.find(c => c.id === charId) || null;
}

function addCharacter(charId) {
    if (hasCharacter(charId)) return false;
    saveData.ownedCharacters.push({ id: charId, level: 1, skillLevel: 1 });
    saveSaveData();
    return true;
}

function upgradeCharacter(charId) {
    const ch = getOwnedCharacter(charId);
    if (!ch || ch.level >= 10) return false;
    const cost = (window.GACHA_RATES?.levelUpgrade?.base || 100) + ch.level * (window.GACHA_RATES?.levelUpgrade?.perLevel || 50);
    if (!spendGold(cost)) return false;
    ch.level++;
    saveSaveData();
    return true;
}

function upgradeSkill(charId) {
    const ch = getOwnedCharacter(charId);
    const charDef = getCharacterDef(charId);
    if (!ch || !charDef || ch.skillLevel >= charDef.skill.maxLevel) return false;
    const cost = (window.GACHA_RATES?.skillUpgrade?.base || 200) + ch.skillLevel * (window.GACHA_RATES?.skillUpgrade?.perLevel || 100);
    if (!spendGold(cost)) return false;
    ch.skillLevel++;
    saveSaveData();
    return true;
}

function unlockLevel(levelId) {
    if (saveData.unlockedLevels.includes(levelId)) return;
    saveData.unlockedLevels.push(levelId);
    saveSaveData();
}

function recordLevelResult(levelId, shots, maxStars) {
    const prevStars = saveData.levelStars[levelId] || 0;
    if (maxStars > prevStars) saveData.levelStars[levelId] = maxStars;
    saveData.totalLevelClears++;
    saveSaveData();
}

// 加载静态数据
function loadStaticData(callback) {
    let loaded = 0;
    const total = 3;

    function checkDone() { loaded++; if (loaded >= total) callback(); }

    fetch('data/characters.json').then(r => r.json()).then(d => { window.CHARACTERS = d; checkDone(); });
    fetch('data/levels.json').then(r => r.json()).then(d => { window.LEVELS = d; checkDone(); });
    fetch('data/gacha-rates.json').then(r => r.json()).then(d => { window.GACHA_RATES = d; checkDone(); });
}

function loadChallengeConfigs(callback) {
    fetch('data/challenge-levels.json').then(r => r.json()).then(d => {
        window.CHALLENGE_LEVELS = d;
        if (callback) callback();
    }).catch(() => {
        // Fallback if file doesn't exist yet
        window.CHALLENGE_LEVELS = {};
        if (callback) callback();
    });
}

function getCharacterDef(charId) {
    return (window.CHARACTERS || []).find(c => c.id === charId) || null;
}

function getLevelConfig(levelId) {
    return (window.LEVELS || {})[levelId] || null;
}
