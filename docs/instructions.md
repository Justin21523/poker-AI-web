# 🃏 Poker AI Website - 專案說明與協作風格指南

## 📌 專案目標

打造一個純 Vanilla JavaScript 撲克牌遊戲平台，所有功能皆可離線使用、無任何第三方框架與依賴，並以「模組分層 + 行為樹 AI + UI 動畫」為核心設計原則，結合學習與娛樂。

## 🧠 開發原則

1. **無套件、純原生 JS**：不使用 React、Vue、Lodash、JQuery 等外部函式庫。
2. **分層模組化設計**：
   - `/core/`：引擎層（GameLoop, EventBus, StateManager）
   - `/games/`：遊戲邏輯（OldMaidGame, BigTwoGame 等）
   - `/ai/`：AI 決策行為樹（BehaviorTree, Analyzer 等）
   - `/ui/`：DOM 渲染、動畫、主題管理等
   - `/save/`：本地遊戲存檔管理
3. **手刻行為樹 AI 系統**，從簡易 rule-based AI 到 selector/sequence 組合
4. **事件驅動架構**：使用 EventBus 替代直接函式呼叫，解耦各模組
5. **優化 CSS 動畫與 UI 響應式互動**，重視玩家操作體驗與視覺一致性
6. **使用 Git 作為每一階段版本控制工具**，依照分支規範管理 milestone

## 🚀 進度里程碑（Milestone Tags）

| 版本            | 任務範圍                                             | 狀態      |
| --------------- | ---------------------------------------------------- | --------- |
| v0.1-foundation | 完成桌面渲染、卡牌 UI、事件總線基礎架構              | ✅ 已完成 |
| v0.2-playable   | 實作抽鬼牌遊戲邏輯與基礎 AI 對手                     | ✅ 已完成 |
| v0.3-ai-core    | 架構大老二 + 行為樹 AI 系統                          | 🔜 進行中 |
| v0.4-multi-game | 實作心臟病、99、撿紅點等遊戲                         | ⏳ 規劃中 |
| v1.0.0          | 優化動畫 + 響應式介面 + 儲存功能 + GitHub Pages 發佈 | ⏳ 未開始 |

## 🔧 Git 工作流程

1. 每一款遊戲為一個 `feat/game-*` 分支
2. 每一個 milestone 合併回 `develop` 分支測試穩定
3. 發佈版本合併至 `main`，並打上標籤 `v0.x`、`v1.0.0`
4. Commit 訊息格式統一：`feat:` / `fix:` / `refactor:` / `docs:` / `test:`

## 📎 補充資料與規範

- 詳見 `/docs/architecture.md`：各模組設計原則
- 詳見 `/docs/ai_design.md`：行為樹與 AI 策略設計流程
- 遵守 `.eslintrc.json` 格式規範
- 遊戲流程圖與架構圖使用 Mermaid 描述（支援 GitHub preview）

---

## 🙋‍♂️ 若與 ChatGPT / AI 合作，請遵守以下 Prompt 原則：

1. 簡要說明目前開發進度與需求（如：我正在實作大老二的 AI 行為決策）
2. 指明希望 AI 協助的範圍（如：請幫我定義 BT 節點類別與出牌策略）
3. 若需要檢查程式碼錯誤，提供完整錯誤訊息或程式碼片段
