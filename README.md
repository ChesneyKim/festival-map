# 모두의 페스타 — 전국 축제 데이트 맵

Next.js App Router + TypeScript / Supabase / Kakao Maps / Vercel.

## 로컬 실행

Node 22 이상에서 `npm install`, `npm run dev`를 실행하고 http://127.0.0.1:3000 을 엽니다.
설정이 없는 개발 환경에서는 가상 축제 여섯 개로 동작합니다. 실제 축제 일정이 아닙니다.
`.env.example`을 참고해 `.env.local`을 준비하세요. 운영에서 데모를 사용하려면 명시적으로 `DATA_MODE=demo`가 필요합니다.

`npm test`, `npm run typecheck`, `npm run build`로 검증합니다.
개인 찜은 이 브라우저의 localStorage에만 저장합니다. 위치는 거리 계산 후 서버로 전송하거나 저장하지 않습니다. Kakao 지도를 사용하면 지도 SDK 자체가 지도 표시를 위한 요청을 보냅니다.

## 실제 데이터 연결

1. 공공데이터포털에서 한국관광공사 국문 관광정보 API 활용 신청 후 Decoding 서비스키를 `TOUR_API_SERVICE_KEY`에 입력합니다. 요청 시 URLSearchParams가 한 번 인코딩합니다.
2. Supabase 프로젝트를 지정해 MCP를 연결하고 `supabase/schema.sql`을 적용합니다. private 스키마는 Data API에 노출하지 않습니다. MCP가 없다면 지정한 프로젝트 SQL Editor에서 동일 SQL을 실행할 수 있습니다.
3. `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVER_SECRET_KEY`를 설정합니다. 마지막 키는 서버 전용입니다. 상세 지연 갱신도 DB 쓰기가 필요하므로 서버 비밀키를 사용합니다.
4. 무작위 `CRON_SECRET`을 등록합니다. `DATA_MODE=live`로 전환합니다. 인증 헤더 `Authorization: Bearer <CRON_SECRET>`를 사용해 `/api/cron/sync-festivals`를 한 번 호출합니다. 데모 데이터는 운영 DB에 넣지 않습니다.
5. Kakao Developers에서 지도 API를 활성화하고 JavaScript 키를 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`에 입력합니다. 실제 사용 도메인(127.0.0.1 또는 localhost 포함)을 SDK 허용 목록에 등록하세요. Preview는 고정 도메인을 사용해 등록합니다. 무료 사용 자격과 쿼터는 계정에서 확인하세요.
6. Vercel 프로젝트에 환경변수를 등록한 후 배포합니다. 한국시간 오전 3시(UTC 18시) Cron을 설정했습니다. 요금제에 따라 실행 시각 오차가 있을 수 있습니다. Preview에는 운영 DB 쓰기 키를 넣지 마세요.

## 데이터 동기화와 제한

- 공개 축제 목록과 날짜 조회를 결합해 이미 시작된 장기 축제도 수집합니다. 과거 시작일 조회는 실제 키로 최초 연결 시 검증해야 합니다.
- 페이지·시간 예산을 넘으면 전체 커밋을 취소하고 기존 데이터를 보존합니다. 초회 수집량이 크면 운영계정 쿼터를 확인하세요.
- 한국시간 날짜별 800회 공통 호출 상한을 DB에서 원자적으로 예약합니다. 상세 조회와 Cron을 합산하며, 다른 앱에서 같은 TourAPI 키를 사용한 횟수는 포함하지 못합니다.
- 상세 데이터는 24시간 캐시하며 실패 시 기존 내용을 보여줍니다. API 오류의 원문이나 서비스키를 응답/로그에 남기지 않습니다.
- 빈 필드의 의미는 '미확인'입니다. 축제 소개 API는 주차 전용 필드를 제공하지 않아 주차는 미확인으로 표시합니다. 이동시간 대신 직선 km만 제공합니다.
- 공공 이미지 원본을 contain으로 표시하며 크롭·필터·변형하지 않습니다. 실제 콘텐츠는 한국관광공사 출처와 저작권 유형을 표시합니다.
- 날짜·거리 필터는 모든 목록 페이지를 받은 후 처리하므로 가까운 축제가 첫 페이지 밖에 있어도 누락되지 않습니다.
- 운영 확인: `private.sync_runs`의 마지막 success, 실패 상태 및 처리 건수를 점검합니다. 실패가 반복되면 Vercel 함수 로그와 API 사용량을 확인합니다.

## 아직 필요한 외부 검증

이 저장소만으로 API 키를 발급하거나 연결하지 않은 원격 프로젝트에 배포할 수는 없습니다. 실제 서비스 출시 전 TourAPI 응답/쿼터, Supabase RLS advisors, Kakao 지도 핀·길찾기, Vercel Cron 실행을 확인해야 합니다.

공식 문서: [TourAPI](https://api.visitkorea.or.kr/#/useKoreaGuide), [Kakao Maps](https://apis.map.kakao.com/web/guide/), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel Cron](https://vercel.com/docs/cron-jobs).
