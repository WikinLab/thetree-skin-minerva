# thetree-skin-vector

MediaWiki Vector legacy 구조를 더트리 스킨으로 이식한 GPL-2.0-or-later 소스 패키지입니다.

잠긴 MediaWiki·Vector·확장 기능 원본에서 CSS, Vue 컴포넌트, JavaScript와 런타임 자산을 결정론적으로 생성합니다. 더트리와 원본 실행 환경의 차이는 명시적인 host adapter와 content projection 경계에서만 처리합니다.

## 버전 체계

이 프로젝트는 [Semantic Versioning](https://semver.org/)을 사용합니다. 현재 버전은 `package.json`을 기준으로 하며 릴리스 이력은 Git 태그와 GitHub Releases에서 관리합니다.

## 원본과 호스트 경계

- MediaWiki, Vector, DarkMode, Popups, Cite와 Codex 입력은 `UPSTREAM-LOCK.json`의 정확한 커밋이나 태그로 잠깁니다.
- `ORIGIN-MANIFEST.json`은 upstream 입력, 로컬 소스 역할, 수정 포트, 생성 그래프와 출력 inventory를 선언합니다.
- 수정하지 않은 upstream 런타임 자산과 생성 결과는 저장소에 중복 보관하지 않고 bootstrap 과정에서 물질화합니다.
- 더트리 전용 차이는 `lib/adapters/`, `css/host-content/`와 선택적 content projection 계층에서만 소유합니다.
- 페이지별 시각 보정이나 생성된 원본 파일의 직접 수정은 허용하지 않습니다.

## 스킨 변형과 본문 모드

스킨의 정체성과 본문 처리 방식은 서로 독립된 축으로 관리합니다.

- `vector-legacy` 스킨 변형은 `contracts/skin-variant-contract.json`이 선언하며, Vector Legacy의 LESS 변수와 MediaWiki 요소 원본을 색상·요소 규칙의 유일한 기준으로 사용합니다.
- `native` 본문 모드는 더트리가 만든 본문 구조를 유지하는 기본값입니다. 일반·방문·없는·외부 링크의 텍스트 색상은 해당 스킨 변형의 잠긴 MediaWiki 변수와 링크 규칙에서 기계적으로 생성합니다. 더트리 외부 링크 아이콘은 모양·크기·전경을 유지하고 배경색만 같은 변형의 외부 링크 색상으로 투영합니다.
- `projected` 본문 모드는 더트리 본문을 MediaWiki ParserOutput surface로 변환하는 선택 기능입니다.
- 밝게·어둡게 같은 색상 모드는 스킨 변형이나 본문 모드와 섞지 않고 DarkMode 계약으로 별도 처리합니다.

따라서 Vector 2022를 추가할 때는 별도 스킨 변형 계약에 그 변형의 upstream 변수와 링크 규칙 원본을 연결하고, `native`/`projected` 본문 모드 경계와 더트리 링크 의미 계약은 그대로 재사용할 수 있습니다.

## 선택적 본문 프로젝션

Vector 크롬과 더트리 프론트엔드의 원본 본문 출력은 항상 유지됩니다. `lib/contentProjection/index.js`는 일반 문서의 store 변환, 동적 WikiContent 변환, ParserOutput fragment navigation, category surface를 소유하는 선택적 계층입니다.

프로젝션을 끄면 MediaWiki 본문 surface와 이를 요구하는 Popups 런타임이 생성되지 않습니다. 크롬, 검색, 포틀릿과 DarkMode는 계속 동작합니다. 공통 런타임은 확장 이름을 하드코딩하지 않고 capability 요구사항으로 활성화 여부를 결정합니다.

선택적 [thetree-plugin-vector](https://github.com/Bvextratest/thetree-plugin-vector)는 브라우저 선택값을 기존 `skinData` SSR 계약으로 전달합니다. 플러그인이나 유효한 SSR 계약이 없으면 기본 `native` 모드를 유지합니다. 기존 플러그인의 boolean wire 형식은 adapter 경계에서 `native`/`projected` 모드로 변환합니다.

## DarkMode

어두운 표면은 로컬 `dark.css`가 아니라 잠긴 MediaWiki DarkMode 확장의 LESS, 메시지와 동작 계약에서 생성합니다. 더트리 adapter는 확장의 개인 도구와 문서 class 계약을 host-owned `wiki.theme` 및 `currentTheme` 상태에 연결합니다. MediaWiki API와 cookie persistence는 이식하지 않습니다.

## 요구사항

- `package.json`의 `engines`를 충족하는 Node.js와 npm
- Git

잠긴 `design-codex` upstream build를 재현하기 위해 선언된 런타임 버전 경계를 사용합니다.

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

새로 clone한 저장소에는 무시된 vendor 입력과 생성 결과가 없으므로 첫 빌드 전에 `npm run bootstrap`이 필요합니다. upstream lock, 생성 계약 또는 생성기 자체가 바뀐 버전으로 업데이트할 때도 같은 명령을 다시 실행해야 합니다. 단순 애플리케이션 빌드는 이 과정을 대신하지 않습니다. 이미 같은 버전의 bootstrap 결과가 온전히 있는 상태에서 애플리케이션만 다시 빌드할 때는 반복할 필요가 없습니다.

더트리 관리자 화면의 스킨 업데이트와 빌드는 각각 Git 업데이트와 애플리케이션 번들 빌드만 수행합니다. 따라서 bootstrap이 필요한 업데이트에서는 스킨 checkout 디렉터리에서 위 명령을 먼저 실행한 뒤 관리자 화면에서 스킨을 빌드합니다.

잠긴 릴리스 라인의 최신 커밋으로 명시적으로 갱신하려면 다음 명령을 사용합니다.

```bash
npm run bootstrap -- --refresh
```

다른 MediaWiki 릴리스 라인을 선택하려면 다음과 같이 실행합니다.

```bash
npm run bootstrap -- --release 1.47
```

## ResourceLoader 경계

`contracts/resource-loader-origin-contract.json`은 SkinModule feature, page style queue, host surface와 CSS ownership을 선언합니다. 스킨별 LESS 변수와 요소 입력은 `contracts/skin-variant-contract.json`에서 파생하므로 생성기에 특정 변형의 색상값이나 경로를 중복 하드코딩하지 않습니다. 생성기는 잠긴 MediaWiki lifecycle과 `ClientHtml` 정렬 규칙에서 최종 page-style 순서를 파생합니다.

더트리는 스킨 CSS를 단일 정적 entry로 선택하므로 현재 번들은 문서 종류와 런타임 동작을 포괄하는 `vector-legacy-maximal-page` profile을 사용합니다. `css/screen.css`는 계산된 origin bundle 뒤에 host adapter만 로드합니다.

## 저장소 구조

- `layout.vue`, `components/SkinLegacy.vue`: Vector 크롬과 더트리 장착 경계
- `lib/skinVariant.js`, `lib/contentMode.js`: 런타임 스킨 변형과 직교 본문 모드 식별자
- `lib/linkSemantics.js`: 네이티브 CSS와 ParserOutput 프로젝션이 공유하는 더트리·MediaWiki 링크 의미 계약
- `lib/contentProjection/`, `css/content-projection.css`: 제거 가능한 본문 프로젝션 계층
- `lib/parserOutput/`, `css/content-projection/`: ParserOutput compiler와 전용 adapter
- `lib/adapters/`, `css/host-content/`: 더트리 host adapter
- `lib/ports/`: 원본 실행 환경과의 차이 때문에 수정이 필요한 source port
- `tools/`: bootstrap, 생성기와 계약 검사
- `contracts/`: 스킨 변형, ResourceLoader 및 upstream build-toolchain 계약
- `ORIGIN-MANIFEST.json`: 소스 역할과 생성 그래프
- `UPSTREAM-LOCK.json`: upstream repository와 commit lock
- `LICENSE`, `NOTICE`: 라이선스와 upstream 고지

`vendor/`, `.upstream/`, `.build-tools/`, `images/`, 생성된 Vue/CSS/JavaScript와 `node_modules/`는 source distribution에 포함하지 않습니다.

## 라이선스

프로젝트 코드는 GPL-2.0-or-later로 배포됩니다. 포함하거나 bootstrap 과정에서 물질화하는 upstream 소스의 저작권과 라이선스 고지는 `NOTICE` 및 각 원본의 라이선스를 따릅니다.
