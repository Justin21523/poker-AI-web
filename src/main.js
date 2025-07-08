// src/main.js
import GameLoop from "./core/GameLoop.js";

function onFrame(deltaTime) {
  console.log(`每幀時間差：${deltaTime.toFixed(3)}s`);
}

// 訂閱並啟動
GameLoop.subscribe(onFrame);
GameLoop.start();
