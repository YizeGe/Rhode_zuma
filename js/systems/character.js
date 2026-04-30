// 角色系统 — 射击计数冷却 + 手动技能触发
// 内置角色数据（fetch失败时的fallback）
const FALLBACK_CHARS = {
    "n001": {"id":"n001","name":"爆破新手","rarity":"N","skill":{"id":"shake_bomb","name":"震荡弹","cooldown":10,"icon":"💣","params":{"radius":2}},"stats":{"fireRate":1,"pierce":false,"skillPower":1}},
    "r001": {"id":"r001","name":"疾风射手","rarity":"R","skill":{"id":"wind_rush","name":"疾风连射","cooldown":8,"icon":"💨","params":{"shots":3}},"stats":{"fireRate":1.2,"pierce":false,"skillPower":1}},
    "r002": {"id":"r002","name":"雷电使者","rarity":"R","skill":{"id":"chain_lightning","name":"链式闪电","cooldown":12,"icon":"⚡","params":{"chainLength":999}},"stats":{"fireRate":1,"pierce":false,"skillPower":1}},
    "s001": {"id":"s001","name":"冰霜巫灵","rarity":"SR","skill":{"id":"frost_ray","name":"霜冻射线","cooldown":15,"icon":"❄️","params":{"freezeDuration":4,"rows":1}},"stats":{"fireRate":0.9,"pierce":false,"skillPower":1}},
    "s002": {"id":"s002","name":"龙魂使者","rarity":"SR","skill":{"id":"dragon_pierce","name":"龙息穿透","cooldown":14,"icon":"🔥","params":{"shots":2,"pierceRadius":2}},"stats":{"fireRate":1,"pierce":true,"skillPower":1}},
    "ss001":{"id":"ss001","name":"星辰法师","rarity":"SSR","skill":{"id":"stardust_convert","name":"星尘转化","cooldown":20,"icon":"✨","params":{"radius":2,"chainReaction":true}},"stats":{"fireRate":0.85,"pierce":false,"skillPower":1.2}}
};

const CharacterSystem = {
    activeCharId: null,
    skillShotsRemaining: 0,
    skillMaxShots: 0,
    skillState: {},
    skillQueued: false,

    init(characterId) {
        this.activeCharId = characterId;
        this.skillState = {};
        this.skillQueued = false;
        const def = getCharacterDef(characterId);
        console.log('[Init] charId=' + characterId + ' def=' + (def ? def.name : 'NULL') + ' CHARS=' + (window.CHARACTERS ? window.CHARACTERS.length : 'UNDEF'));
        if (def) {
            this.skillMaxShots = def.skill.cooldown;
            this.skillShotsRemaining = def.skill.cooldown;
        } else {
            console.warn('[Init] 角色数据未找到！使用默认冷却10');
            this.skillMaxShots = 10;
            this.skillShotsRemaining = 10;
        }
        console.log('[Init] 冷却设为 ' + this.skillMaxShots + ' 发');
    },

    getDef() { 
        const d = getCharacterDef(this.activeCharId);
        if (!d && this.activeCharId) {
            // fetch 失败时的 fallback
            const fb = FALLBACK_CHARS[this.activeCharId];
            if (fb) return fb;
        }
        return d;
    },
    getSkillLevel() { const ch = getOwnedCharacter(this.activeCharId); return ch ? ch.skillLevel : 1; },

    // 发射后调用
    onShotFired() {
        if (!this.activeCharId) return;
        if (this.skillQueued) return;
        if (this.skillShotsRemaining > 0) this.skillShotsRemaining--;
        // 疾风连射击数递减
        if (this.skillState.windRushShots > 0) this.skillState.windRushShots--;
        if (this.skillShotsRemaining <= 0) console.log('[Shot] 🔔 技能已就绪！');
    },

    isSkillReady() { return this.skillShotsRemaining <= 0 && !this.skillQueued; },

    getCooldownProgress() {
        if (this.skillMaxShots <= 0) return 1;
        if (this.skillQueued) return 1;
        return 1 - (this.skillShotsRemaining / this.skillMaxShots);
    },
    getShotsRemaining() { return Math.max(0, this.skillShotsRemaining); },

    // 玩家点击技能按钮
    activateSkill() {
        if (!this.isSkillReady()) return false;
        const def = this.getDef();
        if (!def) return false;
        this.skillQueued = true;
        saveData.stats.totalSkillUses = (saveData.stats.totalSkillUses || 0) + 1;
        saveSaveData();
        if (def.skill.id === 'dragon_pierce') {
            const shots = def.skill.params.shots + Math.floor((this.getSkillLevel()-1)/3);
            this.skillState.piercingShots = shots;
            if (window.gameInfo && window.gameInfo.cannon) {
                window.gameInfo.cannon.piercingMode = true;
                window.gameInfo.cannon.piercingShots = shots;
            }
            console.log('[Skill] 龙息穿透激活，贯穿弹数:', shots);
        } else if (def.skill.id === 'frost_ray') {
            this.skillState.frozenRows = (this.skillState.frozenRows||0) + def.skill.params.rows;
            this.skillState.freezeTimer = def.skill.params.freezeDuration;
            console.log('[Skill] 霜冻射线激活，冻结行数:', def.skill.params.rows);
        } else {
            console.log('[Skill] 技能已排队:', def.skill.id, '下一发为技能弹');
        }
        // 每日任务追踪
        if (typeof QuestSystem !== 'undefined' && QuestSystem.advance) {
            QuestSystem.advance('skillUse', 1);
        }
        return true;
    },

    // 技能弹命中后调用（game.js 的 onSnap 处）
    onMarbleSnapped(marble, grid, gameInfo) {
        if (!this.skillQueued) return;
        this.skillQueued = false;
        this.skillShotsRemaining = this.skillMaxShots;

        const def = this.getDef();
        if (!def) return;
        switch (def.skill.id) {
            case 'shake_bomb': CharacterSkills.shakeBomb(marble, grid, gameInfo); break;
            case 'wind_rush': this.skillState.windRushShots = def.skill.params.shots + Math.floor((this.getSkillLevel()-1)/2); break;
            case 'chain_lightning': CharacterSkills.chainLightning(marble, grid, gameInfo); break;
            case 'stardust_convert': CharacterSkills.stardustConvert(marble, grid, gameInfo); break;
            case 'dragon_pierce': break; // 已在 activateSkill 中设置穿透模式
            case 'frost_ray': break; // 已在 activateSkill 中设置冻结
        }
    },

    isWindRushActive() {
        const def = this.getDef();
        return def && def.skill.id === 'wind_rush' && this.skillState.windRushShots > 0;
    },

    updateFrozen(dtSeconds) {
        if (this.skillState.frozenRows > 0 && this.skillState.freezeTimer > 0) {
            this.skillState.freezeTimer -= dtSeconds;
            if (this.skillState.freezeTimer <= 0) { this.skillState.frozenRows = 0; this.skillState.freezeTimer = 0; }
        }
    },
    getFrozenRows() { return (this.skillState.frozenRows > 0 && this.skillState.freezeTimer > 0) ? this.skillState.frozenRows : 0; },
    reset() { this.skillShotsRemaining = this.skillMaxShots; this.skillQueued = false; this.skillState = {}; }
};

// ── 技能实现 ──────────────────────────────────
const CharacterSkills = {
    shakeBomb(marble, grid, gameInfo) {
        const def = CharacterSystem.getDef(); if (!def) return;
        const level = CharacterSystem.getSkillLevel();
        const radius = def.skill.params.radius + Math.floor((level-1)/2);
        const toDrop = new Set();
        for (let r=0; r<grid.cells.length; r++) for (let c=0; c<grid.cells[r].length; c++) {
            const m = grid.cells[r][c]; if (!m||m.dead||m.popping||m.dropping) continue;
            const dx=m.x-marble.x, dy=m.y-marble.y;
            if (Math.sqrt(dx*dx+dy*dy) <= radius*GRID_CONFIG.radius*1.8) toDrop.add(m);
        }
        toDrop.forEach(m=>{ m.dropping=true; m.vx=(Math.random()-0.5)*4; m.vy=-Math.random()*5; });
        if (toDrop.size>0) { Logic.addScore(toDrop.size*15, gameInfo); if (gameInfo.audio) gameInfo.audio.play('drop'); if (gameInfo.particles) toDrop.forEach(m=>gameInfo.particles.spawn(m.x,m.y+(gameInfo.gridOffset||0),m.color,8)); }
        // 检测被炸弹炸出的孤立悬空球
        Logic.dropFloating(grid, gameInfo);
    },
    chainLightning(marble, grid, gameInfo) {
        // 摧毁全场所有同色球（不只是相连的）
        const type=marble.type, cluster=[];
        for (let r=0; r<grid.cells.length; r++) {
            for (let c=0; c<grid.cells[r].length; c++) {
                const m=grid.cells[r][c];
                if (m&&m.type===type&&!m.dead&&!m.popping&&!m.dropping) {
                    // 防止重复标记
                    m.popping = true;
                    cluster.push(m);
                }
            }
        }
        if (cluster.length > 0) {
            Logic.addScore(cluster.length*15, gameInfo);
            if (gameInfo.audio) gameInfo.audio.play('match');
            if (gameInfo.particles) {
                cluster.forEach(m=>gameInfo.particles.spawn(m.x,m.y+(gameInfo.gridOffset||0),m.color,15));
                gameInfo.particles.spawnText(240,320,'⚡闪电⚡','#ffdd00');
            }
            Logic.dropFloating(grid, gameInfo);
            console.log('[Lightning] 摧毁 ' + cluster.length + ' 个同色球');
        }
    },
    stardustConvert(marble, grid, gameInfo) {
        const def=CharacterSystem.getDef(); if (!def) return;
        const level=CharacterSystem.getSkillLevel(), radius=def.skill.params.radius+Math.floor((level-1)/2);
        const targetColor=MARBLE_TYPES[Math.floor(Math.random()*Math.min(currentLevelConfig?.marbleTypes||6,MARBLE_TYPES.length))];
        const affected=[];
        for (let r=0;r<grid.cells.length;r++) for (let c=0;c<grid.cells[r].length;c++) {
            const m=grid.cells[r][c]; if (!m||m.dead||m.popping||m.dropping) continue;
            const dx=m.x-marble.x, dy=m.y-marble.y;
            if (Math.sqrt(dx*dx+dy*dy)<=radius*GRID_CONFIG.radius*1.8||m===marble) { m.type=targetColor.id; m.color=targetColor.color; m.imageSrc=targetColor.imageSrc; m.imageObj=new Image(); m.imageObj.src=m.imageSrc; m.triggerBounce(); affected.push(m); }
        }
        if (affected.length>0&&gameInfo.particles) affected.forEach(m=>gameInfo.particles.spawn(m.x,m.y+(gameInfo.gridOffset||0),targetColor.color,10));
        const cluster=Logic.getConnectedSameColor(grid,marble); if (cluster.length>=3) Logic.executeDestruction(cluster,grid,gameInfo);
    }
};
