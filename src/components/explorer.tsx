"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dateRange,
  today,
  type FestivalSummary,
  type Region,
} from "@/lib/domain";
import {
  discover,
  isLongRunning,
  validRange,
  type SortOrder,
  type DurationFilter,
} from "@/lib/discovery";
import { FestivalMap } from "./map";
import { SaveButton } from "./save-button";
import { nearbyFestivals, requestPosition } from "@/lib/nearby";
export function Explorer() {
  const [preset, setPreset] = useState("weekend"),
    [region, setRegion] = useState(""),
    [radius, setRadius] = useState(30),
    [position, setPosition] = useState<[number, number] | null>(null),
    [notice, setNotice] = useState(""),
    [locating, setLocating] = useState(false),
    [selected, setSelected] = useState(""),
    [hovered, setHovered] = useState(""),
    [sheetExpanded, setSheetExpanded] = useState(false),
    [items, setItems] = useState<FestivalSummary[]>([]),
    [regions, setRegions] = useState<Region[]>([]),
    [demo, setDemo] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [searchOpen, setSearchOpen] = useState(false);
  const [district, setDistrict] = useState("");
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState<DurationFilter>("all");
  const [sort, setSort] = useState<SortOrder>("ending");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [regionError, setRegionError] = useState(false);
  const resultsScroll = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const range =
    preset === "custom"
      ? { start: customStart, end: customEnd }
      : dateRange(preset);
  const rangeOK = validRange(range.start, range.end);
  const provinces = Array.from(
    new Map(regions.map((r) => [r.code, r])).values(),
  );
  const districts = regions.filter(
    (r) => r.code === region && r.districtCode && r.districtName,
  );
  useEffect(() => {
    fetch("/api/regions")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((r) =>
        setRegions(
          (r.items || []).map(
            (
              x: Region & { district_code?: string; district_name?: string },
            ) => ({
              ...x,
              districtCode: x.districtCode ?? x.district_code,
              districtName: x.districtName ?? x.district_name,
            }),
          ),
        ),
      )
      .catch(() => setRegionError(true));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setItems([]);
    if (!rangeOK) {
      setBusy(false);
      return () => controller.abort();
    }
    (async () => {
      let all: FestivalSummary[] = [];
      let page = 1,
        total = 1;
      while (all.length < total) {
        const res = await fetch(
          "/api/festivals?" +
            new URLSearchParams({
              start: range.start,
              end: range.end,
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
  }, [range.start, range.end, rangeOK, region, retry]);
  const nearby = useMemo(
    () =>
      discover(nearbyFestivals(items, position, radius), {
        query,
        district,
        duration,
        sort,
        date: today(),
      }),
    [items, position, radius, query, district, duration, sort],
  );
  const select = useCallback((id: string) => {
    setSelected(id);
    setSheetExpanded(true);
    requestAnimationFrame(() => {
      const card = document.getElementById("card-" + id);
      const scroller = resultsScroll.current;
      if (!card) return;
      if (window.matchMedia("(max-width: 743px)").matches && scroller) {
        scroller.scrollTo({
          top:
            scroller.scrollTop +
            card.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top -
            16,
          behavior: "smooth",
        });
      } else {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, []);
  async function locate() {
    setLocating(true);
    setNotice("위치를 확인하고 있어요. 브라우저의 권한 요청을 확인해 주세요.");
    try {
      setPosition(await requestPosition(navigator.geolocation));
      setRadius(10);
      setRegion("");
      setDistrict("");
      setSort("distance");
      setNotice(
        "내 주변 축제를 직선거리로 비교해요. 실제 이동 경로와 다르며 위치는 서버에 저장하지 않아요.",
      );
    } catch (error) {
      setPosition(null);
      setRegion("");
      setDistrict("");
      setSort((current) => (current === "distance" ? "ending" : current));
      setNotice(
        error instanceof Error
          ? error.message
          : "위치를 확인하지 못했어요. 지역을 선택해 주세요.",
      );
    } finally {
      setLocating(false);
    }
  }
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          <span>✳</span> 모두의 페스타 <small>FESTIVAL MAP</small>
        </Link>
        <nav className="product-nav" aria-label="주요 메뉴">
          <a href="#festivals">축제 둘러보기</a>
          <a href="#festival-map">축제 지도</a>
        </nav>
        <Link href="/saved" className="nav-link">
          저장한 축제 ♡
        </Link>
      </header>
      <main>
        <section className="intro">
          <div>
            <span className="intro-label">함께 떠나는 주말</span>
            <h1>이번 주말엔, 여기 어때?</h1>
            <p>연인과 가족, 좋아하는 사람들과 축제에서 새로운 하루.</p>
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
                  : preset === "custom"
                    ? "날짜 직접 선택"
                    : "이번 주말"}{" "}
              · 함께 가볼 만한 축제
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
                ["custom", "직접 선택"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  aria-pressed={preset === v}
                  className={preset === v ? "active" : ""}
                  onClick={() => {
                    if (v === "custom" && !customStart) {
                      setCustomStart(range.start);
                      setCustomEnd(range.end);
                    }
                    setPreset(v);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <form
                className="custom-dates"
                key={`${customStart}/${customEnd}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  setCustomStart(String(data.get("start") || ""));
                  setCustomEnd(String(data.get("end") || ""));
                }}
              >
                <label>
                  <span className="field-label">시작 날짜</span>
                  <input
                    type="date"
                    name="start"
                    defaultValue={customStart}
                    required
                  />
                </label>
                <label>
                  <span className="field-label">종료 날짜</span>
                  <input
                    type="date"
                    name="end"
                    defaultValue={customEnd}
                    required
                  />
                </label>
                <button type="submit">날짜 적용</button>
              </form>
            )}
          </div>
          <label className="region-field">
            <span className="field-label">어디로 갈까요?</span>
            <select
              aria-label="지역"
              disabled={locating}
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setDistrict("");
                setPosition(null);
                if (sort === "distance") setSort("ending");
                setNotice("");
              }}
            >
              <option value="">전국 어디든</option>
              {provinces.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {districts.length > 0 && (
            <label className="region-field">
              <span className="field-label">시·군·구</span>
              <select
                aria-label="시·군·구"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                <option value="">전체</option>
                {districts.map((r) => (
                  <option key={r.districtCode} value={r.districtCode}>
                    {r.districtName}
                  </option>
                ))}
              </select>
            </label>
          )}
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
                {[5, 10, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}km 이내
                  </option>
                ))}
              </select>
              <button
                disabled={locating}
                onClick={() => {
                  setPosition(null);
                  if (sort === "distance") setSort("ending");
                  setNotice("");
                }}
              >
                주변 해제
              </button>
            </>
          )}
        </section>
        {!rangeOK && (
          <p role="alert">
            시작일과 종료일을 확인해 주세요. 조회 기간은 최대 366일이에요.
          </p>
        )}
        {regionError && (
          <p role="status">
            지역 목록을 불러오지 못했어요. 전국 검색을 이용하거나 페이지를
            새로고침해 주세요.
          </p>
        )}
        <section className="discovery-controls" aria-label="검색과 정렬">
          <label className="keyword-field">
            <span className="field-label">어떤 축제를 찾으세요?</span>
            <input
              type="search"
              placeholder="축제명 또는 장소 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span className="field-label">행사 전체 기간</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as DurationFilter)}
            >
              <option value="all">기간 길이 전체</option>
              <option value="short">30일 이하 행사</option>
              <option value="long">31일 이상 행사</option>
            </select>
          </label>
          <label>
            <span className="field-label">정렬</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
            >
              <option value="ending">종료일 가까운 순</option>
              <option value="starting">개최 예정 먼저</option>
              <option value="distance" disabled={!position}>
                가까운 순 · 내 주변 사용
              </option>
            </select>
          </label>
        </section>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        <div
          className={"explore-stage " + (sheetExpanded ? "sheet-expanded" : "")}
        >
          <div id="festival-map">
            <FestivalMap
              items={nearby}
              selected={selected}
              hovered={hovered}
              position={position}
              radius={radius}
              onSelect={select}
              onHover={setHovered}
            />
          </div>
          <section id="festivals" className="results">
            <button
              className="sheet-handle"
              type="button"
              aria-expanded={sheetExpanded}
              aria-controls="festival-results-scroll"
              onTouchStart={(event) => {
                touchStart.current = event.touches[0].clientY;
              }}
              onTouchEnd={(event) => {
                if (touchStart.current === null) return;
                const delta =
                  event.changedTouches[0].clientY - touchStart.current;
                touchStart.current = null;
                if (Math.abs(delta) < 45) return;
                swiped.current = true;
                setSheetExpanded(delta < 0);
              }}
              onClick={() => {
                if (swiped.current) {
                  swiped.current = false;
                  return;
                }
                setSheetExpanded((expanded) => !expanded);
              }}
            >
              <span aria-hidden="true" />
              {sheetExpanded ? "지도 크게 보기" : "축제 목록 펼치기"}
            </button>
            <div
              className="results-scroll"
              id="festival-results-scroll"
              ref={resultsScroll}
            >
              <div className="results-heading">
                <h2>
                  {position
                    ? "우리 가까이, 가볼 만한 곳"
                    : "함께 가면 더 좋은 곳"}{" "}
                  <span>{nearby.length}</span>
                </h2>
                <p>
                  {range.start} — {range.end} ·{" "}
                  {sort === "distance"
                    ? "가까운 순 · 직선거리"
                    : sort === "starting"
                      ? "개최 예정 먼저"
                      : "종료일 가까운 순"}
                </p>
              </div>
              {busy ? (
                <div
                  className="loading-results"
                  role="status"
                  aria-label="함께 가볼 축제를 찾고 있어요"
                >
                  <p>함께 가볼 축제를 찾고 있어요…</p>
                  <div className="skeleton-grid" aria-hidden="true">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div className="skeleton-card" key={index}>
                        <div className="skeleton-image" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line short" />
                      </div>
                    ))}
                  </div>
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
                  <span className="empty-symbol" aria-hidden="true">
                    ✳
                  </span>
                  <h3>앗! 조건에 맞는 축제가 없어요</h3>
                  <p>
                    {position
                      ? "가까운 축제가 보이지 않아요. 반경을 넓히거나 날짜를 바꿔보세요."
                      : "선택한 날짜와 지역에 진행 중인 축제가 없어요. 다른 조건을 골라보세요."}
                  </p>
                  {position ? (
                    <button onClick={() => setRadius(50)}>50km로 넓히기</button>
                  ) : (
                    <button onClick={() => setPreset("month")}>
                      30일간 둘러보기
                    </button>
                  )}
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
                      onMouseEnter={() => setHovered(f.contentId)}
                      onMouseLeave={() => setHovered("")}
                    >
                      <div className={"card-art art-" + (i % 4)}>
                        {f.imageUrl ? (
                          <img
                            src={f.imageUrl}
                            alt={f.title + " 대표 이미지"}
                            loading="lazy"
                          />
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
                          {demo
                            ? "가상 축제"
                            : isLongRunning(f)
                              ? "31일 이상 행사"
                              : "30일 이하 행사"}
                        </span>
                        <SaveButton id={f.contentId} />
                      </div>
                      <div className="card-content">
                        <div className="card-meta">
                          {f.address || "장소 확인 중"}
                          {f.km !== null && (
                            <span>직선 {f.km.toFixed(1)}km</span>
                          )}
                        </div>
                        <Link href={"/festivals/" + f.contentId}>
                          <h3>
                            {f.title} <span>↗</span>
                          </h3>
                        </Link>
                        <p>
                          전체 기간 · {f.startDate} — {f.endDate}
                        </p>
                        <p className="schedule-note">
                          매일 열리는 행사는 아닐 수 있어요.{" "}
                          <Link href={"/festivals/" + f.contentId}>
                            운영 요일·시간 확인 ↗
                          </Link>
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
            </div>
          </section>
        </div>
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
