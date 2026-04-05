export type AppPhase = "loading" | "setup" | "login" | "app";

export const appState = $state({ phase: "loading" as AppPhase });
