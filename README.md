# thetree-skin-minerva

the tree용 MediaWiki MinervaNeue 스킨입니다.

## 주요 기능

- MediaWiki MinervaNeue 디자인
- 데스크톱과 모바일 반응형 화면
- 모바일 전용 검색 화면과 좌측 메뉴
- the tree의 문서 도구, 검색과 사용자 메뉴
- 로그인 사용자의 문서 주시 및 해제
- MobileFrontend 플러그인과 Skin Composer 지원

## 요구 사항

- the tree 관리자 계정의 `developer` 권한
- Node.js 20.19.1 이상과 npm 10.8.2 이상
- Git이 설치되어 있고 GitHub에 접속할 수 있는 서버
- the tree 설치 서버의 명령줄 접근 권한

모바일 요청에 MobileFrontend 기능을 적용하려면 [`thetree-plugin-mobilefrontend`](https://github.com/WikinLab/thetree-plugin-mobilefrontend)를 함께 설치합니다.

## 설치

1. the tree에서 **관리자 → 개발자 설정 → 스킨**으로 이동합니다.
2. 이름에 `minerva`, URL에 `https://github.com/WikinLab/thetree-skin-minerva`를 입력하고 **추가**를 누릅니다.
3. the tree 설치 디렉터리에서 다음 명령을 실행합니다.

   ```sh
   cd frontend/skins/minerva
   npm run bootstrap
   ```

4. 관리자 화면의 `minerva` 항목에서 **빌드**를 누릅니다.
5. 관리자 설정에서 기본 스킨을 `minerva`로 지정하거나 사용자 설정에서 `minerva`를 선택합니다.

## 설정

| 설정 키 | 설명 | 기본값 |
| --- | --- | --- |
| `skin.minerva.site_notice` | 페이지 상단 공지 HTML | `wiki.sitenotice` |
| `skin.minerva.footer_html` | 푸터에 표시할 HTML | `wiki.footer_text` |
| `skin.minerva.theme_color` | 밝은 화면의 테마 색상 | `#ffffff` |
| `skin.minerva.tagline` | 문서 제목 아래 문구 | 빈 값 |
| `skin.minerva.logo_wordmark` | 헤더 wordmark 이미지 URL | 위키 이름 텍스트 |
| `skin.minerva.logo_wordmark_width` | wordmark의 픽셀 너비 | 빈 값 |
| `skin.minerva.logo_wordmark_height` | wordmark의 픽셀 높이 | 빈 값 |
| `skin.minerva.hide_interlanguage_links` | 언어 메뉴 숨김 여부 | `true` |
| `skin.minerva.always_show_language_button` | 언어 목록이 빈 경우의 언어 버튼 표시 여부 | `false` |

헤더 이미지는 `skin.minerva.logo_wordmark`, `skin.minerva.logo_wordmark_width`, `skin.minerva.logo_wordmark_height` 세 값을 함께 설정하여 사용합니다.

## 업데이트

1. **관리자 → 개발자 설정 → 스킨 → minerva**에서 **업데이트**를 누릅니다.
2. `frontend/skins/minerva`에서 `npm run bootstrap`을 실행합니다.
3. 같은 화면에서 **빌드**를 누릅니다.

## 문제 해결

생성 파일이나 내려받은 원본 때문에 부트스트랩이 실패하면 다음 명령으로 다시 준비합니다.

```sh
npm run bootstrap -- --clean
```

Windows에서 `Filename too long` 오류가 나오면 관리자 권한 터미널에서 Git의 긴 경로 지원을 활성화한 뒤 다시 실행합니다.

```sh
git config --system core.longpaths true
```

## 면책

이 스킨을 사용하면서 발생하는 문제에 대해서는 책임지지 않습니다.

## 개발 도구

이 프로젝트의 개발에는 OpenAI ChatGPT가 사용되었습니다.

## 버전과 라이선스

현재 버전은 `package.json`에서 확인할 수 있습니다.

이 프로젝트는 GPL-2.0-or-later로 배포됩니다. 원본과 제3자 저작권 고지는 `NOTICE`와 `THIRD_PARTY_NOTICES.md`에서 확인할 수 있습니다.
