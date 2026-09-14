"use client";
import { useEffect, useRef, useState } from "react";
import type { FestivalSummary } from "@/lib/domain";
type LatLng = object;
type MapInstance = {
  setBounds: (b: object) => void;
  setCenter: (p: LatLng) => void;
  relayout: () => void;
};
type MarkerInstance = {
  setMap: (m: MapInstance | null) => void;
  setImage: (image: object) => void;
};
type Maps = {
  load: (cb: () => void) => void;
  Map: new (el: HTMLElement, options: object) => MapInstance;
  LatLng: new (a: number, b: number) => LatLng;
  LatLngBounds: new () => { extend: (p: LatLng) => void };
  Size: new (width: number, height: number) => object;
  MarkerImage: new (src: string, size: object) => object;
  Marker: new (o: object) => MarkerInstance;
  Circle: new (o: object) => { setMap: (m: MapInstance | null) => void };
  event: {
    addListener: (target: object, name: string, cb: () => void) => void;
  };
};
function pinImage(maps: Maps, active: boolean) {
  const color = active ? "#30271f" : "#ff7629";
  const width = active ? 40 : 32;
  const height = active ? 52 : 42;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52"><path d="M20 2C10 2 3 9 3 19c0 14 17 31 17 31s17-17 17-31C37 9 30 2 20 2Z" fill="${color}" stroke="white" stroke-width="3"/><circle cx="20" cy="19" r="6" fill="white"/></svg>`;
  return new maps.MarkerImage(
    `data:image/svg+xml,${encodeURIComponent(svg)}`,
    new maps.Size(width, height),
  );
}
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
  hovered,
  position,
  radius,
  onSelect,
  onHover,
}: {
  items: FestivalSummary[];
  selected: string;
  hovered: string;
  position: [number, number] | null;
  radius: number;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    instance = useRef<MapInstance | null>(null),
    markersRef = useRef(new Map<string, MarkerInstance>());
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  useEffect(() => {
    if (!key) return;
    setError("");
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
      .catch(() => {
        if (active)
          setError(
            "지도를 불러오지 못했어요. 아래 목록에서 축제를 살펴보세요.",
          );
      });
    return () => {
      active = false;
    };
  }, [key, retry]);
  useEffect(() => {
    if (!ready || !instance.current || !window.kakao) return;
    const m = window.kakao.maps,
      bounds = new m.LatLngBounds();
    const regularPin = pinImage(m, false);
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
          image: regularPin,
        });
        m.event.addListener(marker, "click", () => onSelect(f.contentId));
        m.event.addListener(marker, "mouseover", () => onHover(f.contentId));
        m.event.addListener(marker, "mouseout", () => onHover(""));
        markersRef.current.set(f.contentId, marker);
        return marker;
      });
    if (markers.length) instance.current.setBounds(bounds);
    const resize = new ResizeObserver(() => instance.current?.relayout());
    if (ref.current) resize.observe(ref.current);
    return () => {
      markers.forEach((m) => m.setMap(null));
      markersRef.current.clear();
      resize.disconnect();
    };
  }, [ready, items, onSelect, onHover]);
  useEffect(() => {
    if (!ready || !window.kakao) return;
    const m = window.kakao.maps;
    const regular = pinImage(m, false);
    const active = pinImage(m, true);
    markersRef.current.forEach((marker, id) =>
      marker.setImage(id === hovered || id === selected ? active : regular),
    );
  }, [ready, items, hovered, selected]);
  useEffect(() => {
    if (!ready || !position || !window.kakao || !instance.current) return;
    const m = window.kakao.maps;
    const center = new m.LatLng(...position);
    const bounds = new m.LatLngBounds();
    const latitudeSpan = (radius * 1.2) / 111;
    const longitudeSpan =
      (radius * 1.2) / (111 * Math.cos((position[0] * Math.PI) / 180));
    bounds.extend(
      new m.LatLng(position[0] - latitudeSpan, position[1] - longitudeSpan),
    );
    bounds.extend(
      new m.LatLng(position[0] + latitudeSpan, position[1] + longitudeSpan),
    );
    instance.current.setBounds(bounds);
    const circle = new m.Circle({
      map: instance.current,
      center,
      radius: radius * 1000,
      strokeWeight: 2,
      strokeColor: "#ff7629",
      strokeOpacity: 0.7,
      fillColor: "#ff7629",
      fillOpacity: 0.08,
    });
    return () => circle.setMap(null);
  }, [ready, position, radius]);
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
            {error && (
              <button onClick={() => setRetry((n) => n + 1)}>
                지도 다시 연결
              </button>
            )}
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
