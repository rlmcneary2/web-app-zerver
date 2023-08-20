import { logger } from "./another.ts";

logger("This is an empty module file (logger).");

let foo: number | string | undefined;

foo = 1;

export { foo };
