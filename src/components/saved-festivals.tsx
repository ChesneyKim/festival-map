"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { today, type FestivalDetail } from "@/lib/domain";
import { readSaved, SaveButton } from "./save-button";

function SavedFestival({ id }: { id: string }) {
  const [result, setResult] = useState<{
    item: FestivalDetail;
    demo: boolean;
    stale?: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch(`/api/festivals/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            r.status === 404
              ? "현재 제공되지 않는 축제예요."
              : "축제를 불러오지 못했어요.",
          );
        return r.json();
      })
      .then((r) => {
        if (!controller.signal.aborted) setResult(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, retry]);
  const f = result?.item;
  return (
    <article className="card saved-card">
      <div className="saved-card-actions">
        <SaveButton id={id} />
      </div>
      {error ? (
        <div className="card-content">
          <p role="alert">{error}</p>
          <button onClick={() => setRetry((n) => n + 1)}>다시 불러오기</button>
          <p>찜을 해제하거나 나중에 다시 확인해 주세요.</p>
        </div>
      ) : !f ? (
        <p className="card-content" role="status">
          축제를 불러오는 중…
        </p>
      ) : (
        <>
          <div className="card-art">
            {f.imageUrl ? (
              <img
                src={f.imageUrl}
                alt={`${f.title} 대표 이미지`}
                loading="lazy"
              />
            ) : (
              <small>공식 이미지가 아직 없어요</small>
            )}
          </div>
          <div className="card-content">
            <span className="field-label">
              {result?.demo
                ? "가상 예시 · 실제 행사 아님"
                : f.endDate < today()
                  ? "종료"
                  : f.startDate > today()
                    ? "개최 예정"
                    : "행사 기간 중"}
            </span>
            <Link href={`/festivals/${encodeURIComponent(id)}`}>
              <h2>{f.title} ↗</h2>
            </Link>
            <p>{f.address || "장소 확인 중"}</p>
            <p>
              {f.startDate} — {f.endDate}
            </p>
            <p className="schedule-note">
              {result?.stale ? "최신 정보를 확인하지 못했어요. " : ""}운영
              요일·시간은 방문 전 확인해 주세요.
            </p>
            <small>
              {result?.demo
                ? "기능 확인용 가상 콘텐츠"
                : `출처: 한국관광공사 TourAPI · ${f.copyrightCode || "저작권 별도 확인 필요"}`}
            </small>
          </div>
        </>
      )}
    </article>
  );
}

export function SavedFestivals() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [limit, setLimit] = useState(12);
  useEffect(() => {
    const update = () => setIds([...new Set(readSaved())]);
    update();
    window.addEventListener("storage", update);
    window.addEventListener("saved-change", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("saved-change", update);
    };
  }, []);
  if (!ids) return <p role="status">저장한 축제를 확인하고 있어요…</p>;
  if (!ids.length)
    return (
      <div className="empty">
        <h2>마음에 드는 축제를 모아보세요</h2>
        <p>축제의 하트를 누르면 여기에 모여요.</p>
        <Link href="/">축제 둘러보기 ↗</Link>
      </div>
    );
  return (
    <section aria-label="저장한 축제 목록">
      <p role="status">총 {ids.length}개 · 종료된 행사도 표시해요</p>
      <div className="cards">
        {ids.slice(0, limit).map((id) => (
          <SavedFestival key={id} id={id} />
        ))}
      </div>
      {ids.length > limit && (
        <button className="load-more" onClick={() => setLimit((n) => n + 12)}>
          12개 더 보기
        </button>
      )}
    </section>
  );
}
