# thetree-skin-minerva

the tree용 MediaWiki MinervaNeue 단독 스킨입니다. Minerva의 반응형 DOM과 스타일을 그대로 사용하므로 모바일과 데스크톱을 한 스킨으로 지원합니다.

이 저장소는 독립 `minerva` 스킨으로 직접 설치할 수 있으며, `thetree-skin-vector`의 기본 bootstrap이 잠긴 커밋을 내려받아 내부 모바일 변형으로 조합할 수도 있습니다. 어느 방식이든 Minerva 자체 bootstrap과 검증 절차는 이 저장소가 소유합니다.

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

이 저장소는 Minerva 단독 배포 단위입니다. 최상위 `layout.vue`는 단독 스킨 진입점이고, `components/MinervaVariantLayout.vue`는 다른 스킨이 조합할 수 있는 진입점입니다. Vector 통합본은 이 저장소의 잠긴 커밋을 자체 생성 디렉터리에 체크아웃한 다음 여기의 `npm run bootstrap`을 실행하므로, Minerva 소스나 생성 결과를 Vector 저장소에 직접 복사하지 않습니다.

통합 여부와 기기 선택은 Vector의 상위 선택 계층이 담당합니다. Minerva DOM과 CSS, 호스트 어댑터 및 독립 `minerva` 스킨 등록은 그대로 유지됩니다.

호스트 연결은 세 경계로 나뉩니다.

- `lib/thetreeHostFeatureCatalog.js`, `lib/thetreeHostPageContract.js`: 스킨과 무관한 the tree 기능·페이지 사실
- `lib/minervaHostAdapterPolicy.js`: 그 기능을 잠긴 Minerva 메뉴와 페이지 동작에 투영하는 선언적 정책
- `lib/minervaTheTreeAdapter.js`, `lib/minervaSkinData.js`: 정책을 원본 Minerva 템플릿 데이터로 직렬화하는 어댑터

문서별 언어 링크는 호스트 데이터가 제공할 때만 활성화됩니다. 일반 문서에서 링크가 없을 때 버튼을 항상 남기는 원본 옵션은 기본적으로 끄며, 다음 설정으로 원본 Minerva 동작을 선택할 수 있습니다.

- `skin.minerva.always_show_language_button`: 일반 문서에 비활성 언어 버튼을 항상 표시
- `skin.minerva.hide_interlanguage_links`: 언어 버튼을 전역에서 숨김

## 라이선스

GPL-2.0-or-later. 자세한 원본 및 제3자 고지는 `NOTICE`, `THIRD_PARTY_NOTICES.md`, `ORIGIN-MANIFEST.json`을 참고하세요.
