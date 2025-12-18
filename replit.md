# MedBridge - 진료 연속성 서비스

## 개요
MedBridge는 환자가 이전 진료 정보를 새로운 의료기관의 의료진에게 쉽게 전달할 수 있도록 돕는 웹 애플리케이션입니다. 처방전과 조제기록 사진에서 AI를 활용해 약물 정보를 추출하고, 환자가 입력한 증상 및 경과 정보와 함께 의료진용 요약 페이지를 생성합니다.

## 주요 기능
- **사용자 인증**: Replit Auth를 통한 로그인/회원가입 (Google, GitHub, Apple 등)
- **병원 선택**: 방문할 병원/의원 검색 및 선택
- **문서 업로드**: 처방전/조제기록 사진 업로드 및 OCR 처리 (Gemini AI)
- **대기실 접수**: 2-3분 소요되는 증상/경과/복약 관련 설문
- **QR 코드 공유**: 10분 제한 일회성 코드로 의료진에게 공유
- **의료진 요약 뷰**: 투약 타임라인, 환자 입력 정보, 검증 필요 항목 표시
- **환자 데이터 관리**: 접수 기록 조회 및 삭제
- **처방 기록 관리**: 접수와 별도로 처방 기록 저장 및 관리
- **증상별 과거 기록 조회**: 같은 증상으로 과거 진료 받은 기록 확인 및 약물 통계
- **알림 시스템**: 복약 알림, 재진료 알림, 의료진 조회 알림 설정 및 관리
- **약물 분석**: OCR 신뢰도 분포, 검증 필요 항목 자동 표시

## 기술 스택
- **프론트엔드**: React, TypeScript, Tailwind CSS, Shadcn UI
- **백엔드**: Express.js, Node.js
- **데이터베이스**: PostgreSQL (Drizzle ORM)
- **AI/OCR**: Gemini AI (Replit AI Integrations)
- **인증**: Replit Auth (OpenID Connect)
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
│   │   └── symptom-history-card.tsx
│   ├── hooks/
│   │   ├── useAuth.ts       # 인증 상태 훅
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── authUtils.ts     # 인증 유틸리티
│   │   └── queryClient.ts
│   ├── pages/
│   │   ├── landing.tsx      # 랜딩 페이지 (비로그인)
│   │   ├── home.tsx         # 메인 페이지 (로그인)
│   │   ├── intake.tsx       # 접수 양식
│   │   ├── share.tsx        # QR 코드 공유
│   │   ├── clinician-view.tsx # 의료진 요약 뷰
│   │   ├── my-intakes.tsx   # 내 접수 기록
│   │   └── my-medications.tsx # 내 약물 기록
│   └── App.tsx
├── server/
│   ├── db.ts           # 데이터베이스 연결
│   ├── storage.ts      # 스토리지 인터페이스
│   ├── routes.ts       # API 라우트
│   ├── replitAuth.ts   # Replit Auth 설정
│   ├── gemini.ts       # AI OCR 처리
│   └── index.ts
└── shared/
    └── schema.ts       # 데이터 스키마 정의
```

## API 엔드포인트

### 인증 API
- `GET /api/login` - 로그인 시작 (Replit Auth)
- `GET /api/callback` - OAuth 콜백
- `GET /api/logout` - 로그아웃
- `GET /api/auth/user` - 현재 사용자 정보 (인증 불필요, null 반환 가능)

### 환자/처방 관리
- `GET /api/patient` - 현재 환자 조회/생성 (인증 필요)
- `POST /api/prescriptions/import` - 처방전 업로드 및 OCR (인증 필요)
- `GET /api/prescriptions` - 처방 기록 조회 (인증 필요)
- `GET /api/prescriptions-with-meds` - 처방 + 약물 정보 조회 (인증 필요)
- `GET /api/symptom-history/:chiefComplaint` - 증상별 과거 기록 (인증 필요)

### 접수 관리
- `GET /api/hospitals` - 병원 목록 (공개)
- `GET /api/intakes` - 접수 기록 목록 (인증 필요)
- `POST /api/intakes` - 새 접수 생성 (인증 필요)
- `GET /api/intakes/:id` - 접수 상세 조회 (인증 필요)
- `DELETE /api/intakes/:id` - 접수 삭제 (인증 필요)
- `GET /api/intakes/:id/token` - 접근 토큰 조회/생성 (인증 필요)
- `GET /api/view/:token` - 토큰으로 요약 조회 (공개 - 의료진용)

### 알림/설정 API
- `GET /api/notifications` - 알림 목록 (인증 필요)
- `POST /api/notifications/:id/read` - 알림 읽음 처리 (인증 필요)
- `GET /api/notification-settings` - 알림 설정 조회 (인증 필요)
- `POST /api/notification-settings` - 알림 설정 업데이트 (인증 필요)

## 데이터 모델

### 사용자/세션
- **users**: 사용자 정보 (Replit Auth)
- **sessions**: 세션 스토리지

### 환자 중심 구조
- **patients**: 환자 정보 (userId로 식별)
- **prescriptions**: 처방 기록 (patientId, chiefComplaint 연결)
- **prescriptionMedications**: 처방별 약물 정보

### 접수 관련
- **hospitals**: 병원/의원 정보
- **intakes**: 환자 접수 정보 (patientId 연결)
- **medications**: OCR 추출된 약물 정보 (intakeId 연결)
- **verificationFlags**: 검증 필요 플래그
- **accessTokens**: 일회용 접근 토큰 (10분 TTL)
- **accessLogs**: 접근 로그
- **notifications**: 알림
- **notificationSettings**: 알림 설정
- **adherenceLogs**: 복약 순응도 로그

## 아키텍처 변경 사항 (2024-12)
- Replit Auth 도입으로 사용자 인증 추가
- deviceId 기반에서 userId 기반 아키텍처로 마이그레이션
- 세션 기반 인증 (PostgreSQL 세션 스토어)
- 비로그인 사용자를 위한 랜딩 페이지 추가
- 모든 환자 관련 API에 인증 미들웨어 적용
- 헤더에 사용자 프로필 및 로그아웃 기능 추가

## 보안/개인정보
- 원본 이미지는 서버에 저장하지 않음 (OCR 후 즉시 삭제)
- 접근 토큰은 10분 후 자동 만료
- 토큰 재발급 시 이전 토큰 즉시 무효화
- 모든 접근 기록 로깅
- 세션 쿠키 httpOnly, secure (프로덕션)
- OAuth 인증으로 비밀번호 저장 불필요

## 사용자 설정
- 라이트/다크 모드 지원 (localStorage에 저장)
- 한국어 인터페이스

## 개발 노트
- Gemini AI Integrations 사용 (API 키 불필요, Replit 크레딧 과금)
- 멀티파트 파일 업로드는 multer 사용
- 데이터베이스 마이그레이션: `npm run db:push`
- 세션 테이블은 connect-pg-simple이 자동 관리
