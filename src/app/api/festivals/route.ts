import { list } from "@/lib/server";
import { validDate, addDays } from "@/lib/domain";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const start = p.get("start") || "",
    end = p.get("end") || "",
    region = p.get("regionCode") || "";
  const page = Number(p.get("page") || 1),
    limit = Number(p.get("limit") || 100);
  if (
    !validDate(start) ||
    !validDate(end) ||
    start > end ||
    end > addDays(start, 365) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    (region && !/^\d{2}$/.test(region))
  )
    return Response.json(
      { error: "날짜와 지역 조건을 확인해 주세요." },
      { status: 400 },
    );
  try {
    return Response.json(await list(start, end, region, page, limit));
  } catch {
    return Response.json(
      { error: "축제를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
