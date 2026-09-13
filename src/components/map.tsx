"use client";
import { useEffect, useRef, useState } from "react";
import type { FestivalSummary } from "@/lib/domain";
type LatLng = object;
type MapInstance = {
  setBounds: (b: object) => void;
  setCenter: (p: LatLng) => void;
  relayout: () => void;
};
type MarkerInstance = { setMap: (m: MapInstance | null) => void };
type Maps = {
  load: (cb: () => void) => void;
  Map: new (el: HTMLElement, options: object) => MapInstance;
  LatLng: new (a: number, b: number) => LatLng;
  LatLngBounds: new () => { extend: (p: LatLng) => void };
  Marker: new (o: object) => MarkerInstance;
  event: {
    addListener: (target: object, name: string, cb: () => void) => void;
  };
};
declare global {
  interface Window {
    kakao?: { maps: Maps };
  }
}
let loading: Promise<Maps> | undefined;
function loadMaps(key: string) {
  return (loading ??= new Promise<Maps>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timeout);
      loading = undefined;
      script.remove();
      reject(new Error("지도 연결 실패"));
    };
    const timeout = setTimeout(fail, 15000);
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.onload = () => {
      if (!window.kakao?.maps) return fail();
      window.kakao.maps.load(() => {
        clearTimeout(timeout);
        resolve(window.kakao!.maps);
      });
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }));
}
export function FestivalMap({
  items,
  selected,
  onSelect,
}: {
  items: FestivalSummary[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    instance = useRef<MapInstance | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  useEffect(() => {
    if (!key) return;
    let active = true;
    loadMaps(key)
      .then((m) => {
        if (active && ref.current) {
          instance.current = new m.Map(ref.current, {
            center: new m.LatLng(36.1, 127.8),
            level: 13,
          });
          setReady(true);
        }
      })
      .catch(() =>
        setError("지도를 불러오지 못했어요. 아래 목록에서 축제를 살펴보세요."),
      );
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (!ready || !instance.current || !window.kakao) return;
    const m = window.kakao.maps,
      bounds = new m.LatLngBounds();
    const markers = items
      .filter((f) => f.latitude !== null && f.longitude !== null)
      .map((f) => {
        const pos = new m.LatLng(f.latitude!, f.longitude!);
        bounds.extend(pos);
        const marker = new m.Marker({
          map: instance.current,
          position: pos,
          title: f.title,
          clickable: true,
        });
        m.event.addListener(marker, "click", () => onSelect(f.contentId));
        return marker;
      });
    if (markers.length) instance.current.setBounds(bounds);
    const resize = new ResizeObserver(() => instance.current?.relayout());
    if (ref.current) resize.observe(ref.current);
    return () => {
      markers.forEach((m) => m.setMap(null));
      resize.disconnect();
    };
  }, [ready, items, onSelect]);
  useEffect(() => {
    const f = items.find((f) => f.contentId === selected);
    if (ready && f?.latitude != null && f.longitude != null && window.kakao)
      instance.current?.setCenter(
        new window.kakao.maps.LatLng(f.latitude, f.longitude),
      );
  }, [selected, ready, items]);
  return (
    <section className="map" aria-label="축제 지도">
      <div className="map-canvas" ref={ref} />
      {(!key || error) && (
        <div className="map-placeholder">
          <div className="map-grid" />
          <span className="place-label p1">서울</span>
          <span className="place-label p2">부산</span>
          <span className="place-label p3">창원</span>
          <div className="map-message">
            <span className="map-icon">◎</span>
            <strong>
              {error ? "잠시 지도를 쉬어갈게요" : "함께 갈 곳을 발견하는 지도"}
            </strong>
            <p>
              {error ||
                "지도 연결을 준비하고 있어요. 아래 목록은 바로 둘러볼 수 있어요."}
            </p>
            <small>현재 배경은 실제 지도가 아닌 미리보기입니다.</small>
          </div>
        </div>
      )}
      <div className="map-chip">
        <span />{" "}
        {items.find((f) => f.contentId === selected)?.title ||
          "이번 주말, 새로운 장면을 만나보세요"}
      </div>
    </section>
  );
}
