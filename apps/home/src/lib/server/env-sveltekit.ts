import { env } from "$env/dynamic/private";
import { setEnvProvider } from "$core/server/env";

setEnvProvider({ get: (key) => env[key] });
