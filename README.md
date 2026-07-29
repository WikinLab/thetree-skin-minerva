# thetree-skin-vector

MediaWiki Vector legacy 구조를 더트리 스킨으로 이식한 GPL-2.0-or-later 소스 패키지입니다.

잠긴 MediaWiki·Vector·확장 기능 원본에서 CSS, Vue 컴포넌트, JavaScript와 런타임 자산을 결정론적으로 생성합니다. 더트리와 원본 실행 환경의 차이는 명시적인 host adapter와 content projection 경계에서만 처리합니다.

## 버전 체계

이 프로젝트는 `0.<마일스톤>.<수정>` 형식의 SemVer를 사용합니다.

- 새 기능·아키텍처 마일스톤은 가운데 숫자를 올리고 `0.x.0`에서 시작합니다.
- 같은 마일스톤의 후속 작업은 기능, 수정, 문서 또는 메타데이터 변경인지와 관계없이 마지막 숫자를 1 올립니다.
- 명시적으로 취소된 작업은 릴리스 버전에 포함하지 않습니다.
- 현재 버전의 기준은 `package.json`이며 `package-lock.json`, `ORIGIN-MANIFEST.json`과 versioned contract가 이를 따라야 합니다.

릴리스 이력은 Git 커밋과 태그에서 관리합니다. README에는 특정 과거 버전의 누적 변경 로그를 보관하지 않습니다.

## 원본과 호스트 경계

- MediaWiki, Vector, DarkMode, Popups, Cite와 Codex 입력은 `UPSTREAM-LOCK.json`의 정확한 커밋이나 태그로 잠깁니다.
- `ORIGIN-MANIFEST.json`은 upstream 입력, 로컬 소스 역할, 수정 포트, 생성 그래프와 출력 inventory를 선언합니다.
- 수정하지 않은 upstream 런타임 자산과 생성 결과는 저장소에 중복 보관하지 않고 bootstrap 과정에서 물질화합니다.
- 더트리 전용 차이는 `lib/adapters/`, `css/host-content/`와 선택적 content projection 계층에서만 소유합니다.
- 페이지별 시각 보정이나 생성된 원본 파일의 직접 수정은 허용하지 않습니다.

## 선택적 본문 프로젝션

Vector 크롬과 더트리 프론트엔드의 원본 본문 출력은 항상 유지됩니다. `lib/contentProjection/index.js`는 일반 문서의 store 변환, 동적 WikiContent 변환, ParserOutput fragment navigation, category surface를 소유하는 선택적 계층입니다.

프로젝션을 끄면 MediaWiki 본문 surface와 이를 요구하는 Popups 런타임이 생성되지 않습니다. 크롬, 검색, 포틀릿과 DarkMode는 계속 동작합니다. 공통 런타임은 확장 이름을 하드코딩하지 않고 capability 요구사항으로 활성화 여부를 결정합니다.

선택적 [thetree-plugin-vector](https://github.com/Bvextratest/thetree-plugin-vector)는 브라우저 선택값을 기존 `skinData` SSR 계약으로 전달합니다. 플러그인이나 유효한 SSR 계약이 없으면 기본 Lite 동작을 유지합니다.

## DarkMode

어두운 표면은 로컬 `dark.css`가 아니라 잠긴 MediaWiki DarkMode 확장의 LESS, 메시지와 동작 계약에서 생성합니다. 더트리 adapter는 확장의 개인 도구와 문서 class 계약을 host-owned `wiki.theme` 및 `currentTheme` 상태에 연결합니다. MediaWiki API와 cookie persistence는 이식하지 않습니다.

## 요구사항

- Node.js 20.19.1 이상
- npm 10.8.2 이상
- Git

잠긴 `design-codex` upstream build를 재현하기 위해 위 버전 경계를 사용합니다.

## 부트스트랩과 검증

upstream checkout 없이 소스 패키지의 선언과 모듈 경계를 먼저 검사합니다.

```bash
npm run preflight
```

잠긴 upstream을 checkout하고 vendor 입력, SVG 자산과 생성 결과를 물질화합니다.

```bash
npm run bootstrap
```

생성 결과와 주요 통합 계약을 검사합니다.

```bash
npm run check
```

`bootstrap`은 다음 원칙을 지킵니다.

1. 정확히 잠긴 커밋만 shallow fetch하여 detached checkout합니다.
2. 루트와 임시 build-toolchain 의존성은 lock을 입력으로 `npm ci`로 설치합니다.
3. LESS import closure와 런타임 자산은 잠긴 Git blob에서 물질화합니다.
4. `ORIGIN-MANIFEST.json`의 단일 생성 그래프를 실행한 뒤 같은 그래프를 check mode로 다시 검증합니다.
5. `.upstream/`, `vendor/`, 생성 결과와 임시 의존성은 재사용 가능한 소스 이력으로 취급하지 않습니다.

잠긴 릴리스 라인의 최신 커밋으로 명시적으로 갱신하려면 다음 명령을 사용합니다.

```bash
npm run bootstrap -- --refresh
```

다른 MediaWiki 릴리스 라인을 선택하려면 다음과 같이 실행합니다.

```bash
npm run bootstrap -- --release 1.47
```

## ResourceLoader 경계

`contracts/resource-loader-origin-contract.json`은 SkinModule feature, LESS 입력, page style queue, host surface와 CSS ownership을 선언합니다. 생성기는 잠긴 MediaWiki lifecycle과 `ClientHtml` 정렬 규칙에서 최종 page-style 순서를 파생합니다.

더트리는 스킨 CSS를 단일 정적 entry로 선택하므로 현재 번들은 문서 종류와 런타임 동작을 포괄하는 `vector-legacy-maximal-page` profile을 사용합니다. `css/screen.css`는 계산된 origin bundle 뒤에 host adapter만 로드합니다.

## 저장소 구조

- `layout.vue`, `components/SkinLegacy.vue`: Vector 크롬과 더트리 장착 경계
- `lib/contentProjection/`, `css/content-projection.css`: 제거 가능한 본문 프로젝션 계층
- `lib/parserOutput/`, `css/content-projection/`: ParserOutput compiler와 전용 adapter
- `lib/adapters/`, `css/host-content/`: 더트리 host adapter
- `lib/ports/`: 원본 실행 환경과의 차이 때문에 수정이 필요한 source port
- `tools/`: bootstrap, 생성기와 계약 검사
- `contracts/`: ResourceLoader 및 upstream build-toolchain 계약
- `ORIGIN-MANIFEST.json`: 소스 역할과 생성 그래프
- `UPSTREAM-LOCK.json`: upstream repository와 commit lock
- `LICENSE`, `NOTICE`: 라이선스와 upstream 고지

`vendor/`, `.upstream/`, `.build-tools/`, `images/`, 생성된 Vue/CSS/JavaScript와 `node_modules/`는 source distribution에 포함하지 않습니다.

## 라이선스

프로젝트 코드는 GPL-2.0-or-later로 배포됩니다. 포함하거나 bootstrap 과정에서 물질화하는 upstream 소스의 저작권과 라이선스 고지는 `NOTICE` 및 각 원본의 라이선스를 따릅니다.
