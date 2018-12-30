import { createHash } from "crypto";

export function getUrlEncodedFilename(filename: string) {
  return filename
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

export function sha1(data: string | Buffer) {
  const hash = createHash("sha1");
  hash.update(data);
  return hash.digest("hex");
}
