/* Navigation glyphs use currentColor SVGs so Safari cannot render emoji boxes.
   Only link/button text is touched; artwork and ordinary prose stay intact. */
(() => {
  'use strict';
  const angles = { '→': 0, '↗': -45, '↑': -90, '↖': -135,
    '←': 180, '↙': 135, '↓': 90, '↘': 45, '➡': 0, '⬅': 180 };
  const pattern = /[→↗↑↖←↙↓↘➡⬅][\uFE0E\uFE0F]?/g;
  function arrow(glyph) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '1em');
    svg.setAttribute('height', '1em');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('data-navigation-arrow', glyph);
    svg.style.cssText = 'display:inline-block;vertical-align:-.12em;flex-shrink:0;overflow:visible;pointer-events:none';
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', 'M2.5 8h11M8.5 3l5 5-5 5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.35');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('transform', `rotate(${angles[glyph]} 8 8)`);
    svg.append(path);
    return svg;
  }
  function convert(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = root.nodeType === Node.TEXT_NODE ? [root] : [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent?.closest('a,button') || parent.closest('svg,script,style,textarea,[contenteditable]')) continue;
      const value = node.nodeValue;
      pattern.lastIndex = 0;
      if (!pattern.test(value)) continue;
      pattern.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let start = 0;
      for (const match of value.matchAll(pattern)) {
        fragment.append(value.slice(start, match.index), arrow(match[0][0]));
        start = match.index + match[0].length;
      }
      fragment.append(value.slice(start));
      node.replaceWith(fragment);
    }
  }
  convert(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') convert(record.target);
      else for (const node of record.addedNodes) convert(node);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
})();
