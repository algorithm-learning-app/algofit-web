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

## PR 리뷰 (로컬 봇)

변경은 보통 `main`에 직접 푸시합니다. PR을 열었을 때:

```bash
export PR_REVIEW_BASE=main
export PR_REVIEW_CHECK_COMMAND="$(git rev-parse --show-toplevel)/scripts/pr-review-check.sh"
python3 ~/.codex/skills/gh-review-pr/scripts/review_pr.py --pr-url <NUMBER>
```

검증만: `./scripts/pr-review-check.sh` (`npm run build`). 상세: [algofit-docs · 20-pr-review-setup](https://github.com/algorithm-learning-app/algofit-docs/blob/main/docs/20-pr-review-setup.md).
