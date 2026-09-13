export function parseTour(text: string): {
  items: Record<string, unknown>[];
  total: number;
} {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("TourAPI XML or invalid response");
  }
  const code = String(json?.response?.header?.resultCode);
  if (!["0000", "00"].includes(code)) throw new Error("TourAPI error " + code);
  const body = json.response.body;
  if (!body) throw new Error("Missing body");
  const total = Number(body.totalCount);
  if (!Number.isInteger(total) || total < 0) throw new Error("Invalid total");
  const item = body.items?.item;
  const items = !item ? [] : Array.isArray(item) ? item : [item];
  if (items.some((x: unknown) => !x || typeof x !== "object"))
    throw new Error("Invalid items");
  if (total > 0 && !items.length) throw new Error("Incomplete upstream page");
  return { items, total };
}
