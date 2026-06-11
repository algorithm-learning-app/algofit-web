# 알고핏 PC 웹 (React + Vite)

**PC 웹 프로토타입·레퍼런스 UI**입니다. 긴 Blank, 코딩, PC 보너스 등 데스크톱 경험을 검증합니다.

모바일 앱은 [algofit-mobile](https://github.com/algorithm-learning-app/algofit-mobile) 저장소입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저: http://localhost:5174 — `/home`으로 리다이렉트됩니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (포트 5174) |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |

게스트 진행: `localStorage` (`algofit:guestProgress`, `algofit:guestId`).

## 서버 동기화 위협 모델

서버 sync 는 `VITE_SYNC_*` 주입 시에만 켜집니다. 수용된 위협 모델은 다음과 같습니다.

- `VITE_SYNC_SECRET` 은 빌드 번들에 평문으로 임베드됩니다.
- 동기화 토큰은 `HMAC(SYNC_SECRET, guestId)` 이며 **만료가 없습니다**.
- 따라서 시크릿 + 임의의 `guestId` 를 아는 사람은 해당 게스트의 (비민감) 진행을 읽거나 덮어쓸 수 있습니다.
- 노출 대응: 서버의 `SYNC_SECRET` 을 로테이션하면 모든 클라이언트 토큰이 무효화됩니다(웹 재배포 필요).

게스트 진행은 비민감 데이터이므로 이 범위는 의도된 수용 위험입니다.

## MVP 상태 (2026-05-19)

**Must 완료** — Daily·`/continue`·`/profile`·PC 보너스·pick/blank 50·30 ([docs/05-mvp-scope.md](../../docs/05-mvp-scope.md))

검증: `./scripts/pr-review-check.sh` (`npm run build`)

## PR 리뷰 (로컬 봇)

변경은 보통 `main`에 직접 푸시합니다. PR을 열었을 때:

```bash
export PR_REVIEW_BASE=main
export PR_REVIEW_CHECK_COMMAND="$(git rev-parse --show-toplevel)/scripts/pr-review-check.sh"
python3 ~/.codex/skills/gh-review-pr/scripts/review_pr.py --pr-url <NUMBER>
```

검증만: `./scripts/pr-review-check.sh` (`npm run build`). 상세: [algofit-docs · 20-pr-review-setup](https://github.com/algorithm-learning-app/algofit-docs/blob/main/docs/20-pr-review-setup.md).
