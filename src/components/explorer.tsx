"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dateRange,
  distance,
  type FestivalSummary,
  type Region,
} from "@/lib/domain";
import { FestivalMap } from "./map";
import { SaveButton } from "./save-button";
export function Explorer() {
  const [preset, setPreset] = useState("weekend"),
    [region, setRegion] = useState(""),
    [radius, setRadius] = useState(30),
    [position, setPosition] = useState<[number, number] | null>(null),
    [notice, setNotice] = useState(""),
    [locating, setLocating] = useState(false),
    [selected, setSelected] = useState(""),
    [items, setItems] = useState<FestivalSummary[]>([]),
    [regions, setRegions] = useState<Region[]>([]),
    [demo, setDemo] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    fetch("/api/regions")
      .then((r) => r.json())
      .then((r) =>
        setRegions(
          Array.from(
            new Map<string, Region>(
              (r.items || []).map((x: Region) => [x.code, x]),
            ).values(),
          ),
        ),
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setItems([]);
    const range = dateRange(preset);
    (async () => {
      let all: FestivalSummary[] = [];
      let page = 1,
        total = 1;
      while (all.length < total) {
        const res = await fetch(
          "/api/festivals?" +
            new URLSearchParams({
              ...range,
              regionCode: region,
              page: String(page++),
              limit: "100",
            }),
          { signal: controller.signal },
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        total = body.total;
        all = all.concat(body.items);
        if (!body.items.length && all.length < total)
          throw new Error("목록이 변경되었어요. 다시 불러와 주세요.");
        setDemo(body.demo);
      }
      if (!controller.signal.aborted) {
        setItems(all);
        setBusy(false);
      }
    })().catch((e) => {
      if (!controller.signal.aborted) {
        setError(e.message);
        setBusy(false);
      }
    });
    return () => controller.abort();
  }, [preset, region, retry]);
  const nearby = useMemo(
    () =>
      items
        .map((f) => ({
          ...f,
          km:
            position && f.latitude !== null && f.longitude !== null
              ? distance(...position, f.latitude, f.longitude)
              : null,
        }))
        .filter((f) => !position || (f.km !== null && f.km <= radius))
        .sort((a, b) =>
          position
            ? (a.km ?? Infinity) - (b.km ?? Infinity)
            : a.startDate.localeCompare(b.startDate),
        ),
    [items, position, radius],
  );
  const select = useCallback((id: string) => {
    setSelected(id);
    document
      .getElementById("card-" + id)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  function locate() {
    if (!navigator.geolocation) {
      setNotice(
        "이 브라우저에서는 위치를 사용할 수 없어요. 지역을 선택해 주세요.",
      );
      setPosition(null);
      setRegion("");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition([p.coords.latitude, p.coords.longitude]);
        setRegion("");
        setNotice(
          "거리는 직선거리예요. 실제 이동 경로는 길찾기에서 확인해 주세요.",
        );
        setLocating(false);
      },
      () => {
        setPosition(null);
        setRegion("");
        setNotice(
          "위치 확인이 어려워요. 전국 축제를 둘러보거나 지역을 선택해 주세요.",
        );
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          <span>✳</span> 모두의 페스타 <small>DATE MAP</small>
        </Link>
        <nav className="product-nav" aria-label="주요 메뉴">
          <a href="#festivals">축제 둘러보기</a>
          <a href="#festival-map">데이트 지도</a>
        </nav>
        <a href="#festivals" className="nav-link">
          함께 떠날 곳 찾기 ↗
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <span className="intro-label">둘만의 주말 노트</span>
            <h1>이번 주말엔, 여기 어때?</h1>
            <p>우리 가까이에 있는 축제로, 둘이서 조금 새로운 하루.</p>
          </div>
        </section>
        {demo && (
          <div className="demo-banner">
            미리보기 모드 · 아래 축제는 기능 확인을 위한 가상 예시입니다. 실제
            일정이 아니에요.
          </div>
        )}
        <button
          className="mobile-search"
          aria-expanded={searchOpen}
          aria-controls="festival-filters"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <span>
            <strong>
              {regions.find((r) => r.code === region)?.name || "전국 어디든"}
            </strong>
            <small>
              {preset === "today"
                ? "오늘"
                : preset === "month"
                  ? "30일"
                  : "이번 주말"}{" "}
              · 둘이서 가볼 만한 축제
            </small>
          </span>
          <span className="search-orb" aria-hidden="true">
            {searchOpen ? "−" : "+"}
          </span>
        </button>
        <section
          id="festival-filters"
          className={"toolbar " + (searchOpen ? "is-open" : "")}
          aria-label="축제 필터"
        >
          <div className="date-field">
            <span className="field-label">언제 떠날까요?</span>
            <div className="segments">
              {[
                ["today", "오늘"],
                ["weekend", "이번 주말"],
                ["month", "30일"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  aria-pressed={preset === v}
                  className={preset === v ? "active" : ""}
                  onClick={() => setPreset(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="region-field">
            <span className="field-label">어디로 갈까요?</span>
            <select
              aria-label="지역"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setPosition(null);
              }}
            >
              <option value="">전국 어디든</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button className="nearby" disabled={locating} onClick={locate}>
            ⌖ {locating ? "위치 확인 중…" : "내 주변"}
          </button>
          {position && (
            <>
              <select
                aria-label="거리 반경"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                {[10, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}km 이내
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setPosition(null);
                  setNotice("");
                }}
              >
                주변 해제
              </button>
            </>
          )}
        </section>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        <div id="festival-map">
          <FestivalMap items={nearby} selected={selected} onSelect={select} />
        </div>
        <section id="festivals" className="results">
          <div className="results-heading">
            <h2>
              {position ? "우리 가까이, 가볼 만한 곳" : "함께 가면 더 좋은 곳"}{" "}
              <span>{nearby.length}</span>
            </h2>
            <p>
              {dateRange(preset).start} — {dateRange(preset).end} ·{" "}
              {position ? "가까운 순 · 직선거리" : "시작일 순"}
            </p>
          </div>
          {busy ? (
            <div className="empty" role="status">
              주말의 설렘을 찾고 있어요…
            </div>
          ) : error ? (
            <div className="empty" role="alert">
              {error}
              <br />
              <button onClick={() => setRetry((n) => n + 1)}>
                다시 불러오기
              </button>
            </div>
          ) : !nearby.length ? (
            <div className="empty">
              <h3>조금 더 넓게 찾아볼까요?</h3>
              <p>
                선택한 날짜와 지역에 축제가 없어요. 날짜나 반경을 바꿔보세요.
              </p>
            </div>
          ) : (
            <div className="cards">
              {nearby.map((f, i) => (
                <article
                  tabIndex={0}
                  id={"card-" + f.contentId}
                  key={f.contentId}
                  className={
                    "card " + (selected === f.contentId ? "selected" : "")
                  }
                  onClick={() => setSelected(f.contentId)}
                  onFocus={() => setSelected(f.contentId)}
                >
                  <div className={"card-art art-" + (i % 4)}>
                    {f.imageUrl ? (
                      <img src={f.imageUrl} alt={f.title + " 대표 이미지"} />
                    ) : (
                      <>
                        <span className="art-symbol" aria-hidden="true">
                          ✳
                        </span>
                        <small>
                          {demo ? "가상 축제 미리보기" : "이미지 준비 중"}
                        </small>
                      </>
                    )}
                    <span className="card-tag">
                      {demo ? "가상 축제" : "축제 · 행사"}
                    </span>
                    <SaveButton id={f.contentId} />
                  </div>
                  <div className="card-content">
                    <div className="card-meta">
                      {f.address || "장소 확인 중"}
                      {f.km !== null && <span>직선 {f.km.toFixed(1)}km</span>}
                    </div>
                    <Link href={"/festivals/" + f.contentId}>
                      <h3>
                        {f.title} <span>↗</span>
                      </h3>
                    </Link>
                    <p>
                      {f.startDate} — {f.endDate}
                    </p>
                    <button
                      className="map-select"
                      onClick={() => select(f.contentId)}
                    >
                      지도에서 선택 ⌖
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <footer>
        <Link href="/" className="brand">
          ✳ 모두의 페스타
        </Link>
        <p>특별한 계획보다, 함께하는 한 걸음.</p>
        <small>
          {demo
            ? "현재 표시된 콘텐츠는 가상 예시입니다."
            : "데이터 출처: 한국관광공사 TourAPI · 방문 전 공식 일정을 확인해 주세요."}
        </small>
      </footer>
    </>
  );
}
