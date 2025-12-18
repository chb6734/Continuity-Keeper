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
- **처방 기록 관리**: 접수와 별도로 처방 기록 저장 및 관리
- **증상별 과거 기록 조회**: 같은 증상으로 과거 진료 받은 기록 확인 및 약물 통계
- **알림 시스템**: 복약 알림, 재진료 알림, 의료진 조회 알림 설정 및 관리
- **약물 분석**: OCR 신뢰도 분포, 검증 필요 항목 자동 표시

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
│   │   ├── symptom-history-card.tsx  # 증상별 과거 기록 카드
│   │   └── ...
│   ├── pages/
│   │   ├── home.tsx          # 메인 페이지
│   │   ├── intake.tsx        # 접수 양식 (deviceId로 환자 식별)
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

### 환자/처방 관리 (신규)
- `POST /api/patients` - 환자 생성/조회 (deviceId 기반)
- `GET /api/patients/:deviceId` - deviceId로 환자 조회
- `POST /api/prescriptions/import` - 처방전 사진 업로드 및 OCR (접수와 분리)
- `GET /api/prescriptions/:patientId` - 환자별 처방 기록 조회
- `GET /api/symptom-history/:deviceId/:chiefComplaint` - 증상별 과거 진료 기록
- `GET /api/medication-stats/:deviceId/:chiefComplaint` - 증상별 약물 통계

### 접수 관리
- `GET /api/hospitals` - 병원 목록 조회
- `GET /api/intakes` - 접수 기록 목록
- `POST /api/intakes` - 새 접수 생성 (multipart/form-data, deviceId 포함)
- `GET /api/intakes/:id` - 접수 상세 조회
- `DELETE /api/intakes/:id` - 접수 삭제
- `GET /api/intakes/:id/token` - 접근 토큰 조회/생성
- `POST /api/intakes/:id/token/regenerate` - 토큰 재발급
- `GET /api/view/:token` - 토큰으로 요약 조회 (의료진용)

## 데이터 모델

### 환자 중심 구조 (신규)
- **patients**: 환자 정보 (deviceId로 식별)
- **prescriptions**: 처방 기록 (patientId, chiefComplaint 연결)
- **prescriptionMedications**: 처방별 약물 정보

### 접수 관련
- **hospitals**: 병원/의원 정보
- **intakes**: 환자 접수 정보 (patientId 연결, 주호소, 경과, 복약, 부작용 등)
- **medications**: OCR 추출된 약물 정보 (intakeId 연결, 레거시)
- **verificationFlags**: 검증 필요 플래그 (중복, 충돌 등)
- **accessTokens**: 일회용 접근 토큰 (10분 TTL)
- **accessLogs**: 접근 로그

## 아키텍처 변경 사항 (2024-12)
- 처방 기록을 접수(intake)와 분리하여 별도 저장
- 환자 식별을 위한 deviceId 기반 patients 테이블 추가
- 증상 선택 시 과거 동일 증상 진료 기록 자동 조회
- 과거 기록이 있으면 처방받은 약물 통계 표시
- 접수 시 OCR 결과를 medications 테이블뿐만 아니라 prescriptions/prescription_medications 테이블에도 저장 (이후 불러오기 가능)
- 홈 화면에 MedicationHistoryCard 추가 (처방받은 약물 목록 표시)
- /my-medications 페이지 추가 (전체 약물 기록 상세 조회)

## 보안/개인정보
- 원본 이미지는 서버에 저장하지 않음 (OCR 후 즉시 삭제)
- 접근 토큰은 10분 후 자동 만료
- 토큰 재발급 시 이전 토큰 즉시 무효화
- 모든 접근 기록 로깅
- deviceId는 localStorage에 저장 (브라우저별 고유)

## 사용자 설정
- 라이트/다크 모드 지원 (localStorage에 저장)
- 한국어 인터페이스

## 개발 노트
- Gemini AI Integrations 사용 (API 키 불필요, Replit 크레딧 과금)
- 멀티파트 파일 업로드는 multer 사용
- 데이터베이스 마이그레이션: `npm run db:push`
