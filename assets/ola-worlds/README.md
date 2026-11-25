# Shared Ola world card viewer

Import `CardViewer` from the shared `assets/ola-worlds/card-viewer.js` module. Cinema's adapter lives in `la-ola-cinema-club/assets/art-viewer.js`; Polaroid's adapter lives in `our-polaroid-project/portfolio.js`.

```js
const viewer = new CardViewer({
  theme: 'cinema', // or polaroid; custom themes via dialog[data-theme]
  intensity: 8,   // maximum drag tilt in degrees; reduced motion disables tilt
  label: 'Collection artwork',
  renderBack(container, item) { /* append safe DOM nodes for public details */ }
});
viewer.open(items, selectedIndex, opener);
// items: [{id, src, alt, title, ...worldSpecificPublicData}]
viewer.close();
viewer.destroy();
```

Pass the complete currently filtered collection, not only the visible paginated subset. Missing image sources are excluded. Images use contain fitting and preserve their original aspect ratio; the world supplies its own original card/photo dimensions. `renderBack` must use trusted public data and textContent; never fetch unpublished memories or account records. The component includes no sensor permissions, orientation tracking or haptic side effects.

Controls: Previous/Next, flip, zoom, reset, close; arrows navigate, Escape closes, focus stays in the modal and returns to the opener. One-finger horizontal swipes browse at normal zoom. Pinch/multi-pointer gestures and zoomed drags pan/zoom without browsing. Back content scrolls independently. Reduced motion disables tilt/gloss while retaining buttons and reading.

Call close before a world changes routes or collections. Future worlds should write an adapter and reuse this component, not fork the implementation. Browser/device acceptance remains required after adapter changes.
