# 후쿠오카 · 유후인 2박 3일 여행 가이드

노션의 **`GPT_일본여행계획`** 및 **`일본 여행 계획`**을 공개용 웹사이트로 정리하는 모바일 대응 여행 가이드입니다. 원본 여행 내용 중 공개 가능한 일정·관광·맛집·쇼핑 데이터만 사용하고, GitHub Actions에서 Notion API를 호출해 GitHub Pages를 자동 업데이트합니다.

> ⚠️ 현재 포함된 `data/trip.json`은 2026-11-20에 확인한 노션 자료를 바탕으로 편집한 **초기 데이터**입니다. 실시간 연동은 아래 `NOTION_TOKEN` 설정 후 첫 GitHub Actions 실행이 성공해야 시작됩니다. 아직 배포된 사이트가 아니라 소스 프로젝트입니다.

## 빠른 실행

Node.js 20 이상이 필요합니다. 외부 npm 패키지는 설치할 필요가 없습니다.

```bash
npm run dev
# http://localhost:4173
npm test
npm run build
# dist/가 GitHub Pages 배포용 완성 폴더
```

`index.html` 파일을 더블클릭해 여는 방식(`file://`)은 브라우저의 JSON 요청 제한으로 작동하지 않을 수 있습니다. `npm run dev`를 사용하세요.

## GitHub Pages 공개 + 노션 자동 동기화

1. GitHub 저장소(예: `fukuoka-yufuin-trip`)를 생성하고 이 프로젝트 파일을 `main` 브랜치에 올립니다. **기존의 참고 사이트 저장소를 덮어쓰지 마세요.**
2. GitHub에서 **Settings → Pages → Build and deployment → Source: GitHub Actions**를 선택합니다.
3. [Notion integrations](https://www.notion.so/profile/integrations)에서 **내부 통합(Internal integration)**을 만들고 페이지 콘텐츠 읽기 권한을 부여합니다.
4. 노션에서 `GPT_일본여행계획`와 `일본 여행 계획` 두 페이지를 열어 해당 통합을 **Connections(연결)**에 추가합니다. 하위 페이지나 동기화 블록의 원본은 별도 권한이 필요할 수 있습니다.
5. GitHub 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에 이름 `NOTION_TOKEN`으로 노션 토큰을 등록합니다. **코드, 커밋, 프런트엔드 파일에 절대 넣지 마세요.**
6. GitHub Actions에서 `Sync Notion and deploy trip website` 워크플로를 `Run workflow`로 실행합니다. 이후 기본 설정으로 **6시간마다 시도**하며, GitHub 스케줄 실행은 지연될 수 있습니다.
7. 필요하면 Repository Variables에 `NOTION_GUIDE_PAGE_ID`, `NOTION_ORIGINAL_PAGE_ID`를 추가해 다른 노션 문서를 지정할 수 있습니다. 기본값은 `scripts/notion-normalize.mjs`에 저장되어 있습니다.

비밀 토큰을 등록하지 않은 경우에도 초기 데이터로 사이트가 배포되지만, **노션 수정사항이 자동 반영되지는 않습니다**.

## 파일 구성

```text
fukuoka-yufuin-trip/
├── index.html                    # 사이트 섹션/탭 구조
├── styles.css                    # 반응형 스타일, 참고 사이트의 종이색+붉은색 분위기
├── app.js                        # 화면, 일정, 검색, 지도, 체크리스트
├── data/
│   └── trip.json                 # 정제된 공개 데이터 (초기 샘플 포함)
├── assets/
│   ├── kyushu-hero.svg           # 자체 제작한 여행 일러스트
│   └── favicon.svg
├── scripts/
│   ├── notion-normalize.mjs      # 원본 블록 → 공개 가능 필드 추출
│   ├── sync-notion.mjs           # Notion API 읽기/페이징/재시도
│   ├── build.mjs                 # GitHub Pages용 dist 생성
│   └── dev.mjs                   # 로컬 서버
├── tests/
│   └── normalizer.test.mjs       # 개인정보 제외·식당·일정 파싱 테스트
├── .github/workflows/
│   └── deploy.yml               # 6시간 간격 동기화 + GitHub Pages 배포
├── .gitignore
├── .nojekyll
└── package.json
```

## 현재 기능

- 3일간 일정 타임라인, 예약 상태 레이블, 항공·숙소·교통 목록
- 검색 가능한 맛집 목록, 지역 필터, 18개씩 더 보기
- 쇼핑몰 검색, 주소·영업시간, 층별 매장 정보 표시(텍스트 자료가 있을 경우)
- 확인된 좌표만 OpenStreetMap/Leaflet 핀으로 표시, 구글 지도로 이동
- 개인 기기의 로컬 스토리지에 저장되는 준비물 체크리스트
- 모바일/PC 반응형과 URL `#schedule`, `#food` 같은 메뉴 직접 링크

## 데이터 공개 범위와 한계

- **공개 가능한 필드만 허용하는 방식**입니다. 동기화기는 원본 노션 블록 전체를 JSON이나 HTML로 통째 복사하지 않습니다.
- 예약자명·예약번호·바우처·여권·QR·결제정보 등은 필터에서 제외하며, 전체 노션 원문 또는 비밀키를 웹에 내보내지 않습니다.
- 필터는 보조 수단입니다. **공개 배포 전에 `data/trip.json` 및 실제 페이지 내용을 반드시 직접 검토**하세요. 개인 정보는 별도 비공개 저장소로 관리하는 것이 좋습니다.
- 노션 자료의 매우 복잡한 중첩/동기화 블록은 자동 추출에서 누락될 수 있습니다. 먼저 GitHub Actions 실행 로그의 수집 개수를 확인하세요. 초기 예시 데이터는 잔존할 수 있습니다.
- 이미지만 포함된 쇼핑몰 층별 안내는 **사진을 자동 OCR하거나 게시하지 않습니다**. 노션에서 층별 정보를 텍스트나 표로 작성한 경우 추출할 수 있도록 추가 보강이 필요합니다.
- `sync-notion.mjs`는 노션 API를 실제로 읽어야 검증할 수 있습니다. 이 ZIP은 연결 자격 증명이 없어서 **실제 노션 토큰을 이용한 엔드투엔드 동기화까지 검증된 것은 아닙니다.**
- 외부 이미지/지도는 해당 서비스가 연결되지 않은 환경에서 보이지 않을 수 있습니다. 페이지 자체는 초기 데이터를 사용합니다.

## 사용한 주요 노션 페이지

- [GPT_일본여행계획](https://app.notion.com/p/3ff9f15859a88114ac13d260e554bfc8)
- [일본 여행 계획](https://app.notion.com/p/3f79f15859a8805dae46fd904191b5c4)

## 참고 디자인

[오사카·교토 여행 사이트](https://ahahdkdlel121.github.io/kansai-trip-2027/)의 크림색 종이 배경, 붉은 포인트 색, 상단 내비게이션 및 일정 중심 구성을 참고하여 별도 코드를 작성했습니다.
