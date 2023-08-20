import * as base64 from "https://deno.land/std@0.198.0/encoding/base64.ts";
import { parse } from "https://deno.land/std@0.198.0/flags/mod.ts";
import {
  Application,
  Context,
  Next
} from "https://deno.land/x/oak@v12.6.0/mod.ts";
import { transform } from "https://deno.land/x/swc@0.2.1/mod.ts";

const args = parse(Deno.args);
console.log(`--directory='${args["directory"]}'`);

const app = new Application<ServerState>();
app.use(middlewareFilename).use(middlewareFileResponse);
await app.listen({ hostname: "0.0.0.0", port: 3000 });

function middlewareFilename<S extends ServerState, T extends Context<S>>(
  { request, state }: T,
  next: Next
) {
  console.log(`middlewareFilename: enter '${request.url.pathname}'`);
  const pathname = normalizePathName(request.url);
  state.filePathname = `${args["directory"]}${pathname}`;
  console.log(`middlewareFilename: exit`);
  return next();
}

async function middlewareFileResponse<
  S extends ServerState,
  T extends Context<S>
>(ctx: T, next: Next) {
  console.log(`middlewareFileResponse: enter '${ctx.state.filePathname}'`);

  if (!ctx.state.filePathname) {
    throw Error("State does not contain a 'filePathname'.");
  }

  const { filePathname } = ctx.state;

  let handled = await handleHtml(filePathname, ctx);

  if (!handled) {
    handled = await handleTypeScript(filePathname, ctx);
  }

  if (!handled && filePathname.toUpperCase().endsWith("ICO")) {
    handled = true;
    ctx.response.status = 404;
  }

  if (!handled) {
    throw Error(`Unsupported file type; '${ctx.request.url.pathname}'`);
  }

  console.log(`middlewareFileResponse: exit`);

  return next();
}

function normalizePathName(url: URL): string {
  let result = url.pathname;

  if (!result) {
    result = "/index.html";
  }

  if (result === "/") {
    result = "/index.html";
  }

  return result;
}

async function handleHtml<S extends ServerState>(
  filePathname: string,
  ctx: Context<S>
): Promise<boolean> {
  if (!filePathname.toUpperCase().endsWith("HTML")) {
    return false;
  }

  const file = await Deno.readFile(filePathname);
  ctx.response.body = file;

  return true;
}

async function handleTypeScript<S extends ServerState>(
  filePathname: string,
  ctx: Context<S>
): Promise<boolean> {
  if (!filePathname.toUpperCase().endsWith("TS")) {
    return false;
  }

  const file = await Deno.readFile(filePathname);

  const { code, map } = transform(new TextDecoder().decode(file), {
    jsc: { parser: { syntax: "typescript" }, target: "es2022" },
    sourceMaps: true
  }) as { code: string; map: string };

  // Guess what? Source maps don't get generated correctly so we have to fix
  // them here. Fun. Set the correct source file name.
  const mapData = JSON.parse(map);
  mapData.sources = [filePathname];
  const mapEncoded = base64.encode(JSON.stringify(mapData));

  ctx.response.body = `${code}\n//# sourceMappingURL=data:application/json;base64,${mapEncoded}`;
  ctx.response.headers.set("content-type", "text/javascript");

  return true;
}

interface ServerState {
  filePathname?: string;
}
