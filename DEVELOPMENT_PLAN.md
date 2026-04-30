# 龙泡泡大作战 — 功能扩展开发计划

## 一、目标概述

在现有泡泡龙核心玩法基础上，增加：
- **角色收集系统**：6 个角色，稀有度各异
- **抽卡系统**：扭蛋机，消耗金币抽取角色
- **角色养成**：角色升级 + 技能升级
- **关卡系统**：5 个大关，每大关 3 关，共 15 关
- **计时挑战模式**：独立刷金币玩法，不影响主线进度
- **金币经济**：关卡奖励 + 计时挑战 + 每日任务三产出

---

## 二、文件结构

```
lungpaopao/
├── index.html                      # 主入口，改动：加入主菜单
├── main.js                         # Electron 入口（已有）
├── styles.css                      # 全局样式（扩展）
├── js/
│   ├── game.js                    # 游戏主循环（改动：支持多关卡、角色技能）
│   ├── logic.js                   # 游戏核心逻辑（改动：支持技能触发）
│   ├── grid.js                    # 网格系统（改动：支持关卡机制）
│   ├── marble.js                  # 弹珠对象（改动：支持技能特效）
│   ├── cannon.js                  # 炮台（改动：支持技能效果如穿透）
│   ├── particles.js               # 粒子特效（扩展：新增特效）
│   ├── audio.js                   # 音效（扩展：新增音效）
│   ├── assests/                   # 弹珠图片素材（已有）
│   │
│   ├── ui/                        # 【新增】UI 界面
│   │   ├── main-menu.js           # 主菜单
│   │   ├── level-select.js         # 关卡选择界面
│   │   ├── character-select.js     # 角色选择界面
│   │   ├── gacha.js               # 扭蛋机界面
│   │   ├── character-detail.js     # 角色详情/养成界面
│   │   ├── quest.js               # 每日任务界面
│   │   └── time-challenge.js      # 【新增】计时挑战界面
│   │
│   └── systems/                   # 【新增】核心系统
│       ├── save-data.js           # 存档管理（localStorage）
│       ├── character.js           # 角色定义 + 技能实现
│       ├── gacha-system.js        # 抽卡逻辑 + 概率
│       ├── level-config.js        # 关卡配置（机制、奖励）
│       ├── quest-system.js        # 每日任务系统
│       └── challenge-system.js    # 【新增】计时挑战逻辑
│
└── data/                          # 【新增】静态数据
    ├── characters.json             # 角色定义（ID、名字、技能、属性）
    ├── levels.json                 # 关卡详细配置
    ├── gacha-rates.json            # 抽卡概率配置
    └── challenge-levels.json        # 【新增】计时挑战关卡配置
```

---

## 三、数据模型

### 3.1 存档数据结构（localStorage）

```javascript
// localStorage key: "lungpaopao_save"
{
  "version": 1,

  // 金币
  "gold": 1000,

  // 已拥有角色
  "ownedCharacters": [
    { "id": "n001", "level": 1, "skillLevel": 1 },
    { "id": "r002", "level": 3, "skillLevel": 2 }
  ],

  // 已选中的角色（战斗用）
  "selectedCharacter": "n001",

  // 关卡进度
  // unlockedLevels: ["1-1", "1-2", "1-3", "2-1", ...]
  "unlockedLevels": ["1-1", "1-2", "1-3"],
  // 关卡通关星级（1-3星）
  "levelStars": { "1-1": 3, "1-2": 2 },
  // 总通关次数
  "totalLevelClears": 5,

  // 抽卡保底进度
  "gachaPitySR": 0,    // 0-9，10保底
  "gachaPitySSR": 0,   // 0-19，20保底

  // 每日任务
  "dailyQuests": [
    { "id": "quest_1", "progress": 0, "claimed": false },
    { "id": "quest_2", "progress": 0, "claimed": false },
    { "id": "quest_3", "progress": 0, "claimed": false }
  ],
  "dailyQuestResetDate": "2026-04-27",  // 用于判断是否刷新

  // 成就（简化版）
  "achievements": [],

  // 累计数据（用于统计任务）
  "stats": {
    "totalShots": 0,
    "totalMatches": 0,
    "totalClears": 0
  },

  // 最高分（已有，保留）
  "bestScore": 0,

  // 计时挑战记录
  "challengeRecords": {
    "60s": { "best": 0, "cleared": 0 },
    "90s": { "best": 0, "cleared": 0 },
    "120s": { "best": 0, "cleared": 0 }
  }
}
```

---

## 四、角色系统

### 4.1 角色定义（characters.json）

```javascript
[
  {
    "id": "n001",
    "name": "爆破新手",
    "rarity": "N",
    "rarityColor": "#aaaaaa",
    "description": "初出茅庐的爆破手，技能简单直接",
    "emoji": "🧨",
    "skill": {
      "id": "shake_bomb",
      "name": "震荡弹",
      "description": "命中后，以该球为圆心2格半径内所有球被震落",
      "maxLevel": 5,
      "cooldown": 8,          // 冷却时间（秒）
      "params": {
        "radius": 2,           // 效果半径（格）
        "cooldownReduction": 0  // 每级冷却减少
      }
    },
    "stats": {
      "fireRate": 1.0,        // 发射速度倍率
      "pierce": false,        // 是否可穿透
      "skillPower": 1.0       // 技能威力倍率
    },
    "unlockCost": 0,          // 初始角色，无需解锁
    "shardId": null           // 碎片ID（无碎片系统）
  },

  {
    "id": "r001",
    "name": "疾风射手",
    "rarity": "R",
    "rarityColor": "#4caf50",
    "description": "快如闪电，攻速惊人",
    "emoji": "🏹",
    "skill": {
      "id": "wind_rush",
      "name": "疾风连射",
      "description": "接下来3发炮弹发射间隔减半",
      "maxLevel": 5,
      "cooldown": 12,
      "params": {
        "shots": 3,            // 连射发数
        "cooldownBonus": 0.5   // 每级额外-0.1秒冷却
      }
    },
    "stats": { "fireRate": 1.2, "pierce": false, "skillPower": 1.0 },
    "unlockCost": 0,
    "shardId": null
  },

  {
    "id": "r002",
    "name": "雷电使者",
    "rarity": "R",
    "rarityColor": "#4caf50",
    "description": "电流传导，瞬间清链",
    "emoji": "⚡",
    "skill": {
      "id": "chain_lightning",
      "name": "链式闪电",
      "description": "命中后沿同色球链传递，消除整条链",
      "maxLevel": 5,
      "cooldown": 15,
      "params": {
        "chainLength": 999     // 消除链长上限，每级+999
      }
    },
    "stats": { "fireRate": 1.0, "pierce": false, "skillPower": 1.0 },
    "unlockCost": 0,
    "shardId": null
  },

  {
    "id": "s001",
    "name": "冰霜巫灵",
    "rarity": "SR",
    "rarityColor": "#2196f3",
    "description": "冰封战场，掌控节奏",
    "emoji": "🧙",
    "skill": {
      "id": "frost_ray",
      "name": "霜冻射线",
      "description": "冻结最底部一行4秒，被冻球不参与下压",
      "maxLevel": 5,
      "cooldown": 20,
      "params": {
        "freezeDuration": 4,   // 冻结秒数，每级+1秒
        "rows": 1
      }
    },
    "stats": { "fireRate": 0.9, "pierce": false, "skillPower": 1.0 },
    "unlockCost": 0,
    "shardId": "s001"
  },

  {
    "id": "s002",
    "name": "龙魂使者",
    "rarity": "SR",
    "rarityColor": "#2196f3",
    "description": "龙息穿透，无可阻挡",
    "emoji": "🐉",
    "skill": {
      "id": "dragon_pierce",
      "name": "龙息穿透",
      "description": "接下来2发炮弹变为穿透弹，碰球不停止",
      "maxLevel": 5,
      "cooldown": 18,
      "params": {
        "shots": 2,             // 穿透弹发数，每级+1
        "piercePower": 1.0      // 威力倍率
      }
    },
    "stats": { "fireRate": 1.0, "pierce": true, "skillPower": 1.0 },
    "unlockCost": 0,
    "shardId": "s002"
  },

  {
    "id": "ss001",
    "name": "星辰法师",
    "rarity": "SSR",
    "rarityColor": "#ff9800",
    "description": "星尘转化，创造奇迹",
    "emoji": "🔮",
    "skill": {
      "id": "stardust_convert",
      "name": "星尘转化",
      "description": "命中的球及周围2格内所有球变成同色，触发连锁消除",
      "maxLevel": 5,
      "cooldown": 25,
      "params": {
        "radius": 2,            // 转化半径，每级+1
        "chainReaction": true   // 是否触发连锁
      }
    },
    "stats": { "fireRate": 0.85, "pierce": false, "skillPower": 1.2 },
    "unlockCost": 0,
    "shardId": "ss001"
  }
]
```

### 4.2 技能实现接口

每个技能需要实现以下接口，统一由 `CharacterSystem` 调用：

```javascript
// skill implementations go in js/systems/character.js

const SkillImplementations = {

  // 震荡弹
  "shake_bomb": {
    activate(gameState, params, level) {
      // params.radius = 2 (基础) + level bonus
      // 找到最近接炮弹的已固定球，向外扩散2格震落
      const radius = params.radius + Math.floor((level - 1) / 2);
      // ... 震落逻辑
    }
  },

  // 疾风连射
  "wind_rush": {
    activate(gameState, params, level) {
      // 接下来三次发射不计入上方球下落的次数
    }
  },

  // 链式闪电
  "chain_lightning": {
    activate(gameState, params, level) {
      // 找到命中的球，沿同色BFS找整条链，消除
    }
  },

  // 霜冻射线
  "frost_ray": {
    activate(gameState, params, level) {
      // 冻结最底部一行，持续 freezeDuration 秒
      // 冻结期间所有球无法下降
    }
  },

  // 龙息穿透
  "dragon_pierce": {
    activate(gameState, params, level) {
      // 设置 cannon.piercingMode = true 持续 N 发
      // 穿透弹碰球不停止，继续飞，将经过路径半径2内所有球摧毁
    }
  },

  // 星尘转化
  "stardust_convert": {
    activate(gameState, params, level) {
      // 命中的球 + radius 格内所有球 → 变成随机同色
      // 触发重新检测连接，消除
    }
  }
};
```

---

## 五、抽卡系统

### 5.1 抽卡概率（gacha-rates.json）

```javascript
{
  "pitySR": 10,     // 第10抽必出SR
  "pitySSR": 20,    // 第20抽必出SSR

  "single": {
    "cost": 200,
    "probabilities": {
      "N":  0.55,
      "R":  0.30,
      "SR": 0.12,
      "SSR": 0.03
    }
  },

  "multi": {
    "cost": 1800,   // 10连，比单抽省200
    "guarantee": "R",  // 10连必出R
    "probabilities": {
      "N":  0.50,
      "R":  0.35,
      "SR": 0.12,
      "SSR": 0.03
    }
  },

  // 角色重复获取的处理
  "duplicate": {
    // 重复N：+50金币补偿
    // 重复R：+100金币补偿
    // 重复SR：+200金币补偿
    // 重复SSR：+500金币补偿
    // SSR首次获取 + 角色碎片 10个（后续用于升星/专属）
  }
}
```

### 5.2 抽卡流程

```
用户点击"单抽/十连"
  │
  ├─ 扣金币
  ├─ 更新保底进度
  ├─ 计算概率 → 决定结果角色ID
  │    ├─ 普通单抽概率
  │    ├─ 保底触发 → 强制SR/SSR
  │    └─ 保底进度清零
  │
  ├─ 播放抽卡动画（3秒）
  │    └─ 卡片旋转 → 停下 → 展示角色 + 特效
  │
  ├─ 判断是否已有该角色
  │    ├─ 已有 → 获得金币补偿 + 碎片
  │    └─ 未有 → 加入 ownedCharacters
  │
  └─ 更新存档
```

### 5.3 扭蛋机界面结构

```html
<!-- 单抽界面 -->
<div id="gacha-screen" class="screen hidden">
  <div class="gacha-header">
    <button class="back-btn">← 返回</button>
    <div class="gold-display">💰 <span id="gacha-gold">1000</span></div>
  </div>

  <div class="gacha-machine">
    <canvas id="gacha-canvas" width="400" height="300"></canvas>
  </div>

  <div class="pity-bar">
    <div class="pity-label">保底进度</div>
    <div class="pity-track">
      <div class="pity-fill" id="pity-sr-fill" style="width: 30%"></div>
    </div>
    <div class="pity-text">SR保底 3/10</div>
  </div>

  <div class="gacha-buttons">
    <button id="single-gacha-btn" class="gacha-btn">
      单抽<br><span class="cost">200金币</span>
    </button>
    <button id="multi-gacha-btn" class="gacha-btn gacha-btn-multi">
      十连<br><span class="cost">1800金币</span>
    </button>
  </div>

  <!-- 结果展示弹窗 -->
  <div id="gacha-result-modal" class="modal hidden">
    <div class="result-card" id="result-card-content"></div>
    <button id="close-result-btn">确定</button>
  </div>
</div>
```

---

## 六、关卡系统

### 6.1 关卡配置（levels.json）

```javascript
{
  "1-1": {
    "name": "初入江湖",
    "subtitle": "学习基本操作",
    "chapter": 1,
    "gridRows": 5,          // 初始网格行数
    "pushInterval": 4,      // 每几发下压一行
    "marbleTypes": 4,       // 场上颜色种类数（越少越简单）
    "specialMechanic": null,
    "condition": {
      "type": "survive",    // survive=存活，clear=清空，score=达到分数
      "shots": 20,          // 用<=20发通关
      "target": null
    },
    "rewards": {
      "gold": 50,
      "firstClearBonus": 100
    },
    "stars": [
      { "condition": { "shots": 15 }, "gold": 20 },
      { "condition": { "shots": 10 }, "gold": 30 },
      { "condition": { "shots": 6  }, "gold": 50 }
    ]
  },

  "1-2": {
    "name": "渐入佳境",
    "pushInterval": 4,
    "marbleTypes": 5,
    "condition": { "type": "survive", "shots": 25 },
    "rewards": { "gold": 80, "firstClearBonus": 100 },
    "stars": [
      { "condition": { "shots": 20 }, "gold": 20 },
      { "condition": { "shots": 15 }, "gold": 30 },
      { "condition": { "shots": 10 }, "gold": 50 }
    ]
  },

  "1-3": { /* 小关3无特殊机制 */ },

  "2-1": {
    "name": "疾风来袭",
    "chapter": 2,
    "pushInterval": 3,      // ← 快了！从4变3
    "marbleTypes": 5,
    "condition": { "type": "survive", "shots": 25 },
    "rewards": { "gold": 80, "firstClearBonus": 100 },
    "stars": [
      { "condition": { "shots": 20 }, "gold": 20 },
      { "condition": { "shots": 15 }, "gold": 30 },
      { "condition": { "shots": 10 }, "gold": 50 }
    ]
  },

  "2-2": {
    "name": "冰霜领域",
    "pushInterval": 3,
    "marbleTypes": 5,
    "specialMechanic": {
      "type": "auto_freeze",
      "interval": 8,          // 每8秒
      "duration": 3,          // 冻结3秒
      "rows": 1               // 冻最底1行
    },
    "condition": { "type": "survive", "shots": 30 },
    "rewards": { "gold": 100, "firstClearBonus": 100 },
    "stars": [
      { "condition": { "shots": 22 }, "gold": 20 },
      { "condition": { "shots": 16 }, "gold": 30 },
      { "condition": { "shots": 12 }, "gold": 50 }
    ]
  },

  "2-3": { /* 小关3无特殊机制 */ },

  "3-1": {
    "name": "雷电试炼",
    "chapter": 3,
    "pushInterval": 4,
    "specialMechanic": {
      "type": "extra_drop",   // 消除时额外掉落一行
      "dropExtra": 1
    },
    "marbleTypes": 5,
    "condition": { "type": "clear_count", "count": 80 },
    "rewards": { "gold": 120, "firstClearBonus": 100 },
    "stars": [
      { "condition": { "count": 120 }, "gold": 20 },
      { "condition": { "count": 160 }, "gold": 30 },
      { "condition": { "count": 200 }, "gold": 50 }
    ]
  },

  "3-2": { /* ... */ },
  "3-3": { /* ... */ },

  "4-1": {
    "name": "暗影逼近",
    "chapter": 4,
    "pushInterval": 3,
    "specialMechanic": {
      "type": "speed_up",
      "interval": 15,         // 每15秒
      "pushExtra": 1          // 额外下压1行
    },
    "marbleTypes": 6,
    "condition": { "type": "survive", "shots": 35 },
    "rewards": { "gold": 150, "firstClearBonus": 100 },
    "stars": [
      { "condition": { "shots": 28 }, "gold": 20 },
      { "condition": { "shots": 22 }, "gold": 30 },
      { "condition": { "shots": 16 }, "gold": 50 }
    ]
  },

  "4-2": { /* ... */ },
  "4-3": { /* ... */ },

  "5-1": {
    "name": "最终试炼",
    "chapter": 5,
    "pushInterval": 3,
    "specialMechanic": {
      "type": "double_pressure",
      "interval": 10,         // 每10秒全场+0.5行
      "pushIntervalBonus": -1 // pushInterval 再-1（变成2）
    },
    "marbleTypes": 6,
    "condition": { "type": "clear_count", "count": 200 },
    "rewards": { "gold": 200, "firstClearBonus": 150 },
    "stars": [
      { "condition": { "count": 250 }, "gold": 30 },
      { "condition": { "count": 300 }, "gold": 50 },
      { "condition": { "count": 350 }, "gold": 80 }
    ]
  },
  "5-2": { /* ... */ },
  "5-3": { /* ... */ }
}
```

### 6.2 关卡选择界面

```
┌──────────────────────────────┐
│  ← 返回主菜单      💰 8800   │
├──────────────────────────────┤
│                              │
│  [大关 1]  [大关 2🔒]       │
│  [大关 3🔒]  [大关 4🔒]      │
│  [大关 5🔒]                  │
│                              │
└──────────────────────────────┘

大关选择后 → 显示3个小关：
┌──────────────────────────────┐
│  ← 返回      [第1章 火山遗迹]│
├──────────────────────────────┤
│  ⭐⭐⭐ 1-1 初入江湖          │
│  ⭐⭐ 1-2 渐入佳境            │
│  ⭐ 1-3 挑战极限              │
└──────────────────────────────┘
```

### 6.3 关卡机制实现

在 `grid.js` 或新建 `level-manager.js` 中：

```javascript
// 特殊机制处理器
function applyLevelMechanic(mechanic, gameState, dt) {
  switch (mechanic.type) {

    case "auto_freeze":
      // 计时器：每 interval 秒冻结底部 rows 行 duration 秒
      // 冻结效果：在 pushDownGrid 时跳过这些行
      break;

    case "extra_drop":
      // 每次消除时：额外触发一次 dropFloating
      break;

    case "speed_up":
      // 计时器：每 interval 秒额外 pushDownGrid(extraRows=1)
      break;

    case "double_pressure":
      // pushInterval 降低 + 定时额外下压
      break;
  }
}
```

---

## 七、主菜单设计

```
┌──────────────────────────────┐
│                              │
│      🐉 龙泡泡大作战         │
│                              │
│      [🎮 开始游戏]           │
│      [⏱️ 计时挑战]           │
│      [🔮 角色图鉴]           │
│      [🎰 扭蛋抽卡]           │
│      [📋 每日任务]            │
│      [⚙️ 设置]               │
│                              │
│  💰 8800                     │
└──────────────────────────────┘
```

---

## 八、每日任务

### 8.1 任务配置

```javascript
const DAILY_QUESTS = [
  {
    id: "quest_daily_clear",
    name: "通关达人",
    description: "通关任意关卡3次",
    target: 3,
    reward: 80,
    targetType: "levelClear",
    progress: 0
  },
  {
    id: "quest_daily_match",
    name: "消除大师",
    description: "累计消除100个球",
    target: 100,
    reward: 50,
    targetType: "totalMatch",
    progress: 0
  },
  {
    id: "quest_daily_skill",
    name: "技能达人",
    description: "使用技能5次",
    target: 5,
    reward: 60,
    targetType: "skillUse",
    progress: 0
  },
  {
    id: "quest_daily_gacha",
    name: "抽卡欧皇",
    description: "进行5次抽卡",
    target: 5,
    reward: 50,
    targetType: "gacha",
    progress: 0
  }
];
```

### 8.2 每日刷新逻辑

```javascript
// save-data.js
function checkAndResetDailyQuests(saveData) {
  const today = new Date().toISOString().slice(0, 10);
  if (saveData.dailyQuestResetDate !== today) {
    // 重置所有任务
    saveData.dailyQuests = DAILY_QUESTS.map(q => ({
      id: q.id,
      progress: 0,
      claimed: false
    }));
    saveData.dailyQuestResetDate = today;
    saveData.gold += 30;  // 每日登录奖励
  }
}
```

---

## 九、UI 切换方案

现有 `index.html` 加一个覆盖层，不需要改现有游戏 Canvas：

```html
<!-- 在现有 body 内容外面包裹 -->
<div id="ui-overlay" class="overlay">
  <!-- 主菜单、关卡选择等界面在这里 -->
  <div id="main-menu" class="screen"></div>
  <div id="level-select" class="screen hidden"></div>
  <div id="gacha-screen" class="screen hidden"></div>
  <div id="character-screen" class="screen hidden"></div>
  <div id="quest-screen" class="screen hidden"></div>
</div>

<!-- 游戏 Canvas 始终在下面 -->
<canvas id="gameCanvas">...</canvas>
```

进入游戏 → 隐藏 UI overlay → 显示 Canvas
退出游戏 → 回到主菜单

---



## 十、计时挑战模式（独立于主线）

### 10.1 模式定位

- **完全独立**：不消耗体力，不影响关卡进度，随时可挑战
- **核心玩法**：在限定时间内消除尽可能多的球
- **刷金币途径**：不想推关卡进度时来这里肝
- **失败条件**：Game Over（球链碰到炮台）
- **无胜利条件**：无限刷，挑战个人最佳

### 10.2 关卡配置（challenge-levels.json）

```javascript
{
  "60s": {
    "name": "60秒极速挑战",
    "subtitle": "高压力短局",
    "duration": 60,
    "pushInterval": 3,
    "marbleTypes": 5,
    "gridRows": 6,
    "specialMechanic": null,
    "goldFormula": {
      "base": 1,
      "bonus": 2,
      "threshold": 100
    }
  },

  "90s": {
    "name": "90秒标准挑战",
    "subtitle": "平衡压力局",
    "duration": 90,
    "pushInterval": 4,
    "marbleTypes": 5,
    "gridRows": 5,
    "specialMechanic": null,
    "goldFormula": {
      "base": 1,
      "bonus": 2,
      "threshold": 150
    }
  },

  "120s": {
    "name": "120秒持久挑战",
    "subtitle": "耐力局",
    "duration": 120,
    "pushInterval": 4,
    "marbleTypes": 6,
    "gridRows": 4,
    "specialMechanic": {
      "type": "extra_drop",
      "interval": 30,
      "dropExtra": 1
    },
    "goldFormula": {
      "base": 1,
      "bonus": 2,
      "threshold": 200
    }
  }
}
```

### 10.3 金币结算公式

```
基础金币 = 消除球总数 × 1
超额奖励 = max(0, 消除球数 - 基准线) × 2
总金币  = 基础金币 + 超额奖励
```

示例（60秒挑战，基准线100球）：

| 消除数 | 基础金币 | 超额奖励 | 总计 |
|--------|---------|---------|------|
| 60 | 60 | 0 | 60 |
| 120 | 120 | 40 | 160 |
| 200 | 200 | 200 | 400 |
| 350 | 350 | 500 | 850 |

### 10.4 计时挑战界面

```
┌──────────────────────────────┐
│  ← 返回主菜单       💰 8800  │
├──────────────────────────────┤
│                              │
│      ⏱️ 计时挑战             │
│                              │
│  ┌────────────────────────┐  │
│  │  ⏱ 60秒 极速挑战       │  │
│  │  最佳: 247球  通关: 5次  │  │
│  │  [开始挑战]            │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  ⏱ 90秒 标准挑战       │  │
│  │  最佳: 412球  通关: 3次  │  │
│  │  [开始挑战]            │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  ⏱ 120秒 持久挑战     │  │
│  │  最佳: 621球  通关: 2次  │  │
│  │  [开始挑战]            │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### 10.5 计时挑战与普通关卡的差异

| 要素 | 普通关卡 | 计时挑战 |
|------|---------|---------|
| 目标 | 用尽量少发通关 | 时间内尽量多消 |
| Game Over | 球链触炮台 | 同左 |
| 时间 | 无时间限制 | 倒计时，归零停止 |
| 下压触发 | pushInterval 发数 | 同左 |
| 技能 | 角色自带，有冷却 | 同左 |
| 退出 | 关卡选择 | 随时退出，无惩罚 |
| 奖励 | 关卡配置固定金币 | 按消除数动态结算 |

### 10.6 挑战结束结算界面

```
┌──────────────────────────────┐
│                              │
│      ⏱️ 挑战结束！           │
│                              │
│      消除球数: 247           │
│      最高纪录: 312 🆕        │
│                              │
│      💰 +247 金币            │
│      超额奖励: +294          │
│      ─────────────           │
│      💰 +541 金币            │
│                              │
│  [再来一局]    [返回]        │
└──────────────────────────────┘
```

### 10.7 计时挑战 HUD（叠加在游戏 Canvas 上）

```
┌────────────────────────────────────┐
│  ⏱ 00:42          消除: 47球      │  ← 左上角
│                                    │
│           [游戏区域]               │
│                                    │
│  [技能按钮]              [暂停]     │  ← 底部操作栏
└────────────────────────────────────┘
```

技能按钮：显示当前角色技能图标 + 冷却进度圆弧
暂停按钮：暂停计时，弹出菜单（继续 / 退出（无奖励））

### 10.8 实现要点（challenge-system.js）

```javascript
class ChallengeManager {
  constructor(levelId) {
    this.config = CHALLENGE_LEVELS[levelId];
    this.timeLeft = this.config.duration;
    this.totalCleared = 0;
    this.state = 'PLAYING';
  }

  initGame(characterId) {
    loadCharacter(characterId);
    initLevel(this.config.gridRows);
    this.timeLeft = this.config.duration;
    this.totalCleared = 0;
    gameInfo.state = 'PLAYING';
  }

  update(dt) {
    if (gameInfo.state !== 'PLAYING') return;
    this.timeLeft -= dt / 1000;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endChallenge('TIMEOUT');
    }
  }

  onMarbleEliminated(count) {
    this.totalCleared += count;
  }

  endChallenge(reason) {
    gameInfo.state = 'GAMEOVER';
    const { base, bonus, threshold } = this.config.goldFormula;
    const baseGold = this.totalCleared * base;
    const bonusGold = Math.max(0, this.totalCleared - threshold) * bonus;
    const totalGold = baseGold + bonusGold;

    const record = saveData.challengeRecords[this.config.id];
    if (this.totalCleared > record.best) record.best = this.totalCleared;
    record.cleared++;

    saveData.gold += totalGold;
    saveSaveData();

    showChallengeResult({
      clears: this.totalCleared,
      newBest: this.totalCleared > record.best,
      gold: totalGold,
      reason
    });
  }
}
```

---

## 十一、开发进度（2026-04-27）

### ✅ 已完成

| 模块 | 状态 | 说明 |
|------|------|------|
| **存档系统** | ✅ | localStorage 读写，含金币/角色/关卡/抽卡保底/每日任务/挑战记录 |
| **角色数据** | ✅ | 6 角色完整定义（JSON + 硬编码 fallback） |
| **技能系统** | ⚠️ | 6 个技能全部实现，射击计数冷却，手动点击触发 |
|   | | → 已知问题：技能按钮点击偶发无响应，待排查 |
| **关卡系统** | ✅ | 5 大关 × 3 小关 = 15 关，含 4 种特殊机制 |
| **关卡 HUD** | ✅ | 独立顶栏卡片，显示关卡名/目标进度/发射数/分数 |
| **主菜单** | ✅ | 开始游戏 / 计时挑战 / 角色图鉴 / 扭蛋 / 每日任务 |
| **关卡选择** | ✅ | 章节卡片 + 小关列表 + 星星显示 |
| **角色选择** | ✅ | 已拥有角色网格 + 稀有度边框 |
| **角色养成** | ✅ | 角色升级 / 技能升级（消耗金币） |
| **抽卡系统** | ✅ | 单抽/十连 + 保底 + 概率配置 + 重复补偿 |
| **每日任务** | ✅ | 4 个任务 + 每日刷新 + 领取奖励 |
| **计时挑战** | ⚠️ | 3 档难度 + 动态金币结算 |
|   | | → 需测试：进入后是否正常倒计时 + 消除计数 |
| **穿透模式** | ✅ | cannon.js 支持 piercingMode |
| **画布缩放** | ✅ | JS 动态匹配视口 + retina 高清 |
| **关卡通关** | ✅ | 通关检测 + 星级评定 + 结算界面 + 自动解锁下一关 |
| **界面切换** | ✅ | overlay 覆盖层 + re-render 刷新机制 |
| **Game Over** | ✅ | 飞行弹珠清理 + 状态防重入 |

### ⚠️ 待修复

| 问题 | 严重度 | 描述 |
|------|--------|------|
| **技能按钮** | 高 | 点击后有时不触发技能激活，需要进一步调试事件绑定 |
| **计时挑战** | 中 | 需完整测试倒计时、消除计数、Game Over 流程 |

### 🔜 未开始

| 内容 | 计划中的编号 |
|------|-------------|
| 美术资源（角色头像/品质框/背景图） | 十二 |
| BGM / 更多音效 | — |
| 体力/体力恢复机制 | 十四 |
| 广告看视频领金币 | 十四 |

---

## 十二、需要新增的美术资源（未开始）

| 资源 | 说明 |
|------|------|
| 6 个角色的头像图（128×128 PNG） | 出现在扭蛋结果、角色图鉴 |
| 角色背景卡（SSR/SR/R 品质框） | 扭蛋展示用 |
| 关卡章节背景图（5张） | 关卡选择界面装饰 |
| 扭蛋机动画帧（可选） | 如果要做精细动画，否则用 Canvas 画 |
| 技能图标（6个，32×32 PNG） | 角色详情、战斗UI显示 |

> 注：前期可以用 emoji 代替头像，背景用纯色，专注功能实现。

---

## 十三、实际代码改动记录

### game.js 改动

```javascript
// 改动1: 游戏初始化不再自动 initLevel
// 改为传入关卡ID和已选角色

// function startLevel(levelId, characterId) {
//   loadLevelConfig(levelId);
//   loadCharacter(characterId);
//   initLevel(config.gridRows);
//   gameInfo.state = 'PLAYING';
// }

// 改动2: 游戏结束逻辑
// function levelComplete() {
//   // 计算星级
//   // 显示结算界面
//   // 发放金币
//   // 返回关卡选择
// }

// 改动3: pushDownGrid 改为从关卡配置读取 pushInterval
// const PUSH_INTERVAL = currentLevelConfig.pushInterval;
```

### cannon.js 改动

```javascript
// 改动: fire() 支持穿透模式
// if (this.piercingMode && this.piercingShots > 0) {
//   // 不停止，继续飞
// }

// 改动: 添加技能冷却计时器
// this.skillCooldown = 0;
// this.skillActive = false;
```

### logic.js 改动

```javascript
// 改动1: processNormalSnap 支持技能触发
// onSnap(marble) {
//   if (currentCharacterSkillReady) {
//     activateSkill(marble, grid, gameInfo);
//   }
//   // 原有的匹配检测...
// }

// 改动2: 添加链式闪电消除
// eliminateChain(marble, grid, gameInfo) {
//   // BFS找所有同色连通球
//   // 全部标记 dead
// }

// 改动3: 添加冻结行逻辑
// frozenRows = []
// 在 pushDownGrid 时：if (frozenRows.includes(bottomRow)) skip;
```

---

## 十四、待细化内容（你自己定）

- [ ] 角色立绘/头像风格（像素风 / 卡通 / 二次元）
- [ ] 抽卡动画具体效果（旋转卡片 / 爆炸特效 / 开箱）
- [ ] 角色平衡数值（冷却次数、技能参数）
- [ ] SSR 角色是否需要额外的"星"（升星系统）
- [ ] 是否加入"体力/体力恢复"机制
- [ ] 音效和 BGM 的具体曲目风格
- [ ] 是否加入广告看视频领金币
- [ ] 技能按钮事件绑定排查（当前偶发无响应）

---

## 十五、测试计划

| 测试点 | 验证方式 |
|--------|---------|
| 存档读写正常 | 刷新页面后金币/角色/进度保留 |
| 保底计数正确 | 连抽10次/20次内必出对应品质 |
| 关卡机制正确 | 逐关测试特殊机制触发 |
| 技能效果正确 | 每个角色技能单独测试 |
| 每日任务刷新 | 跨日期测试任务重置 |
| 金币流向正确 | 抽卡扣钱、关卡奖励加钱、升级消耗 |
