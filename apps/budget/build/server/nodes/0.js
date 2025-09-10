import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.BsDTjqkv.js","_app/immutable/chunks/CglMtoSz.js","_app/immutable/chunks/BFKdG0ZG.js","_app/immutable/chunks/KFa1jneB.js","_app/immutable/chunks/D-Pcb39S.js","_app/immutable/chunks/D3gtaW12.js","_app/immutable/chunks/BMuJlwvQ.js","_app/immutable/chunks/D2V3TrCl.js","_app/immutable/chunks/C0BpSEqy.js"];
export const stylesheets = ["_app/immutable/assets/vendor-misc.CpJl7oM0.css","_app/immutable/assets/data-table.D2Lc13gG.css","_app/immutable/assets/0.DG49YRvR.css"];
export const fonts = [];
