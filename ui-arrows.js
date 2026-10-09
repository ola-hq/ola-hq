(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const directions = new Map([
    ['←', 'left'], ['⬅', 'left'], ['↔', 'both'],
    ['→', 'right'], ['➡', 'right'], ['➜', 'right'], ['➔', 'right'], ['➝', 'right'], ['❯', 'right'], ['⮕', 'right'],
    ['↑', 'up'], ['⬆', 'up'],
    ['↓', 'down'], ['⬇', 'down'],
    ['↗', 'up-right'], ['↖', 'up-left'], ['↘', 'down-right'], ['↙', 'down-left']
  ]);
  const arrowRE = /[←→↔↗↘↖↙↑↓⬅⬆⬇➡➜➔➝❯⮕]/g;
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'SELECT', 'OPTION', 'INPUT', 'CODE', 'PRE', 'SVG', 'MATH', 'TITLE', 'TEMPLATE']);

  const style = document.createElement('style');
  style.textContent = [
    '.ola-ui-arrow{display:inline-flex;width:.92em;height:.92em;vertical-align:-.11em;align-items:center;justify-content:center;flex:0 0 auto}',
    '.ola-ui-arrow svg{display:block;width:100%;height:100%;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
  ].join('');
  document.head.appendChild(style);

  function makeArrow(direction) {
    const wrap = document.createElement('span');
    wrap.className = 'ola-ui-arrow';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.dataset.direction = direction;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(NS, 'path');
    const paths = {
      left: 'M16 10H4m5-5-5 5 5 5',
      right: 'M4 10h12m-5-5 5 5-5 5',
      both: 'M16 10H4m5-5-5 5 5 5m2-10 5 5-5 5',
      up: 'M10 16V4m-5 5 5-5 5 5',
      down: 'M10 4v12m-5-5 5 5 5-5',
      'up-right': 'M5 15 15 5M8 5h7v7',
      'up-left': 'M15 15 5 5m7 0H5v7',
      'down-right': 'M5 5 15 15m0-7v7H8',
      'down-left': 'M15 5 5 15m0-7v7h7'
    };
    path.setAttribute('d', paths[direction] || paths.right);
    svg.appendChild(path);
    wrap.appendChild(svg);
    return wrap;
  }

  function normalizeTextNode(node) {
    const parent = node.parentElement;
    if (!parent || skip.has(parent.tagName) || parent.closest('[data-no-arrow-normalize]')) return;
    const value = node.nodeValue || '';
    if (!arrowRE.test(value)) {
      arrowRE.lastIndex = 0;
      return;
    }
    arrowRE.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    value.replace(arrowRE, (glyph, offset) => {
      if (offset > last) frag.appendChild(document.createTextNode(value.slice(last, offset)));
      frag.appendChild(makeArrow(directions.get(glyph) || 'right'));
      last = offset + glyph.length;
      return glyph;
    });
    if (last < value.length) frag.appendChild(document.createTextNode(value.slice(last)));
    node.replaceWith(frag);
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      normalizeTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && skip.has(root.tagName)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(normalizeTextNode);
  }

  const start = () => {
    scan(document.body);
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(scan));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
