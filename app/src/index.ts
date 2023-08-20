import { parse } from "https://deno.land/std@0.198.0/flags/mod.ts";
import { Application } from "https://deno.land/x/oak@v12.6.0/mod.ts";
import type { ServerState } from "./types.ts";
import { setFilename } from "./middleware/setFilename.ts";
import { createFileResponse } from "./middleware/createFileResponse.ts";

const args = parse(Deno.args);
console.log(`--directory='${args["directory"]}'`);

const app = new Application<ServerState>();

app.use(setFilename).use(createFileResponse);

await app.listen({ hostname: "0.0.0.0", port: 3000 });
