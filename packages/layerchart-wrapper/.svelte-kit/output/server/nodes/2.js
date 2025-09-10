

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.BCHEDYmr.js","_app/immutable/chunks/NZTpNUN0.js","_app/immutable/chunks/B1Fcu0CR.js","_app/immutable/chunks/Bu2W2qwN.js"];
export const stylesheets = [];
export const fonts = [];
