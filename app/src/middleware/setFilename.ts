import { parse } from "https://deno.land/std@0.198.0/flags/mod.ts";
import { common } from "https://deno.land/std@0.198.0/path/common.ts";
import { isAbsolute } from "https://deno.land/std@0.198.0/path/is_absolute.ts";
import { join } from "https://deno.land/std@0.198.0/path/join.ts";
import type { Context, Next } from "https://deno.land/x/oak@v12.6.0/mod.ts";
import type { ServerState } from "../types.ts";
import { normalizePathName } from "../utils/path.ts";

export async function setFilename<S extends ServerState, T extends Context<S>>(
  { request, state }: T,
  next: Next
) {
  console.log(`setFilename: enter '${request.url.pathname}'`);

  const args = parse(Deno.args);
  const directory = args["directory"];

  const pathname = normalizePathName(request.url);

  const filePathname = join(
    isAbsolute(directory) ? "" : Deno.cwd(),
    directory,
    pathname
  );

  // Throws if the requested file is outside the directory specific when the
  // server was started.
  await allowedPath(directory, filePathname);

  state.filePathname = filePathname;

  console.log(`setFilename: exit`);

  return next();
}

async function allowedPath(
  directory: string,
  filePathname: string
): Promise<void> {
  const realDirectory = await Deno.realPath(directory);
  const commonPath = common([realDirectory, filePathname]);
  if (!commonPath.startsWith(realDirectory)) {
    throw Error("Requested file out of scope.");
  }
}
