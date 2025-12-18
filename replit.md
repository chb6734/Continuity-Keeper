# MedBridge - 진료 연속성 서비스

## 개요
MedBridge는 환자가 이전 진료 정보를 새로운 의료기관의 의료진에게 쉽게 전달할 수 있도록 돕는 웹 애플리케이션입니다. 처방전과 조제기록 사진에서 AI를 활용해 약물 정보를 추출하고, 환자가 입력한 증상 및 경과 정보와 함께 의료진용 요약 페이지를 생성합니다.

## 주요 기능
- **병원 선택**: 방문할 병원/의원 검색 및 선택
- **문서 업로드**: 처방전/조제기록 사진 업로드 및 OCR 처리 (Gemini AI)
- **대기실 접수**: 2-3분 소요되는 증상/경과/복약 관련 설문
- **QR 코드 공유**: 10분 제한 일회성 코드로 의료진에게 공유
- **의료진 요약 뷰**: 투약 타임라인, 환자 입력 정보, 검증 필요 항목 표시
- **환자 데이터 관리**: 접수 기록 조회 및 삭제

## 기술 스택
- **프론트엔드**: React, TypeScript, Tailwind CSS, Shadcn UI
- **백엔드**: Express.js, Node.js
- **데이터베이스**: PostgreSQL (Drizzle ORM)
- **AI/OCR**: Gemini AI (Replit AI Integrations)
- **라우팅**: Wouter
- **상태관리**: TanStack Query

## 프로젝트 구조
```
├── client/src/
│   ├── components/      # 재사용 컴포넌트
│   │   ├── ui/         # Shadcn UI 컴포넌트
│   │   ├── header.tsx
│   │   ├── hospital-search.tsx
│   │   ├── document-upload.tsx
│   │   ├── medication-timeline.tsx
│   │   ├── intake-summary-card.tsx
│   │   ├── qr-code-display.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── home.tsx          # 메인 페이지
│   │   ├── intake.tsx        # 접수 양식
│   │   ├── share.tsx         # QR 코드 공유
│   │   ├── clinician-view.tsx # 의료진 요약 뷰
│   │   └── my-intakes.tsx    # 내 접수 기록
│   └── App.tsx
├── server/
│   ├── db.ts           # 데이터베이스 연결
│   ├── storage.ts      # 스토리지 인터페이스
│   ├── routes.ts       # API 라우트
│   ├── gemini.ts       # AI OCR 처리
│   └── index.ts
└── shared/
    └── schema.ts       # 데이터 스키마 정의
```

## API 엔드포인트
- `GET /api/hospitals` - 병원 목록 조회
- `GET /api/intakes` - 접수 기록 목록
- `POST /api/intakes` - 새 접수 생성 (multipart/form-data)
- `GET /api/intakes/:id` - 접수 상세 조회
- `DELETE /api/intakes/:id` - 접수 삭제
- `GET /api/intakes/:id/token` - 접근 토큰 조회/생성
- `POST /api/intakes/:id/token/regenerate` - 토큰 재발급
- `GET /api/view/:token` - 토큰으로 요약 조회 (의료진용)

## 데이터 모델
- **hospitals**: 병원/의원 정보
- **intakes**: 환자 접수 정보 (주호소, 경과, 복약, 부작용 등)
- **medications**: OCR 추출된 약물 정보
- **verificationFlags**: 검증 필요 플래그 (중복, 충돌 등)
- **accessTokens**: 일회용 접근 토큰 (10분 TTL)
- **accessLogs**: 접근 로그

## 보안/개인정보
- 원본 이미지는 서버에 저장하지 않음 (OCR 후 즉시 삭제)
- 접근 토큰은 10분 후 자동 만료
- 토큰 재발급 시 이전 토큰 즉시 무효화
- 모든 접근 기록 로깅

## 사용자 설정
- 라이트/다크 모드 지원 (localStorage에 저장)
- 한국어 인터페이스

## 개발 노트
- Gemini AI Integrations 사용 (API 키 불필요, Replit 크레딧 과금)
- 멀티파트 파일 업로드는 multer 사용
- 데이터베이스 마이그레이션: `npm run db:push`
