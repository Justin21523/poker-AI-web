// src/main.js
import GameLoop from "./core/GameLoop.js";
import TableView from "./ui/TableView.js";

// 啟動遊戲迴圈
GameLoop.start();

// 初始化牌桌
const app = document.getElementById('app');
const tableView = new TableView(app);
tableView.init();
