import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "모두의 페스타 — 이번 주말엔 여기 어때?",
  description:
    "함께 가면 더 좋은 전국 축제와 행사. 우리 가까이에서 새로운 주말을 만나보세요.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
