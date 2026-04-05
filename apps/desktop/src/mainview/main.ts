import "./lib/init"; // Wire adapters before anything else
import "./app.css";
import App from "./App.svelte";
import { mount } from "svelte";

const app = mount(App, {
	target: document.getElementById("app")!,
});

export default app;
