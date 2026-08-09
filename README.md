# thetree-skin-minerva

the tree용 MediaWiki MinervaNeue 단독 스킨입니다. Minerva의 반응형 DOM과 스타일을 그대로 사용하며, 선택적인 `thetree-plugin-mobilefrontend`로 MediaWiki MobileFrontend의 모바일 검색·문단·기능 프로필을 활성화할 수 있습니다.

이 저장소는 독립 `minerva` 스킨으로 직접 설치할 수 있으며, `thetree-skin-vector`의 기본 bootstrap이 `main`의 최신 커밋을 내려받아 내부 모바일 변형으로 조합할 수도 있습니다. 어느 방식이든 Minerva 자체 bootstrap과 검증 절차는 이 저장소가 소유합니다.

> [!WARNING]
> 아직 미완성이므로 사용을 권장하지 않습니다.

## 요구 사항

- Node.js 20.19.1 이상
- npm 10.8.2 이상
- Git 및 GitHub 네트워크 접근
- the tree 스킨 빌드 환경

## 준비와 검증

```bash
npm run bootstrap
npm run check
```

완전한 콜드 재생성은 다음과 같습니다.

```bash
npm run bootstrap -- --clean
```

기본 bootstrap은 `UPSTREAM-LOCK.json`의 exact commit만 사용합니다. 움직이는 `REL1_46` 헤드를 반영하려면 명시적으로 `--refresh`를 사용해야 합니다.

```bash
npm run bootstrap -- --refresh
```

## 통합 방향

이 저장소는 Minerva 단독 배포 단위입니다. 최상위 `layout.vue`는 단독 스킨 진입점이고, `components/MinervaVariantLayout.vue`는 다른 스킨이 조합할 수 있는 진입점입니다. Vector 통합본은 이 저장소의 해석된 최신 커밋을 자체 생성 디렉터리에 체크아웃한 다음 여기의 `npm run bootstrap`을 실행하므로, Minerva 소스나 생성 결과를 Vector 저장소에 직접 복사하지 않습니다.

통합 여부와 스킨 선택은 Vector의 상위 선택 계층이 담당합니다. `thetree-plugin-mobilefrontend`가 없으면 독립 Minerva는 MobileFrontend가 없는 기본 모드로 동작합니다. 플러그인이 설치된 모바일 요청에서는 `page.data.thetreeMobileFrontend` 계약에 따라 전체 화면 검색, 최상위 문단 접기와 Minerva 모바일 기능 프로필을 활성화합니다.

```bash
cd /path/to/thetree/plugins
git clone https://github.com/WikinLab/thetree-plugin-mobilefrontend.git thetree-plugin-mobilefrontend
```

호스트 연결은 세 경계로 나뉩니다.

- `lib/thetreeHostFeatureCatalog.js`, `lib/thetreeHostPageContract.js`: 스킨과 무관한 the tree 기능·페이지 사실
- `lib/minervaHostAdapterPolicy.js`: 그 기능을 잠긴 Minerva 메뉴와 페이지 동작에 투영하는 선언적 정책
- `lib/minervaTheTreeAdapter.js`, `lib/minervaSkinData.js`: 정책을 원본 Minerva 템플릿 데이터로 직렬화하는 어댑터

the tree와 MediaWiki의 언어 링크 엔진 차이 때문에 언어 아이콘은 Minerva의 숨김 기능이 켜진 상태를 기본값으로 사용합니다. 향후 호스트가 호환 언어 링크 데이터를 제공하는 환경에서는 다음 설정으로 명시적으로 원본 동작을 선택할 수 있습니다.

- `skin.minerva.hide_interlanguage_links: false`: 언어 버튼과 제공된 언어 링크를 다시 표시
- `skin.minerva.always_show_language_button: true`: 위 숨김을 해제한 상태에서 링크가 없는 일반 문서에도 비활성 언어 버튼을 표시

## 라이선스

GPL-2.0-or-later. 자세한 원본 및 제3자 고지는 `NOTICE`, `THIRD_PARTY_NOTICES.md`, `ORIGIN-MANIFEST.json`을 참고하세요.
