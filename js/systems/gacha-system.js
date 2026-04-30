// 抽卡系统
const GachaSystem = {
    // 执行一次抽卡
    roll() {
        const rates = window.GACHA_RATES;
        if (!rates) return null;

        // 检查保底
        let forcedRarity = null;
        if (saveData.gachaPitySSR >= rates.pitySSR - 1) {
            forcedRarity = 'SSR';
        } else if (saveData.gachaPitySR >= rates.pitySR - 1) {
            forcedRarity = 'SR';
        }

        let rarity;
        if (forcedRarity) {
            rarity = forcedRarity;
        } else {
            const r = Math.random();
            const probs = rates.single.probabilities;
            if (r < probs.SSR) rarity = 'SSR';
            else if (r < probs.SSR + probs.SR) rarity = 'SR';
            else if (r < probs.SSR + probs.SR + probs.R) rarity = 'R';
            else rarity = 'N';
        }

        // 更新保底
        if (rarity === 'SSR') {
            saveData.gachaPitySSR = 0;
            saveData.gachaPitySR = Math.min(saveData.gachaPitySR + 1, rates.pitySR - 1);
        } else if (rarity === 'SR') {
            saveData.gachaPitySR = 0;
            saveData.gachaPitySSR = Math.min(saveData.gachaPitySSR + 1, rates.pitySSR - 1);
        } else {
            saveData.gachaPitySR = Math.min(saveData.gachaPitySR + 1, rates.pitySR - 1);
            saveData.gachaPitySSR = Math.min(saveData.gachaPitySSR + 1, rates.pitySSR - 1);
        }

        // 从该稀有度的角色中随机选择
        const candidates = (window.CHARACTERS || []).filter(c => c.rarity === rarity);
        if (candidates.length === 0) return null;
        const char = candidates[Math.floor(Math.random() * candidates.length)];

        // 统计
        saveData.stats.totalGacha = (saveData.stats.totalGacha || 0) + 1;

        // 判断是否已有
        if (hasCharacter(char.id)) {
            const compensation = rates.duplicate[char.rarity] || 50;
            saveData.gold += compensation;
            return { character: char, newChar: false, compensation };
        } else {
            addCharacter(char.id);
            return { character: char, newChar: true, compensation: 0 };
        }
    },

    // 十连抽
    rollMulti() {
        const results = [];
        for (let i = 0; i < 10; i++) {
            results.push(this.roll());
        }
        saveSaveData();
        return results;
    },

    // 获取保底进度文本
    getPityText() {
        const rates = window.GACHA_RATES || { pitySR: 10, pitySSR: 20 };
        return {
            srProgress: saveData.gachaPitySR,
            srMax: rates.pitySR,
            ssrProgress: saveData.gachaPitySSR,
            ssrMax: rates.pitySSR
        };
    }
};
