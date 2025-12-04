/**
 * @fileoverview DOM manipulation and animation helper utilities
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Provides utilities for creating, manipulating, and animating
 * DOM elements. Includes helper functions for common UI tasks.
 *
 * @example
 * import { createElement, animate, fadeIn } from './DOMHelpers.js';
 *
 * const div = createElement('div', { class: 'card' }, 'A`');
 * fadeIn(div, 300);
 * animate(div, { transform: 'translateX(100px)' }, 500);
 */

/**
 * Creates a DOM element with attributes and content
 *
 * @param {string} tag - HTML tag name
 * @param {Object} [attributes={}] - Element attributes
 * @param {string|HTMLElement|HTMLElement[]} [content] - Element content
 * @returns {HTMLElement} Created element
 *
 * @example
 * createElement('div', { class: 'card', id: 'card-1' }, 'A`');
 * createElement('button', { 'data-action': 'fold' }, 'Fold');
 */
export function createElement(tag, attributes = {}, content = null) {
  const element = document.createElement(tag);

  // Set attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  }

  // Set content
  if (content !== null) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else if (Array.isArray(content)) {
      content.forEach(child => {
        if (child instanceof HTMLElement) {
          element.appendChild(child);
        }
      });
    } else if (content instanceof HTMLElement) {
      element.appendChild(content);
    }
  }

  return element;
}

/**
 * Queries a single element
 *
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [parent=document] - Parent element to search within
 * @returns {HTMLElement|null} Found element or null
 */
export function query(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Queries multiple elements
 *
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [parent=document] - Parent element to search within
 * @returns {HTMLElement[]} Array of found elements
 */
export function queryAll(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Adds CSS class(es) to an element
 *
 * @param {HTMLElement} element - Target element
 * @param {string|string[]} classes - Class name(s) to add
 */
export function addClass(element, classes) {
  const classList = Array.isArray(classes) ? classes : [classes];
  element.classList.add(...classList);
}

/**
 * Removes CSS class(es) from an element
 *
 * @param {HTMLElement} element - Target element
 * @param {string|string[]} classes - Class name(s) to remove
 */
export function removeClass(element, classes) {
  const classList = Array.isArray(classes) ? classes : [classes];
  element.classList.remove(...classList);
}

/**
 * Toggles CSS class(es) on an element
 *
 * @param {HTMLElement} element - Target element
 * @param {string|string[]} classes - Class name(s) to toggle
 */
export function toggleClass(element, classes) {
  const classList = Array.isArray(classes) ? classes : [classes];
  classList.forEach(cls => element.classList.toggle(cls));
}

/**
 * Checks if element has a CSS class
 *
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to check
 * @returns {boolean} True if element has the class
 */
export function hasClass(element, className) {
  return element.classList.contains(className);
}

/**
 * Sets inline styles on an element
 *
 * @param {HTMLElement} element - Target element
 * @param {Object} styles - Style properties
 *
 * @example
 * setStyles(element, {
 *   color: 'red',
 *   fontSize: '16px',
 *   transform: 'translateX(100px)'
 * });
 */
export function setStyles(element, styles) {
  Object.assign(element.style, styles);
}

/**
 * Gets computed style value for an element
 *
 * @param {HTMLElement} element - Target element
 * @param {string} property - CSS property name
 * @returns {string} Computed style value
 */
export function getStyle(element, property) {
  return window.getComputedStyle(element)[property];
}

/**
 * Shows an element (sets display style)
 *
 * @param {HTMLElement} element - Target element
 * @param {string} [display='block'] - Display value
 */
export function show(element, display = 'block') {
  element.style.display = display;
}

/**
 * Hides an element (sets display to none)
 *
 * @param {HTMLElement} element - Target element
 */
export function hide(element) {
  element.style.display = 'none';
}

/**
 * Toggles element visibility
 *
 * @param {HTMLElement} element - Target element
 * @param {string} [display='block'] - Display value when showing
 */
export function toggle(element, display = 'block') {
  if (element.style.display === 'none') {
    show(element, display);
  } else {
    hide(element);
  }
}

/**
 * Removes an element from the DOM
 *
 * @param {HTMLElement} element - Element to remove
 */
export function remove(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Clears all children from an element
 *
 * @param {HTMLElement} element - Parent element
 */
export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Gets element position relative to viewport
 *
 * @param {HTMLElement} element - Target element
 * @returns {Object} Position object with x, y, width, height
 */
export function getElementPosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2
  };
}

/**
 * Gets element position relative to document
 *
 * @param {HTMLElement} element - Target element
 * @returns {Object} Position object with x, y, width, height
 */
export function getAbsolutePosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + window.scrollX + rect.width / 2,
    centerY: rect.top + window.scrollY + rect.height / 2
  };
}

/**
 * Animates element properties using CSS transitions
 *
 * @param {HTMLElement} element - Target element
 * @param {Object} properties - CSS properties to animate
 * @param {number} [duration=300] - Animation duration in milliseconds
 * @param {string} [easing='ease'] - CSS easing function
 * @returns {Promise} Resolves when animation completes
 *
 * @example
 * animate(element, {
 *   transform: 'translateX(100px)',
 *   opacity: 0.5
 * }, 500, 'ease-out');
 */
export function animate(element, properties, duration = 300, easing = 'ease') {
  return new Promise(resolve => {
    const originalTransition = element.style.transition;

    // Set transition
    element.style.transition = `all ${duration}ms ${easing}`;

    // Apply properties
    Object.assign(element.style, properties);

    // Wait for animation to complete
    const handleTransitionEnd = () => {
      element.style.transition = originalTransition;
      element.removeEventListener('transitionend', handleTransitionEnd);
      resolve();
    };

    element.addEventListener('transitionend', handleTransitionEnd);

    // Fallback timeout
    setTimeout(() => {
      element.style.transition = originalTransition;
      element.removeEventListener('transitionend', handleTransitionEnd);
      resolve();
    }, duration + 50);
  });
}

/**
 * Fades in an element
 *
 * @param {HTMLElement} element - Target element
 * @param {number} [duration=300] - Fade duration in milliseconds
 * @param {string} [display='block'] - Display value when visible
 * @returns {Promise} Resolves when fade completes
 */
export function fadeIn(element, duration = 300, display = 'block') {
  element.style.opacity = '0';
  element.style.display = display;

  return animate(element, { opacity: '1' }, duration, 'ease-in');
}

/**
 * Fades out an element
 *
 * @param {HTMLElement} element - Target element
 * @param {number} [duration=300] - Fade duration in milliseconds
 * @returns {Promise} Resolves when fade completes
 */
export function fadeOut(element, duration = 300) {
  return animate(element, { opacity: '0' }, duration, 'ease-out').then(() => {
    element.style.display = 'none';
  });
}

/**
 * Slides element in from top
 *
 * @param {HTMLElement} element - Target element
 * @param {number} [duration=300] - Slide duration in milliseconds
 * @returns {Promise} Resolves when slide completes
 */
export function slideIn(element, duration = 300) {
  element.style.transform = 'translateY(-100%)';
  element.style.display = 'block';

  return animate(element, { transform: 'translateY(0)' }, duration, 'ease-out');
}

/**
 * Slides element out to top
 *
 * @param {HTMLElement} element - Target element
 * @param {number} [duration=300] - Slide duration in milliseconds
 * @returns {Promise} Resolves when slide completes
 */
export function slideOut(element, duration = 300) {
  return animate(element, { transform: 'translateY(-100%)' }, duration, 'ease-in').then(() => {
    element.style.display = 'none';
  });
}

/**
 * Scales element to size
 *
 * @param {HTMLElement} element - Target element
 * @param {number} scale - Scale factor (1 = 100%)
 * @param {number} [duration=300] - Animation duration in milliseconds
 * @returns {Promise} Resolves when animation completes
 */
export function scaleTo(element, scale, duration = 300) {
  return animate(element, { transform: `scale(${scale})` }, duration, 'ease-out');
}

/**
 * Moves element to position
 *
 * @param {HTMLElement} element - Target element
 * @param {number} x - Target X position
 * @param {number} y - Target Y position
 * @param {number} [duration=300] - Animation duration in milliseconds
 * @returns {Promise} Resolves when animation completes
 */
export function moveTo(element, x, y, duration = 300) {
  return animate(element, { transform: `translate(${x}px, ${y}px)` }, duration, 'ease-out');
}

/**
 * Rotates element to angle
 *
 * @param {HTMLElement} element - Target element
 * @param {number} degrees - Rotation angle in degrees
 * @param {number} [duration=300] - Animation duration in milliseconds
 * @returns {Promise} Resolves when animation completes
 */
export function rotateTo(element, degrees, duration = 300) {
  return animate(element, { transform: `rotate(${degrees}deg)` }, duration, 'ease-out');
}

/**
 * Adds event listener with automatic cleanup
 *
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} [options] - Event listener options
 * @returns {Function} Cleanup function to remove listener
 */
export function on(element, event, handler, options = {}) {
  element.addEventListener(event, handler, options);

  // Return cleanup function
  return () => element.removeEventListener(event, handler, options);
}

/**
 * Adds one-time event listener
 *
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 */
export function once(element, event, handler) {
  element.addEventListener(event, handler, { once: true });
}

/**
 * Removes event listener
 *
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 */
export function off(element, event, handler) {
  element.removeEventListener(event, handler);
}

/**
 * Delegates event handling to parent element
 *
 * @param {HTMLElement} parent - Parent element
 * @param {string} selector - Child selector
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @returns {Function} Cleanup function
 */
export function delegate(parent, selector, event, handler) {
  const delegatedHandler = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e);
    }
  };

  parent.addEventListener(event, delegatedHandler);

  return () => parent.removeEventListener(event, delegatedHandler);
}

/**
 * Waits for specified milliseconds
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Resolves after delay
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs callback when DOM is ready
 *
 * @param {Function} callback - Function to run
 */
export function ready(callback) {
  if (document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

/**
 * Gets viewport dimensions
 *
 * @returns {Object} Viewport width and height
 */
export function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Checks if element is in viewport
 *
 * @param {HTMLElement} element - Target element
 * @returns {boolean} True if element is visible in viewport
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

/**
 * Scrolls to element smoothly
 *
 * @param {HTMLElement} element - Target element
 * @param {Object} [options] - Scroll options
 */
export function scrollToElement(element, options = {}) {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
    ...options
  });
}

/**
 * Copies text to clipboard
 *
 * @param {string} text - Text to copy
 * @returns {Promise} Resolves when copy completes
 */
export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

/**
 * Loads image and returns promise
 *
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>} Resolves with loaded image
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Creates element from HTML string
 *
 * @param {string} html - HTML string
 * @returns {HTMLElement} Created element
 */
export function fromHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

/**
 * Serializes form data to object
 *
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data as object
 */
export function serializeForm(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      // Convert to array if multiple values
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  return data;
}

/**
 * Debounces function calls
 *
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttles function calls
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generates unique ID
 *
 * @param {string} [prefix=''] - ID prefix
 * @returns {string} Unique ID
 */
export function uniqueId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
