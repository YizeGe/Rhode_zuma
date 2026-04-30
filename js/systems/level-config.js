// 关卡配置系统 — 加载关卡、应用特殊机制
let currentLevelConfig = null;
let currentLevelId = null;
let levelClearCount = 0;
let levelTotalShots = 0;

function loadLevelConfig(levelId) {
    currentLevelId = levelId;
    currentLevelConfig = getLevelConfig(levelId);
    levelClearCount = 0;
    levelTotalShots = 0;
    return currentLevelConfig;
}

function getCurrentLevelConfig() {
    return currentLevelConfig;
}

// 应用关卡特殊机制（每帧调用）
function applyLevelMechanics(dtSeconds, grid, gameInfo) {
    const config = currentLevelConfig;
    if (!config || !config.specialMechanic) return;
    const mech = config.specialMechanic;

    // 初始化计时器
    if (!mech._timer) mech._timer = 0;
    if (!mech._active) mech._active = false;
    if (!mech._freezeRemaining) mech._freezeRemaining = 0;

    switch (mech.type) {
        case 'auto_freeze':
            mech._timer += dtSeconds;
            if (mech._timer >= mech.interval && !mech._active) {
                mech._active = true;
                mech._freezeRemaining = mech.duration;
                mech._timer = 0;
            }
            if (mech._active) {
                mech._freezeRemaining -= dtSeconds;
                if (mech._freezeRemaining <= 0) {
                    mech._active = false;
                    mech._freezeRemaining = 0;
                }
            }
            // 冻结期间 pushDownGrid 会跳过这些行
            break;

        case 'extra_drop':
            // 在消除时额外触发（由 Logic 调用）
            break;

        case 'speed_up':
            // 改为射击数触发，不做计时推（防止节奏过快）
            // 兜底：每 30 秒最多推一次
            mech._timer += dtSeconds;
            if (mech._timer >= 99) mech._timer = 99;
            break;

        case 'double_pressure':
            // 改为射击数触发
            mech._timer += dtSeconds;
            if (mech._timer >= 99) mech._timer = 99;
            break;
    }
}

// 获取有效 pushInterval（可能被关卡机制修改）
function getEffectivePushInterval() {
    const config = currentLevelConfig;
    if (!config) return 4;
    let interval = config.pushInterval || 4;
    if (config.specialMechanic && config.specialMechanic.type === 'double_pressure') {
        interval += (config.specialMechanic.pushIntervalBonus || 0);
    }
    return Math.max(1, interval);
}

// 关卡是否处于冻结状态
function isLevelFrozen() {
    const config = currentLevelConfig;
    if (!config || !config.specialMechanic) return false;
    const mech = config.specialMechanic;
    return mech.type === 'auto_freeze' && mech._active;
}

// 关卡是否应额外掉落
function shouldExtraDrop() {
    const config = currentLevelConfig;
    if (!config || !config.specialMechanic) return false;
    return config.specialMechanic.type === 'extra_drop';
}

function getExtraDropCount() {
    const config = currentLevelConfig;
    if (!config || !config.specialMechanic) return 0;
    return config.specialMechanic.dropExtra || 1;
}

// 检查通关条件
function checkLevelComplete() {
    const config = currentLevelConfig;
    if (!config || !config.condition) return false;

    if (config.condition.type === 'survive') {
        if (levelTotalShots >= config.condition.shots) {
            return true;
        }
    } else if (config.condition.type === 'clear_count') {
        if (levelClearCount >= config.condition.count) {
            return true;
        }
    }
    return false;
}

// 计算星级
function calculateStars() {
    const config = currentLevelConfig;
    if (!config || !config.stars) return 1;

    let stars = 1;
    for (const starCondition of config.stars) {
        let met = false;
        if (config.condition.type === 'survive' && starCondition.shots !== undefined) {
            met = levelTotalShots <= starCondition.shots;
        } else if (starCondition.count !== undefined) {
            met = levelClearCount >= starCondition.count;
        }
        if (met) stars++;
    }
    return Math.min(stars, 3);
}

// 增加消除计数
function addLevelClear(count) {
    levelClearCount += count;
}
