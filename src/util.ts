export function getUrlEncodedFilename(filename: string) {
  return filename
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}
