# Phase 4: Learning AI System 計劃 🤖

## 目標

實作一個能夠從遊戲中學習、適應對手風格、做出智能決策的德州撲克 AI 系統。

---

## 系統架構

```
LearningAI (主 AI 類別)
├── OpponentModeler (對手建模)
│   ├── OpponentProfile (對手檔案)
│   └── PlayerTypeClassifier (玩家類型分類器)
├── PokerMath (撲克數學)
│   ├── Hand Evaluation (手牌評估)
│   ├── Equity Calculation (勝率計算)
│   └── Pot Odds (底池賠率)
├── DecisionEngine (決策引擎)
│   ├── Expected Value Calculation (期望值計算)
│   ├── Action Selection (動作選擇)
│   └── Personality Modifiers (個性修正)
├── MemorySystem (記憶系統)
│   ├── Short-term Memory (短期記憶)
│   ├── Long-term Memory (長期記憶)
│   └── Working Memory (工作記憶)
└── LearningEngine (學習引擎)
    ├── Reinforcement Learning (強化學習)
    ├── Pattern Recognition (模式識別)
    └── Strategy Adjustment (策略調整)
```

---

## Phase 4.1: PokerMath - 撲克數學 (~300 行)

### 文件：`src/ai/poker/PokerMath.js`

**功能**：
1. **手牌評估**
   - `evaluateHandStrength(holeCards, communityCards)` - 評估當前手牌強度 (0-1)
   - `getStartingHandRank(card1, card2)` - 起手牌排名
   - `getHandPotential(cards)` - 手牌潛力（改進可能性）

2. **勝率計算**
   - `calculateEquity(holeCards, communityCards, numOpponents)` - 蒙特卡洛模擬勝率
   - `calculateWinProbability(hand, board, opponents)` - 計算獲勝概率
   - `simulateShowdown(iterations)` - 模擬多次攤牌

3. **底池賠率**
   - `calculatePotOdds(potSize, callAmount)` - 計算底池賠率
   - `calculateImpliedOdds(pot, call, stackDepth)` - 隱含賠率
   - `shouldCallBasedOnOdds(equity, potOdds)` - 根據賠率決定是否跟注

4. **聽牌檢測**
   - `findFlushDraw(cards)` - 檢測同花聽牌
   - `findStraightDraw(cards)` - 檢測順子聽牌
   - `findOuts(hand, board)` - 計算 outs（改進機會）

**測試**：`tests/unit/PokerMath.test.js` (~150 行)

---

## Phase 4.2: OpponentModeler - 對手建模 (~400 行)

### 文件：`src/ai/modeling/OpponentModeler.js`

**OpponentProfile 類別**：
```javascript
class OpponentProfile {
  constructor(playerId) {
    this.playerId = playerId;

    // 統計數據
    this.stats = {
      vpip: 0,              // Voluntarily Put money In Pot
      pfr: 0,               // Pre-Flop Raise
      aggression: 0,        // 侵略性因子
      wtsd: 0,              // Went To ShowDown
      wsd: 0,               // Won at ShowDown
      threebet: 0,          // 3-bet 頻率
      foldToCBet: 0,        // 對持續下注的棄牌率
      continuation: 0       // 持續下注頻率
    };

    // 位置感知
    this.positionStats = {
      earlyPosition: {},
      middlePosition: {},
      latePosition: {}
    };

    // 行為模式
    this.patterns = {
      bluffFrequency: 0,
      slowPlayFrequency: 0,
      tiltIndicators: []
    };

    // 手牌範圍估計
    this.handRanges = {
      preflop: [],
      postflop: []
    };

    // 玩家分類
    this.playerType = null; // 'tight-aggressive', 'loose-aggressive', etc.
  }
}
```

**功能**：
1. **數據收集**
   - `updateFromAction(action, context)` - 從動作更新統計
   - `recordShowdown(cards, result)` - 記錄攤牌數據
   - `trackBettingPattern(actions)` - 追蹤下注模式

2. **玩家分類**
   - `classifyPlayerType()` - 將玩家分類（TAG, LAG, LP, TP, Balanced）
   - `updateClassification()` - 動態更新分類

3. **預測**
   - `predictAction(situation)` - 預測對手動作
   - `estimateHandRange(action, position)` - 估計手牌範圍
   - `calculateFoldProbability(betSize)` - 計算棄牌概率

**測試**：`tests/unit/OpponentModeler.test.js` (~200 行)

---

## Phase 4.3: MemorySystem - 記憶系統 (~350 行)

### 文件：`src/ai/learning/MemorySystem.js`

**功能**：
1. **短期記憶**（當前手牌）
   - 當前輪次的動作序列
   - 已觀察到的卡牌
   - 底池大小變化

2. **長期記憶**（跨局）
   - 對手檔案（OpponentProfile）
   - 策略調整紀錄
   - 績效指標

3. **工作記憶**（環形緩衝）
   - 最近 N 個動作
   - 決策歷史
   - 結果回饋

**類別結構**：
```javascript
class MemorySystem {
  constructor(config = {}) {
    this.shortTerm = {
      currentHand: null,
      observedActions: [],
      potHistory: []
    };

    this.longTerm = {
      opponentProfiles: new Map(),
      strategyAdjustments: [],
      performanceMetrics: {}
    };

    this.workingMemory = new CircularBuffer(100);
  }
}
```

**測試**：`tests/unit/MemorySystem.test.js` (~150 行)

---

## Phase 4.4: DecisionEngine - 決策引擎 (~500 行)

### 文件：`src/ai/core/DecisionEngine.js`

**決策流程**：
```
1. 收集當前遊戲狀態
2. 評估手牌強度 (PokerMath)
3. 計算底池賠率
4. 查詢對手模型 (OpponentModeler)
5. 計算每個動作的期望值 (EV)
6. 應用個性修正
7. 選擇最佳動作
8. 添加隨機性（防止被預測）
```

**功能**：
1. **期望值計算**
   - `calculateEV(action, gameState)` - 計算期望值
   - `compareActionEVs(actions)` - 比較所有動作的 EV
   - `selectOptimalAction()` - 選擇最佳動作

2. **決策邏輯**
   - `makeDecision(gameState, legalActions)` - 主決策方法
   - `evaluateFold(gameState)` - 評估棄牌
   - `evaluateCall(gameState)` - 評估跟注
   - `evaluateRaise(gameState)` - 評估加注
   - `evaluateBluff(gameState)` - 評估詐唬

3. **個性系統**
   - `applyPersonality(decision, personality)` - 應用個性修正
   - 個性類型：aggressive, cautious, balanced, tricky

**測試**：`tests/unit/DecisionEngine.test.js` (~250 行)

---

## Phase 4.5: LearningEngine - 學習引擎 (~400 行)

### 文件：`src/ai/learning/LearningEngine.js`

**學習演算法**：
1. **強化學習（簡化 Q-Learning）**
   - State-Action-Reward 表
   - Exploration vs Exploitation (ε-greedy)
   - 更新公式：Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]

2. **模式識別**
   - 識別對手常見的下注模式
   - 學習成功的策略
   - 調整基於結果

3. **策略調整**
   - 根據對手類型調整策略
   - 動態難度調整
   - 利用對手弱點

**功能**：
```javascript
class LearningEngine {
  learn(handHistory, result) {
    // 1. 編碼狀態
    const states = this.encodeStates(handHistory);

    // 2. 計算獎勵
    const rewards = this.calculateRewards(result);

    // 3. 更新 Q 表
    this.updateQTable(states, rewards);

    // 4. 調整探索率
    this.adjustExplorationRate();
  }
}
```

**測試**：`tests/unit/LearningEngine.test.js` (~200 行)

---

## Phase 4.6: LearningAI - 主 AI 類別 (~600 行)

### 文件：`src/ai/core/LearningAI.js`

**整合所有組件**：
```javascript
class LearningAI {
  constructor(config = {}) {
    this.id = config.id;
    this.name = config.name || 'AI Bot';
    this.personality = config.personality || 'balanced';
    this.difficulty = config.difficulty || 'medium';

    // 組件
    this.opponentModeler = new OpponentModeler();
    this.pokerMath = new PokerMath();
    this.decisionEngine = new DecisionEngine({
      personality: this.personality,
      difficulty: this.difficulty
    });
    this.memory = new MemorySystem();
    this.learningEngine = new LearningEngine();

    // 狀態
    this.chips = config.startingChips || 1000;
    this.hand = null;
    this.position = null;
    this.confidence = 0.5;
  }

  // 主方法
  async makeDecision(gameState) {
    // 1. 觀察遊戲狀態
    this.observeGameState(gameState);

    // 2. 更新對手模型
    this.updateOpponentModels(gameState);

    // 3. 做出決策
    const decision = await this.decisionEngine.makeDecision(
      gameState,
      this.getContext()
    );

    // 4. 記錄決策
    this.memory.recordDecision(decision);

    return decision;
  }

  // 學習方法
  learnFromResult(handHistory, result) {
    this.learningEngine.learn(handHistory, result);
    this.updateStrategy();
  }
}
```

**測試**：`tests/unit/LearningAI.test.js` (~300 行)

---

## Phase 4.7: AIController - AI 整合控制器 (~300 行)

### 文件：`src/ai/integration/AIController.js`

**橋接 AI 與遊戲系統**：
```javascript
class AIController {
  constructor(game, eventBus, timeManager) {
    this.game = game;
    this.eventBus = eventBus;
    this.timeManager = timeManager;
    this.aiPlayers = new Map();

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // 當輪到 AI 玩家時
    this.eventBus.on(PLAYER_EVENTS.PLAYER_TURN_START, (data) => {
      const player = this.game.getPlayerById(data.playerId);
      if (player && player.type === 'ai') {
        this.handleAITurn(player);
      }
    });

    // 手牌結束時學習
    this.eventBus.on(GAME_EVENTS.HAND_ENDED, (data) => {
      this.aiPlayers.forEach(ai => {
        ai.learnFromResult(data.handHistory, data.result);
      });
    });
  }

  async handleAITurn(player) {
    const ai = this.aiPlayers.get(player.id);
    if (!ai) return;

    // 添加思考時間（讓遊戲更真實）
    const thinkingTime = this.calculateThinkingTime(ai, this.game);
    await this.timeManager.delay(thinkingTime);

    // AI 做決策
    const decision = await ai.makeDecision(this.game);

    // 執行動作
    this.game.executeMove(player.id, decision.action, decision.amount);
  }
}
```

**測試**：`tests/integration/AIController.test.js` (~150 行)

---

## 實作順序

### Week 1-2: 基礎數學和建模
1. ✅ PokerMath.js + 測試
2. ✅ OpponentModeler.js + 測試

### Week 3: 記憶和決策
3. ✅ MemorySystem.js + 測試
4. ✅ DecisionEngine.js + 測試

### Week 4: 學習和整合
5. ✅ LearningEngine.js + 測試
6. ✅ LearningAI.js + 測試
7. ✅ AIController.js + 測試

### Week 5: 完善和優化
8. ✅ 整合測試
9. ✅ AI vs AI 對戰測試
10. ✅ 參數調優
11. ✅ 文檔和演示

---

## 技術決策

### 學習演算法
- **簡化 Q-Learning**：不使用深度神經網路，使用表格型 Q-Learning
- **指數移動平均（EMA）**：用於更新對手統計
- **Epsilon-Greedy**：平衡探索與利用

### 性能優化
- **蒙特卡洛採樣**：限制模擬次數（1000-5000次）
- **緩存**：緩存手牌評估結果
- **異步決策**：使用 async/await 避免阻塞

### 數據持久化
- **localStorage**：儲存長期記憶和對手檔案
- **JSON 序列化**：所有 AI 數據可序列化

---

## 成功標準

### 最小可行產品（MVP）
- ✅ AI 能做出合理的決策（不會犯明顯錯誤）
- ✅ AI 能識別和記憶對手模式
- ✅ AI 能根據對手類型調整策略
- ✅ AI 能從遊戲中學習（勝率隨時間提升）

### 完整版本
- ✅ 多種個性（aggressive, cautious, balanced, tricky）
- ✅ 多種難度（easy, medium, hard, expert）
- ✅ 完整的對手建模（10+ 統計指標）
- ✅ 真實的思考時間模擬
- ✅ 可序列化的 AI 狀態

---

## 測試策略

1. **單元測試**：每個類別獨立測試
2. **整合測試**：AI vs AI 對戰
3. **性能測試**：決策時間 < 100ms
4. **學習測試**：驗證 AI 隨時間改善

---

## 文件結構

```
src/ai/
├── core/
│   ├── LearningAI.js          (~600 lines)
│   └── DecisionEngine.js      (~500 lines)
├── modeling/
│   └── OpponentModeler.js     (~400 lines)
├── poker/
│   └── PokerMath.js           (~300 lines)
├── learning/
│   ├── MemorySystem.js        (~350 lines)
│   └── LearningEngine.js      (~400 lines)
├── integration/
│   └── AIController.js        (~300 lines)
└── utils/
    ├── CircularBuffer.js      (~100 lines)
    └── ActionHistory.js       (~150 lines)

tests/unit/
├── PokerMath.test.js          (~150 lines)
├── OpponentModeler.test.js    (~200 lines)
├── MemorySystem.test.js       (~150 lines)
├── DecisionEngine.test.js     (~250 lines)
├── LearningEngine.test.js     (~200 lines)
└── LearningAI.test.js         (~300 lines)

tests/integration/
└── AIController.test.js       (~150 lines)
```

**預估代碼量**：
- 生產代碼：~3,100 行
- 測試代碼：~1,400 行
- **總計**：~4,500 行

---

## 下一步

開始實作 Phase 4.1 - PokerMath.js

準備開始！🚀
