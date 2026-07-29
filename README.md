# thetree-skin-vector v355

MediaWiki Vector legacy 구조를 더트리 스킨으로 이식한 GPL-2.0-or-later 소스 패키지입니다.
배포 ZIP은 upstream 체크아웃, 수정하지 않은 upstream 런타임 자산 사본, 부트스트랩 생성물을 포함하지 않습니다. 더트리에 맞게 수정한 소스 포트는 대응 소스와 함께 포함합니다.


## DarkMode extension origin

The legacy Vector dark surface is provided by the locked MediaWiki DarkMode extension rather than a locally designed `dark.css`. The bootstrap mirrors the extension metadata, hook contract, English/Korean messages, JavaScript behavior source, and LESS source from the exact REL1_46 commit. `ext.DarkMode.styles` is generated as one ResourceLoader CSS module. The thetree adapter maps the extension's personal-tool and `<html>` class contracts to the host-owned `wiki.theme`/`currentTheme` state; MediaWiki API and cookie persistence remain host-owned and the upstream JavaScript is retained as a behavior contract rather than executed directly.


## DarkMode host adapter completion

The DarkMode extension personal-tool hook is mapped into Vector's `data-user-menu` and the original `ext-darkmode-link` class/message contract is retained. Clicking the item changes the host-owned `wiki.theme` preference and effective `currentTheme`; the MediaWiki API and clientPrefs implementations remain unported. While the skin is active, the adapter continuously suppresses the tree frontend's `theseed-light-mode`/`theseed-dark-mode` body classes at the host document boundary. This is required because the host theme watcher may re-add those classes after the skin mounts; the locked DarkMode inversion must remain the single active theme owner. The original class state is restored when the skin unmounts.

The host content tree is projected from one explicit contract: the upstream `#bodyContent.vector-body` element owns the shared Vector content context, `#mw-content-text` owns the current root surface, and declared dynamic children such as the editor preview re-enter the same canonical ParserOutput projector used by ordinary articles. Interface surfaces no longer reset inherited Vector typography. Generic generated element rules remain isolated from interface DOM, while upstream rules explicitly anchored by `.vector-body` or `#bodyContent` retain their original content-context reach.

## 선택적 본문 프로젝션 경계

Vector 크롬과 더트리 프론트엔드의 원본 본문 출력은 항상 존재합니다. `lib/contentProjection/index.js`만 일반 문서의 store 사전 변환, 동적 WikiContent 변환, ParserOutput fragment navigation, Vector catlinks와 surface 표식을 소유하는 선택적 레이어입니다. `layout.vue`와 `SkinLegacy.vue`는 이 공개 진입점 외의 구체 구현을 import하지 않습니다.

CSS도 `css/content-projection.css` 하나만 프로젝션 전용 어댑터를 불러옵니다. 프로젝션이 꺼지면 `mw-body-content`, `wiki-article`, `data-tt-vector-surface`와 category surface를 설치하지 않으므로 생성된 원본 콘텐츠 CSS와 로컬 프로젝션 CSS가 더트리 원본 본문에 도달하지 않습니다. 크롬, 검색, 포틀릿, DarkMode와 Popups 런타임은 그대로 유지됩니다.

선택적 [thetree-plugin-vector-content-projection](https://github.com/Bvextratest/thetree-plugin-vector-content-projection) 플러그인은 브라우저 쿠키를 기존 `skinData` hook의 SSR 데이터로 전달합니다. 플러그인이 감지되면 Vector 개인 도구에 `스킨 본문 끄기/켜기`가 나타나며, 선택값을 저장한 뒤 한 번 새로고침하여 서버 HTML과 hydration이 처음부터 같은 모드를 사용합니다. 플러그인이 없으면 토글을 노출하지 않고 기존 프로젝션 활성 상태를 기본값으로 사용합니다.

별도 Lite 배포판은 새로운 본문 구현이 아닙니다. `layout.vue`의 단일 JavaScript 프로젝션 진입점과 `css/screen.css`의 단일 프로젝션 stylesheet 진입점을 제외하면, 동일한 Vector 크롬 안에 동일한 더트리 원본 본문이 남습니다. `ORIGIN-MANIFEST.json`과 preflight는 외부 코드가 프로젝션 내부 파일을 직접 import하지 못하도록 이 제거 경계를 검사합니다.

## 부트스트랩

소스 ZIP의 구조 계약만 먼저 확인하려면 다음 명령을 실행합니다.

```bash
npm run preflight
```

잠긴 `design-codex` 태그의 upstream 빌드 요구사항 때문에 Node.js 20.19.1 이상, npm 10.8.2 이상, Git이 필요합니다.

Windows의 전역 `core.autocrlf=true`와 무관하게 hash-locked build-toolchain `package-lock.json`은 `.gitattributes`에서 LF checkout을 강제합니다. `npm run preflight`도 부트스트랩 전에 기대 SHA-256과 실제 SHA-256을 검사하므로 줄바꿈이 달라진 작업 트리를 즉시 명확한 오류로 보고합니다. 잠금 해시를 CRLF 결과로 바꾸거나 검사를 우회해서는 안 됩니다.

```bash
npm run bootstrap
```

이 명령은 다음 작업을 한 번에 수행합니다.

1. 이전 실행의 `vendor/`, 런타임 자산 및 생성된 Vue/CSS/JavaScript를 먼저 제거합니다.
2. 루트 도구 의존성을 `npm ci --ignore-scripts --no-audit --no-fund`로 설치합니다. `package-lock.json`은 설치 결과로 갱신하는 파일이 아니라 정확한 의존성 입력이며, 변경이 감지되면 원상복구한 뒤 실패합니다.
3. `UPSTREAM-LOCK.json`의 MediaWiki 계열 upstream과 `ORIGIN-MANIFEST.json`의 thetree host lock을 빈 partial 저장소에 잠긴 Git 커밋 하나만 `depth 1`로 fetch한 뒤 detached checkout으로 맞춥니다. 서로 독립적인 저장소는 최대 3개까지 병렬로 준비하며, 브랜치 이력 전체를 먼저 clone하거나 exact fetch 실패 시 브랜치 전체로 물러나는 경로는 없습니다. 기존 checkout도 `reset --hard`와 `clean -ffdx`를 거치므로 이전 빌드 출력과 `node_modules`가 입력으로 재사용되지 않습니다.
4. Codex CSS·디자인 토큰·공개 LESS mixin·아이콘 경로 변수는 npm 패키지 아티팩트를 입력으로 사용하지 않습니다. 잠긴 `design-codex` Git 태그는 upstream 전체 workspace를 checkout하고, 프로젝트가 보관하는 최소 build-toolchain lock과 실제 workspace package link를 임시 연결한 뒤 upstream 자체 빌드 명령을 실행합니다. upstream 저장소에 존재하지 않는 lock 파일을 가정하지 않으며, toolchain lock이 변경되면 실패합니다.
5. 선언된 upstream 파일과 upstream에서 빌드한 결과를 `vendor/`에 물질화합니다. LESS 파일은 선언된 seed에서 같은 import parser·resolver로 로컬 import를 재귀 추적하여, import된 upstream 파일 하나를 대응 vendor 파일 하나로 기계적으로 추가합니다. 이후 checkout의 임시 빌드 출력과 의존성을 다시 제거합니다.
6. 잠긴 upstream의 SVG 런타임 자산 14개를 Git blob 바이트에서 `images/`로 물질화합니다.
7. `ORIGIN-MANIFEST.json`의 단일 생성 그래프를 실행하고 같은 그래프를 검사 모드로 다시 실행하여 실제 출력과 선언된 출력 inventory가 정확히 일치하는지 확인합니다.

잠금된 릴리스 라인의 최신 커밋으로 명시적으로 갱신하려면 다음 명령을 사용합니다.

```bash
npm run bootstrap -- --refresh
```

다른 MediaWiki 릴리스 라인을 선택하려면 다음과 같이 실행합니다.

```bash
npm run bootstrap -- --release 1.47
```

기본 부트스트랩은 이동하는 브랜치 HEAD를 해석하지 않고 잠금 파일의 정확한 커밋만 사용합니다. 제한 병렬화는 checkout 준비 시간만 줄이며, 이후 원본 빌드·물질화·생성 그래프의 결정론적 순서는 바꾸지 않습니다. 다른 Codex 버전으로 갱신할 때는 같은 버전의 build-toolchain 계약이 소스에 존재해야 하며, 없으면 부트스트랩이 임의 설치로 완화되지 않고 실패합니다. SVG 런타임 자산은 checkout 작업 트리의 줄바꿈 형식이 아니라 잠긴 커밋의 Git blob 바이트에서 직접 생성됩니다. upstream checkout의 자동 CRLF 변환도 비활성화하므로 Windows와 Unix 계열 환경에서 같은 원본 바이트를 사용합니다.

## 배포 구조

- `layout.vue`, `components/SkinLegacy.vue`: 공통 Vector 크롬과 더트리 장착 경계
- `lib/contentProjection/`, `css/content-projection.css`: 제거 가능한 단일 Vector 본문 프로젝션 모듈
- `lib/parserOutput/`, `css/content-projection/`: 프로젝션 내부 ParserOutput 컴파일러와 전용 host adapter
- `lib/`, `css/`: 나머지 스킨 소스와 로컬 어댑터
- `lib/ports/`: 원본 실행 환경과의 실제 차이 때문에 adapter가 필요한 수정 소스 포트 및 bootstrap 생성 포트 경로
- `lib/generated/`: 잠긴 upstream JavaScript 함수 조각 등 bootstrap 생성물
- `tools/`: 부트스트랩과 결정론적 생성에 필요한 도구
- `contracts/upstream-build-toolchains/`: lock을 제공하지 않는 upstream을 빌드하기 위한 최소·고정 도구 체인 계약
- `ORIGIN-MANIFEST.json`: upstream 입력, 수정 소스 대응, 물질화 자산과 생성 출력 목록
- `UPSTREAM-LOCK.json`: upstream 저장소·커밋과 repository-local 빌드 계약 잠금
- `LICENSE`, `NOTICE`: 라이선스와 upstream 고지

`vendor/`, `.upstream/`, `.build-tools/`, `images/`, 생성된 Vue/CSS/JavaScript, `node_modules/`는 배포 ZIP에서 제외됩니다. `images/`는 부트스트랩 과정에서 locked upstream으로부터 생성됩니다.




## v355 host JavaScript 템플릿 리터럴 문법 복구

- 잠긴 backend 정적 추출기가 JavaScript의 작은따옴표·큰따옴표 문자열과 템플릿 리터럴의 줄바꿈 규칙을 같은 것으로 취급하던 결함을 수정했습니다. 일반 문자열의 비이스케이프 줄바꿈은 계속 오류지만, 백틱 템플릿 리터럴의 LF·CRLF·CR은 ECMAScript cooked 값과 같은 LF로 읽습니다.
- `routes/aclgroup.js`의 여러 줄 동적 템플릿처럼 opening backtick 바로 뒤에 줄바꿈이 오는 유효한 소스를 정확히 건너뛰며, 뒤따르는 `res.renderSkin`의 정적 `contentName` 추출을 계속 수행합니다. 계약값이나 페이지별 예외를 추가한 것이 아니라 토크나이저의 문자열 문법 공식을 바로잡았습니다.
- source-only preflight와 실제 locked-source closure 검증이 동일한 extractor contract를 실행합니다. 여러 줄 동적 템플릿, 정적 템플릿 `contentName`, 동적 `contentName` 거부를 같은 기존 엔진에서 확인하며 별도 검사 패키지나 fallback parser는 추가하지 않았습니다.
- Vector/MediaWiki 생성 CSS, 특수 페이지 role selector, Vue DOM, ParserOutput 및 ResourceLoader 순서는 변경하지 않았습니다.

## v354 잠긴 더트리 소스 폐쇄 검증

- `ORIGIN-MANIFEST.json`의 host lock을 선언용 메타데이터에서 실제 bootstrap 입력으로 승격했습니다. bootstrap은 잠긴 thetree frontend/backend 커밋을 `.upstream/host-thetree-frontend`와 `.upstream/host-thetree`에 exact detached checkout하며, 이동하는 기본 브랜치 HEAD를 입력으로 사용하지 않습니다.
- 전체 생성과 검사 단계는 잠긴 backend `routes/`의 JavaScript를 문자열 검색이 아니라 주석·문자열·템플릿·정규식 경계를 구분하는 정적 토큰 공식으로 읽어 `contentName` 리터럴 집합을 추출합니다. 동적 `contentName`은 임의 추정하지 않고 계약 불능으로 실패합니다.
- 추출된 backend 집합, `CONTENT_SURFACE_MAP`의 전체 키, 각 행의 결정론적 frontend 경로, 잠긴 `src/views/contents/<contentName>.vue` 실재 여부가 정확히 닫혀야 생성이 진행됩니다. 누락 페이지, 사라진 페이지, 이름 변경, frontend/backend 불일치가 있으면 계약표나 fallback을 자동 완화하지 않습니다.
- source-only `npm run preflight`는 host lock schema와 런타임 계약의 동일성을 검사하고, `npm run bootstrap` 뒤의 `generate`와 `check`는 실제 checkout 바이트를 다시 검사합니다. 특수 페이지 역할 selector와 시각 값은 변경하지 않았습니다.

## v353 잠긴 특수 페이지 계약·인터페이스 역할 투영

- 잠긴 thetree frontend/backend 커밋의 `contentName`을 특수 페이지 어댑터의 결정론적 식별자로 사용합니다. `contentName`이 없을 때만 기존 `viewName` 호환 계약을 사용합니다.
- 일반 문서, 문서 작업, 특수 목록, 검색, 사용자, 관리, 기여 페이지를 하나의 불변 계약표에 등록하고 각 행에 Vector/MediaWiki 대응 surface, SkinModule feature, interface archetype과 알려진 손실을 선언합니다.
- archetype은 새 디자인 CSS가 아닙니다. 계약에 들어 있는 정확한 host selector를 `data-tt-vector-interface-role`과 `data-tt-vector-upstream-primitive`로 투영하는 의미 어댑터입니다. property/value, margin, padding, font 크기 같은 시각 값은 계약에 존재하지 않습니다.
- v352의 단일 host-content runtime과 MutationObserver가 interface 역할과 중첩 ParserOutput을 함께 처리합니다. 페이지별 observer, transformer, CSS 파일 또는 selector fallback은 추가하지 않습니다.
- 원본 ResourceLoader 파일·모듈 경계와 생성 순서는 변경하지 않았으며, interface 스타일은 기존 일대일 upstream 생성물과 thetree가 소유한 Vue scoped CSS가 계속 담당합니다.

## v352 원본 콘텐츠 컨텍스트·ParserOutput 투영 통합

- 페이지 상태를 `context + root surface + nested surfaces`로 표현하는 단일 projection contract로 통합했습니다. 일반 문서는 `article-body` ParserOutput surface이고, 편집·편집 요청은 interface root 아래에 동적 preview ParserOutput surface를 선언합니다.
- 원본 Vector의 `#bodyContent.vector-body`에 `content-common` context를 물질화하고, `#mw-content-text` interface 경계의 로컬 `font-size`·`line-height` 재설정을 제거했습니다. 일반 문서와 중첩 미리보기가 같은 원본 `.vector-body` typography를 상속합니다.
- 일반 문서와 동적 미리보기는 하나의 `projectParserOutputHtml()` 변환 공식을 사용합니다. 런타임은 현재 route의 projection contract를 매 실행 시 다시 읽고, 하나의 host observer로 선언된 동적 nested surface만 처리합니다. `#jump-to-nav` fallback과 페이지별 observer는 추가하지 않았습니다.
- ResourceLoader 원본 파일·모듈 경계, 선언 값과 순서는 유지합니다. SkinModule `content-body`는 원본 의미대로 content-common 소유권으로 투영하고, `.vector-body`·`#bodyContent`로 명시적으로 고정된 upstream selector는 공통 콘텐츠 context에 남깁니다. 반면 `ul` 같은 비고정 전역 요소 selector는 interface DOM에서 계속 격리됩니다.
- `#mw-content-text`는 모든 콘텐츠 화면에서 원본 `mw-body-content`와 문서 방향 class를 가집니다. parser-output 전용 규칙의 도달 여부는 class 유무를 임의로 제거하는 대신 explicit surface domain으로 결정합니다.
- 새 시각 값, TOC 전용 크기 보정, 미리보기 전용 line-height, 페이지별 margin·padding 규칙은 추가하지 않았습니다.


## v351 interface/parser-output 글자 축척 상속 복구

- v350에서 `html-body-content` 경계가 정상 materialize되면서 과거 interface 어댑터의 `font-size: 1rem` 재설정도 처음 실제 적용되었습니다. 이 선언은 원본 Vector의 `#bodyContent.vector-body` 본문 축척을 취소하여 특수 페이지와 그 안의 편집 미리보기를 일반 문서보다 크게 만들었습니다.
- interface projection에서 로컬 글자 크기 숫자를 지정하지 않고 원본 Vector 상위 typography를 그대로 상속하도록 수정했습니다. 편집 미리보기는 같은 상속 축척에서 명시적 parser-output surface로 재진입하므로 일반 문서와 동일한 font-size 기준을 사용합니다.
- host 인터페이스 컨트롤의 line-height 경계는 유지합니다. margin·padding·특정 페이지·특정 요소의 글자 크기 보정은 추가하지 않았습니다.

## v350 Mustache/Vue 슬롯 DOM 정체성 복구

- 원본 `skin-legacy.mustache`의 `#jump-to-nav`와 `html-body-content` 슬롯이 같은 VNode 형제로 렌더링될 때, 수동 Mustache/Vue 런타임이 슬롯을 무키 배열로 평탄화하여 hydration 이후 `#mw-content-text`가 `#jump-to-nav`와 합쳐질 수 있던 구조적 결함을 수정했습니다.
- 원본 id가 있는 Mustache 요소에는 id에서 결정되는 VNode key를 부여하고, named slot은 Vue의 `renderSlot`과 같은 안정적인 슬롯 경계로 materialize합니다. key는 DOM 속성이나 레이아웃을 추가하지 않습니다.
- `html-body-content`의 host wrapper 자체에도 고정 key를 부여하여 `#jump-to-nav`는 원본처럼 빈 호환 지점으로 남고, `#mw-content-text`가 별도 형제로 유지되도록 했습니다.
- 이 경계가 복구되면 v348에서 도입한 interface CSS 격리와 편집 미리보기 parser-output observer가 동일한 `#mw-content-text`를 실제 런타임 루트로 사용합니다.

## v349 ResourceLoader 계약 schema 단일화

- ResourceLoader origin 계약의 지원 schema 목록을 `tools/resource-loader-origin-schema.mjs` 한 곳으로 옮겼습니다. 생성 엔진과 source-only preflight가 같은 검증 함수를 사용하므로 계약과 엔진의 지원 버전이 따로 어긋날 수 없습니다.
- v348에서 projection 계약을 schema 8로 올리고 엔진 허용 목록을 7에 남긴 부트스트랩 차단 오류를 수정했습니다. schema를 이전 값으로 되돌리지 않고, 실제 schema 8 구현을 엔진이 명시적으로 지원하도록 했습니다.
- `npm run preflight`는 외부 의존성 설치 전에도 모든 `resource-loader-origin` 생성 노드의 계약 schema를 검사합니다.

## v348 본문 격리·투영 경계 전환

- 원본 Vector chrome은 기존 생성 CSS가 계속 직접 소유합니다. `#mw-content-text`에는 `data-tt-host-content="1"`을 설치하고, 문서와 특수 페이지를 각각 `data-tt-vector-projection="parser-output"` 및 `"interface"`로 선언합니다.
- 생성된 Vector/SkinModule CSS는 host-content 바깥에서는 원본 selector로 동작하고, host-content 안에서는 parser-output projection과 그 자손에만 기계적으로 재허용됩니다. 필터는 `:where()`로 추가되어 v347 문서 본문의 selector specificity, 선언 값, 선언 순서를 변경하지 않습니다.
- 특수 페이지의 raw Nuxt DOM은 생성 MediaWiki 요소 CSS로부터 격리되므로 편집·ACLGroup·최근 변경 탭의 `<ul>`에 본문 목록 margin이 침투하지 않습니다.
- 편집 및 편집 요청 미리보기는 page contract에 선언된 정확한 host surface (`.tabs > .preview`, `.tabs > .preview-tab`)를 일반 문서와 동일한 `transformHtmlFragment()`로 변환하고, 해당 surface에 중첩 parser-output projection을 설치합니다.
- Popups generic 오류 미리보기는 원본의 `generic -> popups-icon--preview-generic -> sad-face-ltr.svg` 대응으로 복구했습니다. 원본에 없는 `popups-icon--articleGeneric` 분기는 제거했습니다.
- 이 경계는 이후 Lite 파생에서 projection runtime/CSS만 제거하고 Nuxt 본문을 원형으로 남길 수 있도록 chrome 소유권과 본문 소유권을 분리합니다.

## v347 ResourceLoader 공개 LESS 토큰 closure 복구

346은 생성된 upstream CSS와 로컬 adapter CSS의 소비 집합을 분리했지만, shim 생성 후보를 upstream CSS의 미해결 custom property로만 제한했습니다. 마지막 closure 검증은 로컬 CSS까지 다시 합치므로, 로컬 adapter가 Codex의 실제 공개 LESS 토큰인 `border-width-base`·`border-style-base`·`border-radius-base`를 사용해도 그 이름은 shim 후보에 들어가지 않고 반드시 실패했습니다.

347은 로컬 custom property 이름을 권위 Vector LESS 환경에 무조건 역산하지 않습니다. 잠긴 Codex 빌드가 생성한 `theme-wikimedia-ui.less`를 다른 prelude 없이 독립적인 **공개 토큰 환경**으로 평가하고, 로컬 CSS의 미해결 이름 가운데 그 환경에서 실제 정의되는 토큰만 shim 후보로 승격합니다. 최종 값은 계속 Vector legacy의 `mediawiki.skin.variables.less` 환경에서 다시 평가하므로 skin override를 보존합니다. 생성 upstream CSS가 자체적으로 요구한 변수는 기존 공식대로 처리하고, Codex 공개 토큰 환경에 없는 로컬 별칭은 실패합니다. 따라서 세 border 토큰을 이름별 예외로 추가하지 않으면서도 346의 `line-height-base`·`line-height-code` 같은 임의 별칭 차단을 유지합니다.

## v346 ResourceLoader upstream/local custom-property closure 분리

336의 closure는 생성된 upstream ResourceLoader CSS와 로컬 host adapter CSS를 하나의 소비 집합으로 합친 뒤, 미해결 `var(--*)` 이름을 모두 같은 이름의 LESS 변수에서 역산했습니다. 이 때문에 upstream CSS가 실제로 요구한 전역 token과, 과거 수동 shim을 전제로 로컬 adapter가 만든 `--line-height-base`·`--line-height-code` 같은 별칭이 구분되지 않았습니다. 앞선 범위·DOM·권위 환경 수정은 오분류 종류를 줄였지만 이 잘못된 입력 결합은 남아 있어 다음 로컬 별칭이 순차적으로 오류로 드러났습니다.

346은 shim 생성 입력을 **생성된 upstream CSS만**으로 제한합니다. 그 upstream CSS에서 선언·fallback·component 상속으로 해결되지 않는 token만 Vector legacy의 권위 skin LESS 환경에서 평가해 `:root` shim으로 만듭니다. 로컬 CSS는 생성 대상이 아니라 별도 소비 검증 대상이며, upstream 출력·생성 shim·host prefix 중 어디에서도 공급되지 않는 custom property를 참조하면 LESS 이름을 추정하지 않고 로컬 adapter 소유권 위반으로 실패합니다.

334/338에서 남아 있던 두 로컬 line-height 별칭은 원본 MediaWiki token이 아니므로 제거했습니다. interface 안의 parser-output은 이미 생성된 `.mw-body-content` typography가 소유하고, syntax-highlight source alias의 표준 `pre`/`code` 흐름도 upstream parser-output CSS가 소유합니다. 따라서 `1.6`이나 `1.3`을 새 값으로 하드코딩하지 않고 중복 adapter 선언 자체를 없앴습니다.

## v345 ResourceLoader 전역 custom-property 권위 환경 분리

344의 closure는 전역 `:root` shim 값을 구할 때 활성 Vector skin 변수 파일뿐 아니라 각 ResourceLoader module entrypoint의 LESS 환경까지 모두 probe했습니다. extension 또는 개별 feature entrypoint가 같은 이름의 LESS 변수를 모듈 내부에서 재정의하면, 그 값은 해당 모듈의 정적 CSS를 컴파일하기 위한 지역 입력인데도 문서 전역 CSS custom property 후보로 합쳐졌습니다. 이 때문에 `@border-radius-base`의 Vector 값과 module-local 값이 충돌했습니다.

345는 custom-property shim의 값 출처를 contract의 `authoritativeLessEntrypoints`로 분리합니다. 현재 권위 입력은 잠긴 Vector legacy의 `mediawiki.skin.variables.less` 하나이며, module entrypoint는 자기 CSS를 컴파일할 때만 사용되고 전역 `:root` 값 결정에는 참여하지 않습니다. 여러 권위 skin 환경을 명시할 경우에만 그 환경들 사이의 값 불일치를 실패로 처리합니다. 따라서 임의의 한 값을 선택하거나 `--border-radius-base` 이름을 예외 처리하지 않고, MediaWiki에서 skin이 전역 변수 API를 제공하고 module은 그 API를 소비한다는 소유권 관계를 그대로 반영합니다.

## v344 parser-output DOM 회귀 복구

343에서 확인된 픽셀 패리티 회귀와 parser category 깜빡임은 v339의 소유권 변경에서 발생했습니다. v334에서 실제 브라우저 패리티가 확인되었고 v338까지 동일했던 parser-output 묶음을 그대로 복원합니다. 더트리의 Vue-owned `.wiki-content` 요소는 제거하거나 `.mw-parser-output`으로 바꾸지 않고, 불가피한 host adapter shell로 유지합니다. `contentHtml`에는 compiler-owned `.mw-parser-output` 자식이 다시 생성되며, host shell은 기존 adapter CSS에서 layout box를 만들지 않도록 처리됩니다.

parser HTML에서 나온 category는 reactive metadata로 옮겨 Vector slot에서 나중에 다시 그리지 않고, 같은 pre-render compiler pass에서 MediaWiki catlinks DOM으로 변환합니다. 따라서 mounted runtime이 category source를 제거하거나 `legacyCategoryData.hasCategories` 변화로 전체 skin runtime을 재초기화하는 경로가 없습니다. 구조화된 `$store.state.viewData.categories`만 원래 Vector `html-categories` slot을 사용합니다.

이 복구는 v335~v343의 ResourceLoader, JavaScript 생성, 공통 MediaWiki runtime, bootstrap/preflight 및 custom-property closure 수정은 유지하고, v339에서 바뀐 parser-output/category/CSS 소유권 파일만 v334/v338의 검증된 집합으로 되돌립니다.


## v343 ResourceLoader custom-property DOM 상속 계산 수정

343은 CSS selector만으로는 드러나지 않는 custom-property 상속 관계를 잠긴 upstream 정적 템플릿에서 파생합니다. Popups의 `popup.js`가 content root에 부여하는 `.mwe-popups-container`와 `pagePreview.js`·`preview.js`의 정적 `templateHTML`을 결합해 class ancestor/descendant 그래프를 만들고, CSS 선언 selector와 참조 selector의 관계를 그 DOM 그래프로 투영합니다. 따라서 `.mwe-popups-container`에 선언된 `--pointer-height`가 그 selector를 생략한 자식 `.mwe-popups-discreet`에서도 상속된다는 원본 구조를 인식합니다. 템플릿 literal, root class 할당, 단일 root 구조가 선언된 형태와 다르면 추정하지 않고 생성 단계에서 실패합니다. 변수명별 예외나 전역 fallback은 추가하지 않았습니다.

## v342 ResourceLoader custom-property 범위 계산 수정

336의 custom-property closure는 CSS에서 `var(--*)` 참조를 수집한 뒤 `:root`, `html`, `body`에 선언되지 않은 이름을 모두 LESS 전역 변수로 역산했습니다. 이 공식은 전역 토큰에는 맞지만, 컴포넌트 selector에서 선언·상속되는 로컬 custom property와 fallback을 가진 runtime 입력까지 전역 shim 후보로 오분류했습니다.

342는 각 `var()` 참조를 선언 selector, at-rule 조건, 상속 가능한 descendant 경로와 함께 분석합니다. fallback이 있는 참조는 fallback 자체가 유효한 CSS 계약이므로 전역 값이 필요하지 않습니다. 로컬 선언은 같은 대상 selector, 더 일반적인 selector, 또는 상속 가능한 ancestor selector가 모든 참조 branch를 덮는 경우에만 해결된 것으로 판정합니다. 관계없는 selector의 동명 선언이나 다른 media/supports 조건의 선언은 해결로 인정하지 않습니다. 따라서 Popups의 `--pointer-*`, `--x*`, `--y*`는 `.mwe-popups-container`의 원본 컴포넌트 변수로 유지되고, `--mw-file-upright`는 MediaWiki 원본의 `var(--mw-file-upright, 1)` fallback 계약을 유지합니다. 이름별 예외나 하드코딩된 제외 목록은 추가하지 않았습니다.

## v341 잠금 설치 계약 수정

340까지는 bootstrap이 `npm install`을 실행한 뒤 `package-lock.json`의 바이트가 변하지 않았는지 검사했습니다. 그러나 `npm install`은 의존성 집합이 같아도 npm 버전이나 플랫폼의 lock 직렬화 규칙에 따라 잠금 파일을 다시 쓸 수 있으므로, 쓰기 가능한 명령과 바이트 불변성 검사가 충돌했습니다.

341은 배포된 lock을 정확한 설치 입력으로 소비하는 `npm ci`를 루트 도구와 Codex 임시 build-toolchain에 공통 적용합니다. `npm ci`는 기존 `node_modules`를 제거하고 lock에 기록된 정확한 트리를 설치하며 package manifest와 lock이 불일치하면 갱신하지 않고 실패합니다. bootstrap의 lock hash 검사는 그대로 유지되므로 설치 명령이 잠금 파일을 수정하는 회귀도 계속 차단합니다.

## v340 통합 계약과 1차 완료 경계

배포 ZIP 상태에서 `npm run preflight`를 실행할 수 있습니다. 이 검사는 npm 도구 의존성이나 upstream checkout을 먼저 요구하지 않으며, `ORIGIN-MANIFEST.json`의 선언만으로 패키지 버전, 생성 그래프 소유권, Vue/JavaScript 정적 import, 생성 예정 파일과 vendor 입력의 대응, 단일 CSS 진입점 순서를 검증합니다. 생성 파일은 존재한다고 추정하지 않고 `sourceInventory.generatedFiles`에 정확히 선언된 경로만 preflight 해석 대상으로 인정합니다. 따라서 `SkinLegacy.vue`가 선언되지 않은 생성 파일을 import하거나, 포트가 materialize되지 않는 vendor 파일을 참조하면 frontend Rollup 단계보다 먼저 실패합니다.

전체 bootstrap에서는 같은 모듈 그래프 검사를 실제 생성물과 vendor 파일이 모두 존재하는 상태로 다시 실행합니다. JavaScript 구문은 Node의 ECMAScript module parser로 읽으며, 상대 import는 실제 파일 해석 결과와 비교합니다. `node:`, 루트 도구 의존성, thetree의 `~/` alias, Vue runtime만 명시적 외부 경계로 허용됩니다.

더트리 스킨은 페이지마다 ResourceLoader style queue를 주입하는 지점 없이 `css/screen.css` 하나를 정적으로 선택합니다. 따라서 340은 이를 숨기지 않고 `build-time-static` 호스트 한계로 계약화했습니다. 잠긴 MediaWiki lifecycle에서 파생한 `vector-legacy-maximal-page` bundle을 첫 import로 두고, host-only `popups-adapter.css`와 `vector-adapter.css`만 그 뒤에 배치합니다. 모듈별 CSS를 `screen.css`에서 다시 손으로 정렬하거나 페이지 종류를 추정해 조건부 import하지 않습니다.

340은 구조 이식의 1차 통합 경계입니다. 소스·생성 계약 관점의 통합은 완료했지만, 실제 thetree frontend의 SSR/client build와 브라우저 문서군 검증은 사용자 환경의 깨끗한 bootstrap이 성공한 뒤에만 완료 판정할 수 있습니다. 그 검증에서 발견되는 차이는 새 디자인 보정이 아니라 스킨 미이식, thetree host 한계, upstream 확장 기능 차이로 분류해야 합니다.

## v339 parser-output 소유권 분리

일반 문서의 더트리 category DOM은 더 이상 `.mw-parser-output` 내부의 임시 `#catlinks`로 변환되지 않습니다. store-level compiler가 `contentHtml`, `topDocument`, `bottomDocument`의 정확한 category source root에서 anchor-backed CategoryIR을 추출해 skin adapter metadata로 보존하고, 원문 category source는 본문 flow에서 제거합니다. `components/SkinLegacy.vue`의 upstream `html-categories` slot이 구조화된 `$store.state.viewData.categories`를 우선 사용하고, 없을 때만 이 CategoryIR을 사용하므로 catlinks는 MediaWiki와 같은 body-content 바깥 위치에 한 번만 존재합니다. 링크가 없는 비대응 category source는 삭제하지 않고 원문을 보존합니다.

더트리 WikiContent의 `.wiki-content` 클래스는 Vue component identity가 아니라 source-renderer CSS ownership token입니다. parser-output compilation 후에도 이 클래스가 남아 있으면 host `.wiki-content pre`, `.wiki-content sup` 같은 descendant selector가 MediaWiki DOM에 계속 침투합니다. `lib/parserOutput/hostSurface.js`는 실제 Vue-owned element를 교체하지 않고 이 클래스 하나만 제거한 뒤 같은 요소를 `mw-parser-output` root로 승격하며, SPA repaint에서도 같은 변환을 반복합니다. 따라서 `#mw-content-text > .mw-parser-output` 직접 자식 구조가 별도 wrapper 없이 성립합니다. 이에 따라 generic element reset, thumbnail 재작성, notice/infobox/navbox/syntaxhighlight 디자인을 담던 `css/content.css`와 `css/thetree-content.css`를 삭제했습니다. parser-output과 catlinks의 geometry는 생성된 MediaWiki ResourceLoader CSS가 직접 소유합니다.

heading, table, Cite reference, category, clearfix 출력에 붙던 per-node `data-tt-article-compiler`와 `data-tt-vector-parser-bridge` 속성도 제거했습니다. idempotence는 `mw-heading`, `wikitable`, `reference`, `references`, `catlinks` 등 실제 MediaWiki 구조와 source grammar의 비중첩 관계로 판정하며, adapter marker는 host root와 edit-preview local slot처럼 실제 경계에만 남습니다.

## v338 공통 MediaWiki JavaScript 런타임

Vector, Popups, Cite가 소비하는 `mw` 브라우저 계약은 `lib/adapters/thetree-mediawiki/runtime.js` 하나에서 설치됩니다. 이 런타임은 Vector보다 먼저 생성되므로 `util.addPortlet`과 `util.addPortletLink` hook이 초기화 순서 때문에 누락되지 않으며, 스킨 SPA reset 시 Popups·Vector를 먼저 정리한 뒤 마지막에 동일한 `mw` namespace를 복원합니다.

공통 경계는 `mw.config`, `mw.Title`, `mw.hook`, `mw.util`, `mw.loader`, 메시지, storage, user, HTML escape와 idle callback 중 실제 포트가 소비하는 API만 제공합니다. ResourceLoader module 이름이나 thetree 저장소·라우터 접근은 포트 파일로 퍼지지 않습니다. `ext.testKitchen`과 `codex-styles`는 명시적으로 제공되는 모듈이며, 선언되지 않은 module 요청은 실패합니다.

Vector `portlets.js`와 Popups `title.js`는 잠긴 upstream 원문을 bootstrap 생성물로 전환했습니다. `portlets.js`의 hook 제거와 재초기화는 `lib/adapters/thetree-vector/portlets.js`에, 더트리 page config와 reference fragment 변환은 `lib/adapters/thetree-popups/title.js`에 남습니다. 따라서 수동 JavaScript 포트는 10개에서 8개로 줄었고, 원본 행동과 SPA 수명 주기의 경계가 파일 단위로 분리됩니다.

## v337 JavaScript 포트 생성 경계

`javascript-ports` 생성 노드는 잠긴 upstream JavaScript를 행동별로 다시 작성하지 않습니다. CommonJS의 단일 함수 export는 원문 전체를 변경하지 않은 CommonJS 실행 경계 안에 넣고 ESM export만 덧붙이며, 이미 ESM인 기본 함수는 원문에 named export만 추가합니다. Popups renderer의 순수 배치 함수는 함수 선언의 시작점과 균형 잡힌 본문 경계만 찾아 원문 조각을 그대로 생성합니다.

현재 다음 경로가 수동 포트에서 생성물로 전환되었습니다.

- Cite `createReferenceGateway.js`: CommonJS 함수 export → ESM named/default export
- Popups `wait.js`: upstream default export 보존 + named export 추가
- Popups renderer의 `createLayout`, `hasPointerOnImage`, `getClasses`, `getClosestYPosition`: 원본 함수 조각 생성

링크 이벤트 측정은 더트리 이벤트 객체에서 Popups `Measures`를 만드는 실제 호스트 경계이므로 `lib/adapters/thetree-popups/layout.js`에 남습니다. 나머지 10개 수정 포트는 자동 생성 가능한 것처럼 취급하지 않고, 각각의 잠긴 upstream 원문을 `vendorFiles`에 물질화한 뒤 `ORIGIN-MANIFEST.json`에서 `originInputs`, `adapter-required`, 차이 종류를 필수로 선언합니다. jQuery→DOM 변환, SPA 수명 주기, 더트리 응답 모델, MediaWiki Title·message runtime 같은 차이는 다음 adapter 통합 단계의 입력이며, 반복적인 모듈 포맷 변환과 섞이지 않습니다.

## v336 ResourceLoader 변수·메시지 원본 파생

- SkinModule 생성자의 feature별 `lessMessages` 결합을 잠긴 upstream PHP에서 파생합니다.
- 해당 메시지의 영문·한국어 기본값만 MediaWiki i18n 원본에서 생성 카탈로그로 물질화합니다.
- ResourceLoader CSS와 로컬 소비 CSS의 `var()` 폐쇄를 계산하고, 활성 Vector skin의 권위 LESS 변수 환경에서 필요한 값만 평가해 custom-property shim을 생성합니다.
- CSS URL, 메시지 `content`, 문서 루트 selector 변환은 PostCSS AST로 수행합니다.
- 값 목록을 수동 복사한 shim 계약은 제거했습니다.


## v335 SkinModule compatibility 원본 파생

`tools/resource-loader-origin-engine.mjs`는 더 이상 `content-links → content-links-external`, `elements → content-links`, `interface → interface-*` 관계를 로컬 JavaScript 목록으로 보관하지 않습니다. 잠긴 MediaWiki `SkinModule.php`의 `applyFeaturesCompatibility()` 메서드를 제한된 PHP 구조 파서로 읽어, 명시적인 feature 값 전파와 shorthand 전개를 원본 순서의 연산으로 추출합니다. 호환 alias와 기본 feature 목록도 같은 upstream 클래스의 상수에서 계속 파생됩니다.

추출기는 문자열 feature 접근, 조건의 `isset`/`!isset`, 값 복사, `true` 활성화, shorthand 제거를 정확한 구문 관계로 검증합니다. 인식하지 못한 정적 feature 할당, 조건과 할당의 불일치, shorthand 뒤의 `unset` 누락이 있으면 기존 규칙을 임의 적용하지 않고 생성 과정이 중단됩니다. 따라서 MediaWiki가 호환 규칙을 변경하면 스킨의 로컬 하드코딩이 조용히 오래된 동작을 유지하지 않습니다.

## v334 sparse upstream LESS blob 물질화

LESS import 폐쇄에서 동적으로 발견된 upstream 파일은 sparse checkout 작업 트리의 존재 여부가 아니라 잠긴 Git 커밋의 blob을 기준으로 확인하고 물질화합니다. 이에 따라 manifest seed에 직접 열거되지 않은 `print.less` 같은 상대 import도 동일한 원본 경로 공식으로 vendor에 추가되며, 실제 커밋에도 없는 경로만 명시적으로 실패합니다.

## v333 LESS 표준 import 경계

`tools/resource-loader-less.mjs`는 더 이상 정규식으로 `@import` 문을 추출하거나 원본 파일을 문자열로 재귀 인라인하지 않습니다. import 문법·옵션·중첩 위치의 해석은 잠긴 `less` 4.6.7 AST와 import manager가 담당합니다. 프로젝트 코드는 템플릿이나 제품 파일명을 알지 않는 공통 file manager로 현재 파일 기준 경로, 계약의 import path, 정확한 alias를 순서대로 해석하고 원본 파일을 공급합니다.

ResourceLoader 모듈의 prelude와 entrypoint는 하나의 가상 LESS 진입 파일에서 표준 `@import (less)`로 연결됩니다. 이에 따라 `(reference)`, `(inline)`, `(optional)`, media 조건 및 Less가 정하는 중복 import 의미를 자체 전개기가 다시 구현하지 않습니다. 부트스트랩의 vendor LESS 폐쇄도 같은 Less AST로 import 노드를 읽고 같은 경로 resolver를 사용하므로, 물질화 단계와 실제 컴파일 단계가 서로 다른 import 문법을 갖지 않습니다. CSS로 유지되는 일반 `@import`는 vendor 폐쇄에 포함하지 않으며, 변수 기반 import나 Less plugin import처럼 정적인 파일 대응을 만들 수 없는 입력은 임의 추정하지 않고 물질화 단계에서 명시적으로 중단합니다.

## v332 Mustache 입력·출력 관계

Mustache 생성 노드는 각 생성 Vue 파일의 직접 원본 템플릿과 직접 partial 의존성을 `ORIGIN-MANIFEST.json`에 기록합니다. `tools/mustache-vue-origin-engine.mjs`가 실제 AST에서 같은 관계를 산출하고, 기존 `tools/generate-origin.mjs`가 선언과 생성 결과를 비교하므로 출력 파일 이름만 맞고 다른 템플릿을 소비하거나 partial 간선이 달라진 상태는 통과하지 않습니다.

partial 이름은 `includes/templates` 루트에 대한 정확한 논리명으로만 해석합니다. 같은 basename을 가진 파일이 하나뿐이라는 이유로 다른 디렉터리의 파일을 선택하던 fallback은 제거했습니다. 따라서 `{{>Dropdown/Open}}`은 정확히 `Dropdown/Open.mustache`에 대응하며, `{{>Open}}`을 보고 임의로 그 파일을 선택하지 않습니다. 템플릿 이름에 따른 분기나 파일별 partial 목록은 생성기 코드에 없으며, manifest의 관계는 upstream 입력 변화가 기존 생성 계약과 다른지를 검출하는 생성 그래프의 일부입니다.

## v331 소스 역할 계약

`ORIGIN-MANIFEST.json`은 upstream 입력과 생성 출력뿐 아니라 배포 ZIP의 모든 로컬 소스 파일도 분류합니다. 로컬 파일은 `package-metadata`, `skin-integration`, `host-adapter`, `parser-output-adapter`, `origin-runtime`, `generation-tool`, `generation-contract`, `upstream-build-contract` 중 하나로 선언되며, 더트리 호스트 의존 여부도 함께 기록됩니다. 수정 소스 포트는 `source-port`로 유지하되 원본 한 파일과의 일대일 대응, 원본 한 파일에서 분리된 조각, 여러 원본 파일을 합친 로컬 집계 중 어느 관계인지 명시합니다.

이 계약은 별도 감사 도구가 아니라 기존 `tools/generate-origin.mjs`의 생성 전제입니다. `npm run generate`와 `npm run generate:check`는 생성물·런타임 자산·작업 디렉터리를 제외한 실제 배포 소스와 `localFiles`·`portedFiles`의 합집합이 정확히 일치하는지 먼저 확인합니다. 따라서 새 로컬 파일을 추가할 때는 그 파일의 역할을 같은 manifest에 선언해야 하며, 선언만 있고 파일이 없거나 파일은 있는데 역할이 없으면 생성 과정이 중단됩니다.

Popups 문서 데이터 요청은 더트리 `Common.internalRequest` capability를 주입받아 사용합니다. 스킨은 더트리 내부 전송 URL, 헤더, 압축 또는 응답 디코딩 방식을 재구현하지 않고 구조화된 응답을 Popups 모델로 변환하는 역할만 담당합니다.

## ResourceLoader 페이지 로드 큐

개별 ResourceLoader 모듈 CSS의 생성 순서와 페이지에서의 최종 cascade 순서는 서로 다른 계약입니다. 현재 `css/screen.css`는 `skins.vector.styles.legacy`, `ext.DarkMode.styles`, Popups, Cite 같은 upstream 모듈명을 직접 나열하지 않습니다.

`contracts/resource-loader-origin-contract.json`의 `pageStyleQueue`가 잠긴 upstream에서 다음 큐 입력을 읽습니다.

- Cite parser hook의 `ParserOutput::addModuleStyles()`
- DarkMode `BeforePageDisplay` hook의 `OutputPage::addModuleStyles()`
- Vector `ValidSkinNames.vector.args[].styles`
- Popups의 `mw.loader.using()` 요청과 Cite의 Popups plugin module 속성
- MediaWiki core의 on-demand `codex-styles` 모듈 정의

생성기는 잠긴 MediaWiki `OutputPage::output()`에서 `loadSkinModules()`가 `onBeforePageDisplay()`보다 먼저 호출되는지 검사하여 enqueue 단계를 재현합니다. 이어 잠긴 `ClientHtml::makeLoad()`에서 `sort( $modules )`가 source/group 분할보다 먼저 수행되는지도 검사하고, 같은 알고리즘으로 head style 모듈을 이름순 정렬한 뒤 ResourceLoader source와 group별로 묶어 `css/vendor/resource-loader/page-styles.css`를 만듭니다. 따라서 enqueue 순서와 최종 CSS cascade 순서를 같은 것으로 취급하지 않습니다. 호출 순서 검증은 동일한 토큰이 debug 분기와 일반 분기에 반복될 수 있음을 고려하여, 각 토큰을 직전 토큰 뒤에서 찾는 ordered-subsequence 방식으로 수행합니다.

현재 head-only-styles 배치는 `ext.DarkMode.styles → ext.cite.styles → skins.vector.styles.legacy` 순서로 직렬화됩니다. Popups처럼 클라이언트에서 요청되는 배치는 기존 ResourceLoader 의존성 순서로 별도 처리하며, 호스트 변수 shim은 ResourceLoader 배치 밖의 prelude로 유지됩니다. 동일 모듈은 최초 출력 위치에서 한 번만 직렬화되고, `css/screen.css`는 계산된 `page-styles.css` 하나 뒤에만 더트리 호스트 어댑터를 로드합니다.

현재 정적 스킨 번들은 문서 종류와 런타임 동작을 모두 포괄하는 `vector-legacy-maximal-page` 프로필을 사용합니다. 조건부 모듈을 모든 페이지에 포함하는 것은 더트리의 단일 정적 CSS 엔트리 제약입니다. 다만 각 배치 안의 순서는 MediaWiki의 해당 로더 단계에 대응하며, lifecycle 단계명을 그대로 cascade 순서로 사용하는 방식은 이전 판부터 제거했습니다.

## ResourceLoader 변환 경계

`tools/resource-loader-origin-engine.mjs`는 Vector, Popups, Cite 같은 제품 이름으로 컴파일 로직을 분기하지 않습니다. `skin.json`, `extension.json`, PHP에서 추출한 동적 모듈 등록 및 Codex manifest를 동일한 모듈 그래프로 읽습니다. 새 스타일 파일은 upstream 모듈 메타데이터에 포함되는 것으로 발견되며, 파일별 생성 함수나 모듈별 JavaScript 생성기를 추가하지 않습니다. 부트스트랩의 vendor 물질화도 파일명 예외 목록을 사용하지 않고, 선언된 LESS seed의 로컬 import 폐쇄를 `tools/resource-loader-less.mjs`와 같은 import 문법·해석 규칙으로 계산합니다. 더트리 문서 표면의 소유권 차이는 `contracts/resource-loader-origin-contract.json`의 제한된 호스트 경계 선언으로만 표현됩니다.


## 생성 오케스트레이션 경계

`npm run generate`와 `npm run generate:check`는 모두 `tools/generate-origin.mjs` 하나만 실행합니다. 하위 파일은 독립 명령이 아니라 문법·자산 종류별 엔진 모듈이며, 실행 순서와 의존 관계는 `ORIGIN-MANIFEST.json`의 `generation.nodes`에서 위상 정렬됩니다. 출력 파일에는 생성기 파일 경로를 반복 기록하지 않고 논리적 `originNode`만 기록하므로 도구 파일을 이동해도 입력·출력 대응 계약은 변하지 않습니다. 새 파일이나 ResourceLoader 모듈이 늘어나도 오케스트레이터 코드는 늘어나지 않으며, 새로운 입력 형식 자체가 추가될 때만 엔진 종류가 추가됩니다.
