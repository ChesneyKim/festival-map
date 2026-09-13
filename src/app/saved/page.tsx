import Link from "next/link";
import { SavedFestivals } from "@/components/saved-festivals";
export const metadata = { title: "저장한 축제 — 모두의 페스타" };
export default function SavedPage() {
  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/">
          ✳ 모두의 페스타
        </Link>
        <Link href="/">← 축제 둘러보기</Link>
      </header>
      <main>
        <section className="intro">
          <div>
            <span className="intro-label">함께 가고 싶은 곳</span>
            <h1>저장한 축제</h1>
            <p>
              날짜와 지역에 관계없이 모아봐요. 이 브라우저에만 저장되며,
              저장공간을 지우면 사라져요.
            </p>
          </div>
        </section>
        <SavedFestivals />
      </main>
    </>
  );
}
