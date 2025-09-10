import * as server from '../entries/pages/schedules/_id_/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/schedules/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/schedules/[id]/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.B12QyRvN.js","_app/immutable/chunks/CglMtoSz.js","_app/immutable/chunks/BFKdG0ZG.js","_app/immutable/chunks/KFa1jneB.js","_app/immutable/chunks/D-Pcb39S.js"];
export const stylesheets = ["_app/immutable/assets/vendor-misc.CpJl7oM0.css"];
export const fonts = [];
