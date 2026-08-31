# apps/ops

수동 보정 화면은 지금 루트 Next 앱의 `/ops`입니다. `OPS_PASSWORD`가 있으면 쿠키 로그인, 비어 있으면 로컬처럼 열어 둡니다.

- 자동 매칭 결과 확인
- 오매칭 연결 해제 (`DELETE /api/ops/reactions/:id`)
- 빠진 YouTube·치지직·숲 주소 연결 (`POST /api/ops/reactions`)

공개 사이트와 같은 TypeScript 프로세스입니다. `apps/ops`로 분리하거나 `services/api`를 빼는 것은 클라이언트가 둘일 때입니다.
