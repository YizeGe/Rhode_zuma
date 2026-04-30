// 每日任务系统
const QuestSystem = {
    quests: [
        { id: 'quest_daily_clear', name: '通关达人', desc: '通关任意关卡 3 次', target: 3, reward: 80, type: 'levelClear', icon: '🎮' },
        { id: 'quest_daily_match', name: '消除大师', desc: '累计消除 100 个球', target: 100, reward: 50, type: 'totalMatch', icon: '💎' },
        { id: 'quest_daily_skill', name: '技能达人', desc: '使用技能 5 次', target: 5, reward: 60, type: 'skillUse', icon: '⚡' },
        { id: 'quest_daily_gacha', name: '抽卡欧皇', desc: '进行 5 次抽卡', target: 5, reward: 50, type: 'gacha', icon: '🎰' }
    ],

    // 初始化/刷新每日任务
    checkAndReset() {
        const today = new Date().toISOString().slice(0, 10);
        if (saveData.dailyQuestResetDate !== today) {
            saveData.dailyQuests = this.quests.map(q => ({
                id: q.id, progress: 0, claimed: false
            }));
            saveData.dailyQuestResetDate = today;
            saveData.gold += 30;
            saveSaveData();
        }
        // 补齐缺失的任务
        for (const qDef of this.quests) {
            if (!saveData.dailyQuests.find(q => q.id === qDef.id)) {
                saveData.dailyQuests.push({ id: qDef.id, progress: 0, claimed: false });
            }
        }
    },

    // 获取任务定义
    getDef(questId) {
        return this.quests.find(q => q.id === questId);
    },

    // 获取当前任务状态
    getState(questId) {
        return saveData.dailyQuests.find(q => q.id === questId) || { id: questId, progress: 0, claimed: false };
    },

    // 增加任务进度
    advance(type, amount) {
        for (let i = 0; i < saveData.dailyQuests.length; i++) {
            const q = saveData.dailyQuests[i];
            const def = this.getDef(q.id);
            if (def && def.type === type && !q.claimed) {
                q.progress = Math.min(q.progress + amount, def.target);
            }
        }
        saveSaveData();
    },

    // 领取奖励
    claim(questId) {
        const q = saveData.dailyQuests.find(q => q.id === questId);
        const def = this.getDef(questId);
        if (!q || !def || q.claimed || q.progress < def.target) return false;
        q.claimed = true;
        saveData.gold += def.reward;
        saveSaveData();
        return def.reward;
    },

    // 获取所有任务
    getAll() {
        return saveData.dailyQuests.map(q => {
            const def = this.getDef(q.id);
            return { ...q, name: def?.name, desc: def?.desc, target: def?.target, reward: def?.reward, icon: def?.icon };
        });
    },

    // 可领取数量
    getClaimableCount() {
        let count = 0;
        for (const q of saveData.dailyQuests) {
            const def = this.getDef(q.id);
            if (def && q.progress >= def.target && !q.claimed) count++;
        }
        return count;
    }
};
