export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BLHjbt2s.js",app:"_app/immutable/entry/app.Cqobv7rC.js",imports:["_app/immutable/entry/start.BLHjbt2s.js","_app/immutable/chunks/1FFHqbd7.js","_app/immutable/chunks/CO84KzFG.js","_app/immutable/chunks/Bu2W2qwN.js","_app/immutable/chunks/CaMWkm4s.js","_app/immutable/entry/app.Cqobv7rC.js","_app/immutable/chunks/Bu2W2qwN.js","_app/immutable/chunks/CO84KzFG.js","_app/immutable/chunks/CaMWkm4s.js","_app/immutable/chunks/NZTpNUN0.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
