import { regions } from "@/lib/server";
export async function GET() {
  try {
    return Response.json({ items: await regions() });
  } catch {
    return Response.json(
      { error: "지역 정보를 불러오지 못했어요." },
      { status: 503 },
    );
  }
}
