import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty">
      <h1>축제를 찾을 수 없어요.</h1>
      <Link href="/">다른 축제 둘러보기 →</Link>
    </main>
  );
}
