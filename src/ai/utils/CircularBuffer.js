/**
 * @fileoverview Circular buffer implementation for fixed-size FIFO storage
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description A circular buffer (ring buffer) with fixed capacity.
 * When capacity is reached, oldest items are overwritten.
 * Used for storing recent actions and decisions in working memory.
 */

/**
 * CircularBuffer - Fixed-size FIFO buffer with circular overwrite
 */
export class CircularBuffer {
  /**
   * Create circular buffer
   * @param {number} capacity - Maximum number of items
   */
  constructor(capacity = 100) {
    if (capacity <= 0) {
      throw new Error('Capacity must be positive');
    }

    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0; // Next write position
    this.size = 0; // Current number of items
  }

  /**
   * Add item to buffer
   * @param {*} item - Item to add
   */
  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /**
   * Get all items in chronological order (oldest to newest)
   * @returns {Array} All items
   */
  getAll() {
    if (this.size === 0) {
      return [];
    }

    if (this.size < this.capacity) {
      // Buffer not yet full, return items from 0 to head-1
      return this.buffer.slice(0, this.size);
    }

    // Buffer is full, return from head (oldest) to end, then start to head-1
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head)
    ];
  }

  /**
   * Get last N items (most recent)
   * @param {number} n - Number of items to get
   * @returns {Array} Last N items in chronological order
   */
  getLast(n) {
    if (n <= 0) {
      return [];
    }

    const all = this.getAll();
    return all.slice(Math.max(0, all.length - n));
  }

  /**
   * Get first N items (oldest)
   * @param {number} n - Number of items to get
   * @returns {Array} First N items in chronological order
   */
  getFirst(n) {
    if (n <= 0) {
      return [];
    }

    const all = this.getAll();
    return all.slice(0, Math.min(n, all.length));
  }

  /**
   * Get item at index (0 = oldest, size-1 = newest)
   * @param {number} index - Index to access
   * @returns {*} Item at index or undefined
   */
  get(index) {
    if (index < 0 || index >= this.size) {
      return undefined;
    }

    const all = this.getAll();
    return all[index];
  }

  /**
   * Get current size
   * @returns {number} Number of items in buffer
   */
  getSize() {
    return this.size;
  }

  /**
   * Check if buffer is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.size === 0;
  }

  /**
   * Check if buffer is full
   * @returns {boolean} True if full
   */
  isFull() {
    return this.size === this.capacity;
  }

  /**
   * Clear all items
   */
  clear() {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.size = 0;
  }

  /**
   * Filter items by predicate
   * @param {Function} predicate - Filter function
   * @returns {Array} Filtered items
   */
  filter(predicate) {
    return this.getAll().filter(predicate);
  }

  /**
   * Map items with function
   * @param {Function} mapper - Map function
   * @returns {Array} Mapped items
   */
  map(mapper) {
    return this.getAll().map(mapper);
  }

  /**
   * Find first item matching predicate
   * @param {Function} predicate - Search function
   * @returns {*} First matching item or undefined
   */
  find(predicate) {
    return this.getAll().find(predicate);
  }

  /**
   * Serialize to JSON
   * @returns {Object} Serialized buffer
   */
  toJSON() {
    return {
      capacity: this.capacity,
      items: this.getAll()
    };
  }

  /**
   * Restore from JSON
   * @param {Object} data - Serialized data
   * @returns {CircularBuffer} Restored buffer
   */
  static fromJSON(data) {
    const buffer = new CircularBuffer(data.capacity);
    if (data.items) {
      data.items.forEach(item => buffer.push(item));
    }
    return buffer;
  }
}
