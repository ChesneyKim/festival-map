import { detail } from "@/lib/server";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ contentId: string }> },
) {
  try {
    const r = await detail((await params).contentId);
    return r
      ? Response.json(r)
      : Response.json({ error: "축제를 찾을 수 없어요." }, { status: 404 });
  } catch {
    return Response.json(
      { error: "축제 정보를 불러오지 못했어요." },
      { status: 503 },
    );
  }
}
