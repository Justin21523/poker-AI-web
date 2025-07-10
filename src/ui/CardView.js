// src/ui/CardView.js

export default class CardView {
  /**
   * 建立一張牌（正面），牌面上可顯示花色與點數
   * @param {string} rank 牌點，例如 'A', '2', … 'K'
   * @param {string} suit 花色，例如 'hearts','spades','diamonds','clubs'
   * @returns {HTMLElement} .card.element
   */
  static createCard(rank, suit) {
    const el = document.createElement('div');
    el.classList.add('card', 'face');
    el.dataset.rank = rank;
    el.dataset.suit = suit;
    // 內容可用 data-attribute + CSS 或 innerHTML 直接插入
    el.innerHTML = `
      <span class="card-corner top-left">${rank}${CardView.getSuitSymbol(suit)}</span>
      <span class="card-corner bottom-right">${rank}${CardView.getSuitSymbol(suit)}</span>
    `;
    return el;
  }

  /**
   * 建立一張背面（預設樣式）
   */
  static createBack() {
    const el = document.createElement('div');
    el.classList.add('card', 'back');
    return el;
  }

  /**
   * 根據 suit 回傳符號（也可用圖片）
   */
  static getSuitSymbol(suit) {
    const map = {
      hearts:   '♥',
      diamonds: '♦',
      clubs:    '♣',
      spades:   '♠',
    };
    return map[suit] || '';
  }

  /**
   * 切換正反面（示範用，後面可做動畫）
   */
  static flip(el) {
    el.classList.toggle('face');
    el.classList.toggle('back');
  }
}
