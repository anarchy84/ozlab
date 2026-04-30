# 광고 UTM 표준 네이밍 가이드 — 오즈랩페이

> 광고대행사·내부 광고 운영자 필독
>
> 모든 광고 URL에 아래 표준대로 utm 파라미터를 박아주셔야 어드민 대시보드에서 자동 분류·매칭됩니다.
> 표준을 안 따르면 "어디서 신청 들어왔는지" 절반만 보입니다.

---

## 왜 필요한가요?

오즈랩페이 어드민에는 자동 어트리뷰션 시스템이 있어 신청 1건마다 다음 정보가 자동으로 분류됩니다:

- **매체** (광고 / 검색 / 외부 블로그 / 자체 블로그 / 직접 진입)
- **캠페인명**
- **키워드** (검색 키워드 또는 광고 키워드)
- **광고 소재명**
- **랜딩 페이지** (자체 블로그 글이면 글 제목까지)

이 분류는 utm 파라미터가 정확히 박혀야 작동합니다. 안 박으면 어드민에서 "직접 진입" 또는 "분류 불가"로 묶여서 ROI 계산이 망가집니다.

---

## 표준 utm 5종 의미

| 파라미터 | 무엇을 채우나 | 예시 |
|---|---|---|
| **utm_source** | 매체 사이트 (소문자 영문) | `naver`, `google`, `meta`, `kakao`, `daangn`, `youtube` |
| **utm_medium** | 광고 형식 — `-ads` 들어가야 광고로 자동 분류 | `search-ads`, `display-ads`, `cpc`, `social-ads` |
| **utm_campaign** | 캠페인 식별자 (캠페인 단위) | `brand-2026q2`, `performance-may`, `spring-sale` |
| **utm_term** | 입찰 키워드 또는 검색어 | `카드단말기-0원`, `네이버페이-단말기` |
| **utm_content** | 광고 소재명/ID (A/B 테스트 시 필수) | `hero-A`, `hero-B`, `banner-v3`, `ad12345` |

> ⚠️ **Source는 항상 소문자 영문으로**. `Naver`, `NAVER`, `네이버` ❌ → `naver` ✅
>
> ⚠️ **공백·한글은 utm_term, utm_campaign 에만 허용**. 가급적 영문 케밥케이스 추천.

---

## 매체별 셋업 표준

### 1. 네이버 검색광고 (파워링크)

```
https://ozlabpay.kr/?utm_source=naver
                    &utm_medium=search-ads
                    &utm_campaign=brand-2026q2
                    &utm_term={keyword}
                    &utm_content={creative}
```

- `{keyword}` / `{creative}` 는 ValueTrack 자동 치환 변수 (네이버 검색광고 → "추적용 URL 매개변수" 메뉴에서 설정)
- 셋업 한 번 해두면 광고그룹별 키워드/소재가 자동으로 박힘

### 2. 네이버 GFA / 플레이스 광고 (디스플레이)

```
?utm_source=naver
&utm_medium=display-ads
&utm_campaign=gfa-may-2026
&utm_term={타겟명}        ← 수동 (예: 30대-자영업자)
&utm_content={배너ID}      ← 수동 (예: banner-v3)
```

### 3. 구글 검색광고 (Google Ads)

```
?utm_source=google
&utm_medium=search-ads
&utm_campaign=performance-2026q2
&utm_term={keyword}
&utm_content={creative}
```

- Google Ads → "공유 라이브러리" → "URL 옵션" → "추적 템플릿"에 위 형식 등록 (캠페인·광고그룹 단위 일괄 적용)
- `{keyword}` `{creative}` `{matchtype}` 등 [Google ValueTrack](https://support.google.com/google-ads/answer/6305348) 자동 치환

> ⚠️ 구글 organic 검색은 referer에 키워드가 절대 안 옴 (Google 정책). 어드민에는 `(not provided)` 표시됩니다. → 구글 organic 키워드는 **Google Search Console** 에서 별도 조회.

### 4. 구글 디스플레이 / 유튜브 광고

```
?utm_source=google
&utm_medium=display-ads          ← 또는 video-ads
&utm_campaign=youtube-launch
&utm_content={creative}
```

### 5. 메타 광고 (페이스북·인스타그램)

```
?utm_source=meta
&utm_medium=cpc                  ← Meta 자동 권장 medium
&utm_campaign={{campaign.name}}
&utm_term={{adset.name}}         ← 오디언스명
&utm_content={{ad.name}}         ← 광고 소재명
```

- Meta Ads Manager → 광고 셋업 시 URL 매개변수에 `{{campaign.name}}` 등 [Dynamic URL Parameter](https://www.facebook.com/business/help/2360940870872492) 입력
- 캠페인 이름 자체에 한글 가능 (어드민에서 그대로 표시)

### 6. 카카오 모먼트

```
?utm_source=kakao
&utm_medium=display-ads
&utm_campaign=spring-sale-2026
&utm_term={타겟명}
&utm_content={배너버전}
```

### 7. 카카오 톡채널 / 카카오톡 홍보

```
?utm_source=kakao
&utm_medium=kakaotalk             ← '광고'가 아닌 '메시지'
&utm_campaign=newsletter-may
&utm_content=msg-v2
```

### 8. 당근 비즈프로필 / 광고

```
?utm_source=daangn
&utm_medium=local-ads
&utm_campaign=seoul-gangnam-2026q2
&utm_term=강남구
&utm_content=banner-A
```

### 9. 유튜브 동영상 (광고 외 — 영상 설명란 링크)

```
?utm_source=youtube
&utm_medium=video                 ← 광고 아님 → -ads 빼야 organic 으로 분류
&utm_campaign=tutorial-launch
&utm_content=video-id-abc123
```

### 10. 블로거 협찬 / 인플루언서

```
?utm_source=blogger
&utm_medium=referral              ← 협찬은 cpc 아님 (단, 광고비 들어가면 cpc 표기 가능)
&utm_campaign=influencer-may
&utm_term=블로거명
&utm_content=글ID
```

---

## 어드민에 어떻게 보이는지

| utm_medium 키워드 | 어드민 분류 | 색상 |
|---|---|---|
| `*-ads`, `*ads`, `cpc`, `paid-*` | **광고** | 보라 |
| `search` (organic) | 검색 자연 유입 | 파랑 |
| `social`, `referral` | 외부 레퍼럴 | 주황 |

예시:
- utm_source=naver + utm_medium=search-ads → "네이버 광고" 보라 배지
- utm_source=naver (utm_medium 없음) → "naver" 그대로 표시 (광고인지 모름)

> 💡 **결론** : utm_medium 에 반드시 `-ads` 또는 `cpc` 들어가게 하세요. 광고/organic 구분의 단 하나 신호입니다.

---

## 자주 틀리는 실수 5가지

1. **utm_source 한글 입력** — `?utm_source=네이버` ❌ → 분류 깨짐
2. **utm_source 대문자 혼용** — `Naver`, `NAVER`, `naver` 모두 다른 매체로 카운트됨
3. **utm_medium 누락** — utm_source 만 있고 medium 없으면 광고/organic 구분 불가
4. **공백** — `?utm_source=naver search ads` ❌ → URL 인코딩 깨짐. 케밥케이스 `naver-search-ads` ✅
5. **utm_term/utm_content 미사용** — 캠페인 단위만 있고 키워드·소재 없으면 A/B 비교 불가

---

## 테스트 방법

1. 위 표준대로 URL 만들기:
   ```
   https://ozlabpay.kr/?utm_source=naver&utm_medium=search-ads&utm_campaign=test&utm_term=테스트키워드&utm_content=hero-test
   ```
2. 시크릿 창에서 그 URL 열기 → 신청 폼 작성·제출
3. 어드민 → 상담 신청 → 방금 들어온 행 클릭 → 모달 상단 "🎯 유입 출처" 카드 확인
4. 보라 배지로 "네이버 광고" + 캠페인 `test` + 키워드 `테스트키워드` + 소재 `hero-test` 가 정확히 박히는지 검증

---

## URL 길이 주의

브라우저는 URL 2,000자 제한. utm 파라미터 다 박으면 보통 200~300자 추가됨. 충분히 안전하지만 너무 긴 utm_campaign 명은 50자 이내로 권장.

---

## 광고대행사 핸드오프 체크리스트

신규 광고 캠페인 셋업 의뢰 시 광고대행사에 전달:

- [ ] 매체별 utm 표준 (이 문서)
- [ ] 캠페인명 작명 규칙 합의 (예: `매체-목적-시기` → `naver-performance-2026q2`)
- [ ] ValueTrack / Dynamic URL 변수 셋업 확인 (네이버·구글·메타)
- [ ] 셋업 완료 후 테스트 URL 1개 받아서 어드민에서 검증
- [ ] 라이브 1주일 후 어드민 대시보드 매체별 분포 같이 점검

---

**문서 버전** : v1.0 (2026-04-30)
**문의** : 운영팀 / 마케팅팀
