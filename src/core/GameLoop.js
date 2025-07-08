// src/core/GameLoop.js

class GameLoop {
  constructor() {
    // 上一次執行 tick 時的 timestamp（毫秒）
    this.lastTime = 0;
    // 訂閱者集合：存放所有想在每幀更新時被呼叫的 callback(fn)
    this.subscribers = new Set();
    // 綁定 tick 方法，確保 this 永遠指向 GameLoop 實例
    this.tick = this.tick.bind(this);
  }

  // 啟動迴圈：requestAnimationFrame 會帶入一個 high-resolution timestamp
  start() {
    // 重置 lastTime 為第一次呼叫時的 now
    this.lastTime = performance.now();
    requestAnimationFrame(this.tick);
  }

  // 每一幀都會呼叫這個函式
  tick(now) {
    // deltaTime in seconds
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // 通知所有訂閱者：帶上 deltaTime 讓他們更新各自邏輯
    for (const fn of this.subscribers) {
      try {
        fn(deltaTime);
      } catch (err) {
        console.error("GameLoop subscriber error:", err);
      }
    }

    // 安排下一次 tick
    requestAnimationFrame(this.tick);
  }

  // 訂閱：傳入一個函式，未來每幀都會被呼叫
  subscribe(fn) {
    this.subscribers.add(fn);
  }

  // 取消訂閱
  unsubscribe(fn) {
    this.subscribers.delete(fn);
  }
}

// 預設匯出單例，整個專案共用同一個 GameLoop
export default new GameLoop();
