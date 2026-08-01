# thetree-skin-minerva

the tree용 MediaWiki MinervaNeue 단독 스킨입니다. Minerva의 반응형 DOM과 스타일을 그대로 사용하므로 모바일과 데스크톱을 한 스킨으로 지원합니다.

현재 목표는 Vector/레거시와 합치기 전, Minerva 자체를 독립적으로 완성하고 검증하는 것입니다.

## 원본과 생성 방식

- MinervaNeue `REL1_46` commit `80301ab22e4fd51d72c0b511ea1d8dc33007a5fb`
- MediaWiki core `REL1_46` commit `94b1bc0df0d57a470404266bed914f8584ead52f`
- Wikimedia Codex `v2.3.1` commit `451588b3ed4e610a50b9b656ef528898e049bb2f`
- Mustache 템플릿은 `components/`의 Vue 컴포넌트로 기계 변환
- ResourceLoader LESS, Codex 컴포넌트 CSS, ImageModule 및 아이콘 팩은 `css/vendor/`로 기계 생성
- Minerva의 조건부 스타일 목록은 `SkinMinerva.php`의 `$styles[]` 선언에서 자동 추출
- upstream checkout, vendor 및 생성 결과는 배포 소스에 포함하지 않고 `npm run bootstrap`으로 재현

the tree 고유의 라우트, 세션, ACL, 검색, 설정 및 테마 상태는 `lib/`의 호스트 어댑터에서만 변환합니다. Minerva가 소유하는 DOM을 어댑터에서 다시 작성하지 않습니다.

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

이 브랜치는 Minerva 단독 배포 단위입니다. 이후 레거시/Vector와 합칠 때도 생성된 Minerva DOM과 CSS는 그대로 유지하고, 어느 스킨을 활성화할지 결정하는 선택 계층만 상위에 추가하는 것을 원칙으로 합니다.

## 라이선스

GPL-2.0-or-later. 자세한 원본 및 제3자 고지는 `NOTICE`, `THIRD_PARTY_NOTICES.md`, `ORIGIN-MANIFEST.json`을 참고하세요.
