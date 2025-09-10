import * as server from '../entries/pages/schedules/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/schedules/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/schedules/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.BLiNq5G_.js","_app/immutable/chunks/CglMtoSz.js","_app/immutable/chunks/BFKdG0ZG.js","_app/immutable/chunks/KFa1jneB.js","_app/immutable/chunks/D-Pcb39S.js","_app/immutable/chunks/D3gtaW12.js","_app/immutable/chunks/BMuJlwvQ.js","_app/immutable/chunks/D2V3TrCl.js"];
export const stylesheets = ["_app/immutable/assets/vendor-misc.CpJl7oM0.css"];
export const fonts = [];
