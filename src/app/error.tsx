"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>잠시 연결이 어려워요.</h1>
      <p>조금 뒤에 다시 찾아주세요.</p>
      <button onClick={reset}>다시 시도</button>
      <a href="/">지도로 돌아가기</a>
    </main>
  );
}
