// One small, local icon set. Decorative SVGs inherit the physical control's color.
const shapes={
 keepsake:'<path d="m5 3 15 2-2 16-15-2Z"/><path d="m6 14 3-3 3 3 3-2 2 4M7 7h.01"/>',
 television:'<rect x="2" y="6" width="20" height="15" rx="3"/><path d="m7 2 5 4 5-4M17 10v7"/><rect x="5" y="9" width="9" height="9" rx="2"/><circle cx="19" cy="10" r=".5"/>',
 firstaid:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V3h8v3m-4 4v7m-3-3.5h6"/>',
 radio:'<rect x="3" y="11" width="18" height="10" rx="2"/><path d="m6 11 9-9M6 15h6m-6 3h6"/><circle cx="17" cy="16" r="2"/>',
 journal:'<path d="M12 5C8 2 3 4 2 5v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0Zm0 0v15M5 8h4m-4 4h4m6-4h4m-4 4h4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 heart:'<path d="M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z"/>',

 play:'<path d="m9 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',
 previous:'<path d="M5 5v14m14-14L8 12l11 7Z"/>',next:'<path d="M19 5v14M5 5l11 7-11 7Z"/>',
 volume:'<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',mute:'<path d="M3 9h4l5-4v14l-5-4H3Zm13 0 6 6m0-6-6 6"/>',
 album:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1"/>',
 add:'<path d="M12 5v14M5 12h14"/>',visuals:'<path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3m0 3v.1"/>',
 back:'<path d="m9 5-6 6 6 6m-6-6h12a6 6 0 0 1 6 6"/>',remove:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v8m4-8v8"/>',
 music:'<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'
};
export function deviceIcon(name){return `<svg class="device-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[name]||shapes.music}</svg>`}

export function setDeviceIcon(node,name){if(node.dataset.icon!==name){node.innerHTML=deviceIcon(name);node.dataset.icon=name}}
