export function normalizePathName(url: URL): string {
  let result = url.pathname;

  if (!result) {
    result = "/index.html";
  }

  if (result === "/") {
    result = "/index.html";
  }

  return result;
}
