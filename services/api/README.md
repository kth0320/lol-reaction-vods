# services/api

조회 API는 지금 루트 Next 앱의 `/api/ops/*`입니다. 언어는 TypeScript, 응답은 `lib/dto.ts`.

- `GET /api/ops/matches` — 끝난 경기 목록 (허브·팀 검색)
- `GET /api/ops/matches/:id` — 한 경기 + 리액션
- `GET /api/ops/creators` — 화이트리스트 방송인
- `POST /api/ops/reactions` — 주소로 리액션 연결
- `DELETE /api/ops/reactions/:id` — 연결 해제

별도 프로세스 서버는 아직 없습니다. 공개 사이트와 보정이 다른 앱이 되면 이 폴더로 옮깁니다.
