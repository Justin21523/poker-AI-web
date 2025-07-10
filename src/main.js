// src/main.js
import GameLoop from "./core/GameLoop.js";
import TableView from "./ui/TableView.js";
import CardView from './ui/CardView.js';

// 啟動遊戲迴圈
GameLoop.start();

// 初始化牌桌
const app = document.getElementById('app');
const tableView = new TableView(app);
tableView.init();

// 例如把一張牌背加到「玩家 1」（seat-bottom）
const seatBottom = document.querySelector('.seat-bottom');
const cardBack = CardView.createBack();
seatBottom.appendChild(cardBack);

// 再加一張正面測試
const cardFace = CardView.createCard('A', 'spades');
seatBottom.appendChild(cardFace);

// 示範翻牌：點擊時切換
cardBack.addEventListener('click', () => CardView.flip(cardBack));
cardFace.addEventListener('click', () => CardView.flip(cardFace));