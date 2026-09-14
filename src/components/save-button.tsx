"use client";
import { useEffect, useState } from "react";
const KEY = "date-map-favorites";
type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: { sendDefault: (template: object) => void };
};
declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}
let kakaoSdk: Promise<KakaoSdk> | undefined;
function loadKakaoSdk(key: string) {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  return (kakaoSdk ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
    script.integrity =
      "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy";
    script.crossOrigin = "anonymous";
    script.onload = () => (window.Kakao ? resolve(window.Kakao) : reject());
    script.onerror = () => {
      kakaoSdk = undefined;
      reject();
    };
    document.head.appendChild(script);
  })).then((sdk) => {
    if (!sdk.isInitialized()) sdk.init(key);
    return sdk;
  });
}
export function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
export function SaveButton({ id }: { id: string }) {
  const [saved, setSaved] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    const update = () => setSaved(readSaved().includes(id));
    update();
    window.addEventListener("storage", update);
    window.addEventListener("saved-change", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("saved-change", update);
    };
  }, [id]);
  return (
    <button
      className={"save " + (saved ? "is-saved" : "")}
      aria-label={
        error
          ? "저장할 수 없는 브라우저입니다"
          : saved
            ? "찜 해제"
            : "축제 찜하기"
      }
      title={
        error
          ? "브라우저 저장공간을 사용할 수 없어요."
          : saved
            ? "이 브라우저에 찜했어요"
            : "이 브라우저에 찜하기"
      }
      aria-pressed={saved}
      onClick={(e) => {
        e.stopPropagation();
        try {
          const current = readSaved();
          localStorage.setItem(
            KEY,
            JSON.stringify(
              current.includes(id)
                ? current.filter((x) => x !== id)
                : [...current, id],
            ),
          );
          setError(false);
          window.dispatchEvent(new Event("saved-change"));
        } catch {
          setError(true);
        }
      }}
    >
      {error ? "!" : saved ? "♥" : "♡"}
    </button>
  );
}
export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState("링크 공유 ↗");
  return (
    <button
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({
              title,
              text: `이번 주말 ${title}, 함께 가볼까요?`,
              url: location.href,
            });
            setMessage("공유했어요");
          } else {
            await navigator.clipboard.writeText(location.href);
            setMessage("링크를 복사했어요");
          }
        } catch {
          setMessage("다시 공유해 주세요");
        }
      }}
    >
      {message}
    </button>
  );
}
export function KakaoShareButton({
  title,
  startDate,
  endDate,
}: {
  title: string;
  startDate: string;
  endDate: string;
}) {
  const [message, setMessage] = useState("카카오톡 준비 중…");
  const [ready, setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  useEffect(() => {
    if (!key) return;
    loadKakaoSdk(key)
      .then(() => {
        setReady(true);
        setMessage("카카오톡으로 보내기");
      })
      .catch(() => setMessage("카카오톡 공유를 준비하지 못했어요"));
  }, [key]);
  if (!key) return null;
  return (
    <button
      className="kakao-share"
      disabled={!ready}
      onClick={() => {
        try {
          const link = { mobileWebUrl: location.href, webUrl: location.href };
          const description = `${startDate} — ${endDate} · 출처: 한국관광공사 TourAPI`;
          window.Kakao?.Share.sendDefault({
            objectType: "feed",
            content: {
              title: `이번 주말 ${title}, 함께 가볼까요?`,
              description,
              link,
            },
            buttons: [{ title: "축제 자세히 보기", link }],
          });
        } catch {
          setMessage("카카오톡 공유를 열지 못했어요");
        }
      }}
    >
      {message}
    </button>
  );
}
