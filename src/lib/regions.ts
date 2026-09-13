// Fail before committing if the upstream schema changes or omits required fields.
export function normalizeRegion(row: Record<string, unknown>) {
  const required = (key: string) => {
    const value = row[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("Invalid region field: " + key);
    }
    return value.trim();
  };
  return {
    code: required("lDongRegnCd"),
    name: required("lDongRegnNm"),
    district_code: required("lDongSignguCd"),
    district_name: required("lDongSignguNm"),
  };
}
