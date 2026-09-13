import Link from "next/link";
import { notFound } from "next/navigation";
import { detail } from "@/lib/server";
import { today, safeUrl } from "@/lib/domain";
import { SaveButton, ShareButton } from "@/components/save-button";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const result = await detail((await params).contentId);
  if (!result) notFound();
  const { item: f } = result;
  const date = today();
  const directions =
    f.latitude !== null && f.longitude !== null && !result.demo
      ? `https://map.kakao.com/link/to/${encodeURIComponent(f.title)},${f.latitude},${f.longitude}`
      : null;
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          ✳ 모두의 페스타
        </Link>
        <Link href="/">← 축제 지도로 돌아가기</Link>
      </header>
      <main className="detail">
        {result.demo && (
          <div className="demo-banner">
            가상 예시 축제 · 실제 행사나 일정이 아닙니다.
          </div>
        )}
        <div className="detail-heading">
          <div>
            <h1>{f.title}</h1>
            <p>
              {f.endDate < date
                ? "종료"
                : f.startDate > date
                  ? "개최 예정"
                  : "행사 기간 중"}{" "}
              · {f.startDate} — {f.endDate}
            </p>
          </div>
          <div className="detail-actions">
            <SaveButton id={f.contentId} />
            <ShareButton />
          </div>
        </div>
        {f.imageUrl ? (
          <img
            className="detail-image"
            src={f.imageUrl}
            alt={f.title + " 대표 이미지"}
          />
        ) : (
          <div className="detail-placeholder">
            <span aria-hidden="true">✳</span>
            <small>
              {result.demo ? "가상 축제 미리보기" : "공식 이미지가 아직 없어요"}
            </small>
          </div>
        )}
        <div className="detail-columns">
          <section className="detail-body" aria-label="축제 상세 정보">
            <h2>함께 알아볼 축제 이야기</h2>
            <p className="overview">
              {f.overview || "공식 소개가 아직 없어요."}
            </p>
            {result.stale && (
              <p role="status">
                최신 상세 정보를 확인하지 못했어요. 방문 전 공식 안내를 확인해
                주세요.
              </p>
            )}
            <h2>방문 전에 확인하세요</h2>
            <dl>
              {[
                ["장소", f.eventPlace],
                ["주소", f.address],
                ["프로그램", f.program],
                ["운영 시간", f.performanceTime],
                ["이용 요금", f.fee],
                ["주차", f.parking],
                ["예매처", f.bookingPlace],
                ["문의", f.contact],
              ].map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value || "공식 정보가 아직 없어요"}</dd>
                </div>
              ))}
            </dl>
            {safeUrl(f.homepageUrl) && (
              <a
                className="official-link"
                href={f.homepageUrl!}
                rel="noopener noreferrer"
                target="_blank"
              >
                공식 홈페이지 ↗
              </a>
            )}
            <div className="source">
              {result.demo ? (
                "기능 확인용 가상 콘텐츠입니다."
              ) : (
                <>
                  출처: 한국관광공사 TourAPI · 이미지 저작권 유형:{" "}
                  {f.copyrightCode || "별도 확인 필요"}
                  <br />
                  행사 기간 중에도 휴무나 일정 변경이 있을 수 있어요. 방문 전에
                  공식 안내를 확인해 주세요.
                </>
              )}
            </div>
          </section>
          <aside className="visit-card" aria-label="방문 계획">
            <h2>우리의 다음 데이트</h2>
            <p>{f.eventPlace || f.address || "장소 확인 중"}</p>
            <div className="visit-dates">
              <div>
                <small>시작일</small>
                {f.startDate}
              </div>
              <div>
                <small>종료일</small>
                {f.endDate}
              </div>
            </div>
            {directions ? (
              <a
                className="primary"
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
              >
                카카오맵 길찾기 ↗
              </a>
            ) : (
              <a className="primary" href="#visit-notice">
                방문 안내 확인
              </a>
            )}
            <small id="visit-notice">
              {result.demo
                ? "가상 예시로, 실제 길찾기는 제공하지 않아요."
                : "일정과 이용 요금은 방문 전 공식 안내를 확인해 주세요."}
            </small>
          </aside>
        </div>
      </main>
      <div className="detail-mobile-bar">
        <div>
          <strong>{f.startDate}</strong>
          <small>부터 {f.endDate}까지</small>
        </div>
        {directions ? (
          <a
            className="primary"
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
          >
            길찾기 ↗
          </a>
        ) : (
          <a className="primary" href="#visit-notice">
            방문 안내
          </a>
        )}
      </div>
    </>
  );
}
