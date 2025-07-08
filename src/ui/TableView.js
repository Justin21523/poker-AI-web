// src/ui/TableView.js
export default class TableView {
  constructor(container) {
    this.container = container; // e.g. document.getElementById('app')
  }

  init() {
    // 先清空容器
    this.container.innerHTML = "";

    // 建立牌桌主區
    const table = document.createElement("div");
    table.classList.add("table-grid");

    // HTML 內容：四個座位 + 棄牌區
    table.innerHTML = `
        <div class="seat seat-top">玩家 2</div>
        <div class="seat seat-left">玩家 4</div>
        <div class="center-pile">等待發牌…</div>
        <div class="seat seat-right">玩家 3</div>
        <div class="seat seat-bottom">玩家 1</div>
      `;

    this.container.appendChild(table);
  }
}
