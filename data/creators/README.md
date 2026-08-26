# data/creators

방송인 **화이트리스트**.

- `whitelist.json` — 이름, 수집 여부(`ingestEnabled`), 기본 응원 팀
- `channels.json` — 프로토타입 수집용 플랫폼·채널 ID. 한 번 저장하고 재사용한다.

Phase 1 UI 목업: 울프, 김민교, 운타라, Caedrel. 김민교·운타라는 `ingestEnabled: false`.

수집 프로토타입 (`ingestEnabled: true`, LEC):

- 치지직: 와디드, 울프, 강퀴 (울프·강퀴는 거의 중계하지 않음)
- 숲: 롱다리코치, 훈수킹, 아뚱 (아뚱은 거의 중계하지 않음)
- Twitch: Caedrel, Jankos, YamatoCannon, Kameto, Ibai, Obsess

팀 코스트리머 기본 응원: 와디드·Jankos → G2, Kameto → KC, Ibai → KOI, Obsess → FNC, YamatoCannon → SK.
Caedrel은 Los Ratones가 있어도 LEC 풀 슬레이트라 기본 응원 팀을 비운다.

수집 파이프라인은 아직 이 목록을 크롤하지 않습니다. 홈에 올리는 `LiveCast`와 후보 `LiveCandidate`는 분리되어 있습니다.
