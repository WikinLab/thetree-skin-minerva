# thetree-skin-minerva

잠긴 MediaWiki 1.46·MinervaNeue 원본을 the tree에 구조적으로 이식한 독립 스킨입니다. Mustache 부분 템플릿과 ResourceLoader 선언을 변환기가 해석하며, 생성 결과는 직접 수정하지 않습니다.

## 소유 경계

- Minerva는 헤더, 메뉴, 페이지 액션, 제목·탭·푸터 등 스킨 크롬을 소유합니다.
- `#mw-content-text[data-tt-host-content="1"]` 안의 `<nuxt/>` 본문은 the tree가 소유합니다.
- 접기·펼치기, 목차, 문단 편집 등 the tree 본문 동작은 이 스킨이 변환하지 않습니다.
- MediaWiki식 본문 투영이 필요한 배포는 별도 projection 계층을 사용해야 합니다.
- 경로, 권한, 세션, 검색 API와 설정 모달만 `lib/adapters/` 및 명시된 호스트 어댑터가 연결합니다.

## MobileFrontend 계약

이 스킨은 `page.data.thetreeMobileFrontend`의 `thetree-mobilefrontend/v1` 계약을 읽습니다.

- 신호가 없으면 MobileFrontend 확장 기능이 없는 데스크톱 Minerva의 `SkinOptions` 기본값을 사용합니다.
- `mode: "mobile"`이면 잠긴 `skin.json`의 base/loggedin 프로필과 `SkinOptions.php`의 사용자 문서·diff 예외를 사용합니다.
- 데스크톱과 모바일 검색은 동일하게 잠긴 MediaWiki `TypeaheadSearchWrapper.vue`·`App.vue`와 그 Codex 의존 그래프를 사용합니다. 어댑터는 `/Complete` 결과·URL·라우터와 원본의 지연 마운트 수명주기만 공급하며, 검색 행·아이콘·메뉴 DOM은 만들지 않습니다.
- 플러그인은 신호만 공급하며 Minerva DOM이나 메뉴를 만들지 않습니다.

언어 기능은 원본 옵션 의미를 그대로 따릅니다. `skin.minerva.hide_interlanguage_links=true`이면 원본과 같이 언어 항목 자체가 없어져 별이 첫 항목으로 이동합니다. 언어 링크가 없을 때 비활성 언어 버튼을 남기려면 숨김을 해제하고 `skin.minerva.always_show_language_button=true`를 사용합니다.

## 생성과 검증

```sh
npm ci
npm run bootstrap
```

`UPSTREAM-LOCK.json`은 정확한 Git 커밋을 고정합니다. 기본 부트스트랩은 잠긴 객체에서 `vendor/`를 물질화하고 Mustache Vue 컴포넌트, ResourceLoader CSS, MediaWiki Vue SFC와 CommonJS 의존 그래프, Minerva 기능 프로필을 재생성합니다. 개발·CI의 전체 계약 검증은 `npm run bootstrap:verify` 또는 `npm run check`로 실행합니다. 같은 잠금·계약·도구 버전에서는 같은 바이트 결과를 내며, `vendor/`, `.upstream/`, `css/vendor/`, `lib/generated/`, `node_modules/`는 배포 소스에 포함하지 않습니다.

## 설정 키

- `skin.minerva.site_notice`
- `skin.minerva.footer_html`
- `skin.minerva.theme_color`
- `skin.minerva.tagline`
- `skin.minerva.logo_wordmark` — 원본 `data-logos.wordmark.src`에 대응하는 이미지 URL
- `skin.minerva.logo_wordmark_width` — 원본 wordmark의 필수 픽셀 너비
- `skin.minerva.logo_wordmark_height` — 원본 wordmark의 필수 픽셀 높이
- `skin.minerva.hide_interlanguage_links`
- `skin.minerva.always_show_language_button`

`wiki.lang`, `wiki.dir`, `wiki.footer_text`, `wiki.site_name`, `wiki.front_page`, `wiki.logo_url` 같은 호스트 공용 키도 사용합니다. `wiki.logo_url`은 MediaWiki의 레거시 `$wgLogo`와 같은 `data-logos["1x"]`에 대응하며 Minerva 헤더 wordmark로 승격하지 않습니다. 헤더 이미지는 전용 wordmark URL·width·height 세 키가 모두 있을 때만 원본 `Logo.mustache`에 공급하고, 크기는 MediaWiki의 `SkinModule::getRelativeSizedLogo()`와 같이 16px 기준 `em`으로 생성합니다. 다른 스킨의 네임스페이스는 폴백으로 읽지 않습니다.

## 컴포저

`COMPOSABLE-SKIN.json`은 범용 `thetree-skin-composer`가 선택적으로 읽는 진입점·설정 네임스페이스·본문 소유권·라이선스 metadata입니다. 스킨 런타임이나 단독 빌드는 이 파일을 import하지 않으므로 독립 설치에 영향이 없습니다. 독립 설치와 컴포저 자식 설치는 같은 `components/MinervaVariantLayout.vue`를 사용합니다.

라이선스는 GPL-2.0-or-later이며 정확한 원본과 제3자 고지는 `NOTICE`, `THIRD_PARTY_NOTICES.md`, `ORIGIN-MANIFEST.json`에 기록됩니다.
