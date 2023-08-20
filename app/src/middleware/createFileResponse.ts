import * as path from "https://deno.land/std@0.198.0/path/mod.ts";
import * as base64 from "https://deno.land/std@0.198.0/encoding/base64.ts";
import type { Context, Next } from "https://deno.land/x/oak@v12.6.0/mod.ts";
import { transform } from "https://deno.land/x/swc@0.2.1/mod.ts";
import * as mrmime from "https://deno.land/x/mrmime@v1.0.1/mod.ts";
import type { ServerState } from "../types.ts";

export async function createFileResponse<
  S extends ServerState,
  T extends Context<S>
>(ctx: T, next: Next) {
  console.log(`createFileResponse: enter '${ctx.state.filePathname}'`);

  if (!ctx.state.filePathname) {
    throw Error("State does not contain a 'filePathname'.");
  }

  const { filePathname } = ctx.state;

  // Special handling for typescript file requests, kind of the whole purpose
  // for creating this server.
  let handled = await handleTypeScript(filePathname, ctx);

  if (!handled) {
    const mimeType = mrmime.lookup(path.extname(filePathname));

    if (mimeType) {
      if (["text/html"].includes(mimeType)) {
        handled = await setTextFileResponse(
          ctx.response,
          filePathname,
          mimeType
        );
      } else if (["image/x-icon"].includes(mimeType)) {
        handled = await setBinaryResponse(ctx.response, filePathname, mimeType);
      }
    }
  }

  if (!handled) {
    throw Error(`Unsupported file type; '${ctx.request.url.pathname}'`);
  }

  console.log(`createFileResponse: exit`);

  return next();
}

async function handleTypeScript<S extends ServerState>(
  filePathname: string,
  ctx: Context<S>
): Promise<boolean> {
  if (!filePathname.toUpperCase().endsWith("TS")) {
    return false;
  }

  const file = await readTextFile(filePathname);

  const { code, map } = transform(file, {
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

async function readFile(filePathname: string): Promise<Uint8Array> {
  return await Deno.readFile(filePathname);
}

async function readTextFile(filePathname: string): Promise<string> {
  const arr = await readFile(filePathname);
  return new TextDecoder().decode(arr);
}

async function setTextFileResponse(
  response: Context["response"],
  filePathname: string,
  mimeType: string
): Promise<boolean> {
  response.body = await readTextFile(filePathname);
  response.headers.set("content-type", mimeType);
  return true;
}

async function setBinaryResponse(
  response: Context["response"],
  filePathname: string,
  mimeType: string
): Promise<boolean> {
  const file = await Deno.open(filePathname);
  response.body = new ReadableStream(file.readable);
  response.headers.set("content-type", mimeType);
  return true;
}
