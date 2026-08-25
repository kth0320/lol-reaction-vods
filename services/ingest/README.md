# services/ingest

리액션 VOD 수집 파이프라인 placeholder.

수집 순서 (이후 페이즈):

1. `data/creators` 화이트리스트의 방송인만
2. 경기 시작~종료 전후 **시간창**으로 후보 VOD 축소
3. 제목에서 `data/team-aliases` 팀 별칭 매칭
4. `data/corrections` 수동 보정 적용

플랫폼: 치지직 · 숲(SOOP) · YouTube.

Phase 0에서는 이 README만 둔다. 크롤러, 워커, 매칭 로직, 외부 API 클라이언트를 추가하지 않는다.
