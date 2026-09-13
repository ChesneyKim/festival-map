"use client";
import { useEffect, useState } from "react";
const KEY = "date-map-favorites";
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
export function ShareButton() {
  const [message, setMessage] = useState("링크 공유 ↗");
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          setMessage("링크를 복사했어요");
        } catch {
          setMessage("주소창의 링크를 복사해 주세요");
        }
      }}
    >
      {message}
    </button>
  );
}
