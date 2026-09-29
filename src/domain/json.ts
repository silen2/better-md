export type JsonTransform = "format" | "minify" | "escape" | "unescape" | "validate";

export function transformJson(content: string, action: JsonTransform) {
  if (action === "validate") {
    JSON.parse(content);
    return content;
  }
  if (action === "format") return JSON.stringify(JSON.parse(content), null, 2);
  if (action === "minify") return JSON.stringify(JSON.parse(content));
  if (action === "escape") return JSON.stringify(content).slice(1, -1);
  return JSON.parse(`"${content}"`) as string;
}
