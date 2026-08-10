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
- 모바일 검색은 잠긴 MediaWiki `TypeaheadSearchWrapper.vue`·`App.vue` 구조를 the tree 검색 API와 라우터에 연결합니다.
- 플러그인은 신호만 공급하며 Minerva DOM이나 메뉴를 만들지 않습니다.

언어 기능은 원본 옵션 의미를 그대로 따릅니다. `skin.minerva.hide_interlanguage_links=true`이면 원본과 같이 언어 항목 자체가 없어져 별이 첫 항목으로 이동합니다. 언어 링크가 없을 때 비활성 언어 버튼을 남기려면 숨김을 해제하고 `skin.minerva.always_show_language_button=true`를 사용합니다.

## 생성과 검증

```sh
npm ci
npm run bootstrap
```

`UPSTREAM-LOCK.json`은 정확한 Git 커밋을 고정합니다. 부트스트랩은 잠긴 객체에서 `vendor/`를 물질화하고 Mustache Vue 컴포넌트, ResourceLoader CSS, Minerva 기능 프로필을 재생성한 뒤 계약 검사를 실행합니다. `vendor/`, `.upstream/`, `css/vendor/`, `lib/generated/`, `node_modules/`는 배포 소스에 포함하지 않습니다.

## 설정 키

- `skin.minerva.site_notice`
- `skin.minerva.footer_html`
- `skin.minerva.theme_color`
- `skin.minerva.tagline`
- `skin.minerva.hide_interlanguage_links`
- `skin.minerva.always_show_language_button`

`wiki.lang`, `wiki.dir`, `wiki.footer_text`, `wiki.site_name`, `wiki.front_page` 같은 호스트 공용 키도 사용합니다. 다른 스킨의 네임스페이스는 폴백으로 읽지 않습니다.

## 컴포저

`COMPOSABLE-SKIN.json`은 범용 `thetree-skin-composer`가 읽는 진입점·설정 네임스페이스·본문 소유권·라이선스 계약입니다. 독립 설치와 컴포저 자식 설치는 같은 `components/MinervaVariantLayout.vue`를 사용합니다.

라이선스는 GPL-2.0-or-later이며 정확한 원본과 제3자 고지는 `NOTICE`, `THIRD_PARTY_NOTICES.md`, `ORIGIN-MANIFEST.json`에 기록됩니다.
