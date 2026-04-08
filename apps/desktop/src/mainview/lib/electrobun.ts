import { Electroview } from "electrobun/view";
import type { AppRPC } from "../../shared/rpc";

const rpcDef = Electroview.defineRPC<AppRPC>({
	maxRequestTime: 30000,
	handlers: {
		requests: {},
		messages: {},
	},
});

export const electrobun = new Electroview({ rpc: rpcDef });

function getRpc() {
	const rpc = electrobun.rpc;
	if (!rpc) throw new Error("Electrobun RPC not available");
	return rpc;
}

export const rpc = {
	getConfig: (params: {}) => getRpc().request.getConfig(params),
	setup: (params: { databasePath: string; authMode: "local" | "password"; email?: string; password?: string }) =>
		getRpc().request.setup(params),
	autoLogin: (params: {}) => getRpc().request.autoLogin(params),
};
