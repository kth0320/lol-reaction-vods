# packages/shared

공유 도메인 설명 placeholder. 코드 없음.

이후 페이즈에서 공유할 개념:

- **Match** — 대회 경기 1개 (일정, 팀, 시간창)
- **Creator** — 화이트리스트 방송인 (스트리머 · BJ · 유튜버 · 버튜버)
- **ReactionVod** — 그 경기에 대한 다시보기 1개
- **Platform** — `youtube` | `soop` | `chzzk` (`twitch`는 후순위)
- **Playback** — 사이트 안 재생 없음. 유튜브·숲·치지직 원본 영상 링크. 유튜브가 없으면 치지직 다시보기, 있으면 유튜브 영상만. Twitch 원본 VOD는 모으지 않음

지금은 `lib/dto.ts`와 `lib/playback.ts`에 있습니다. 패키지로 빼는 것은 API 서버를 분리할 때입니다.
