import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// 세션 스토리지 테이블 (Replit Auth 필수)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// 사용자 테이블 (Replit Auth 필수)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// 병원/의료기관 테이블
export const hospitals = pgTable("hospitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(),
});

export const insertHospitalSchema = createInsertSchema(hospitals).omit({ id: true });
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitals.$inferSelect;

// 환자 테이블 (사용자별 식별)
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Replit Auth 사용자 ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// 처방 기록 테이블 (약봉지/처방전 사진에서 추출)
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  chiefComplaint: text("chief_complaint"), // 어떤 증상으로 처방받았는지
  hospitalName: text("hospital_name"),
  prescriptionDate: text("prescription_date"),
  dispensingDate: text("dispensing_date"),
  rawOcrText: text("raw_ocr_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

// 처방 약물 테이블 (처방 기록에 연결)
export const prescriptionMedications = pgTable("prescription_medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prescriptionId: varchar("prescription_id").notNull(),
  medicationName: text("medication_name").notNull(),
  dose: text("dose"),
  frequency: text("frequency"),
  duration: text("duration"),
  confidence: integer("confidence").default(80),
  needsVerification: boolean("needs_verification").default(false),
  // 확장 필드
  ingredients: text("ingredients"), // 약물 성분
  indication: text("indication"), // 적응증/처방 목적
  startDate: text("start_date"), // 복용 시작일
  endDate: text("end_date"), // 복용 종료일
  dosesPerDay: integer("doses_per_day"), // 1일 복용 횟수
  totalDoses: integer("total_doses"), // 총 복용 횟수
});

export const insertPrescriptionMedicationSchema = createInsertSchema(prescriptionMedications).omit({ id: true });
export type InsertPrescriptionMedication = z.infer<typeof insertPrescriptionMedicationSchema>;
export type PrescriptionMedication = typeof prescriptionMedications.$inferSelect;

// 환자 접수 (세션) 테이블
export const intakes = pgTable("intakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id"), // 환자 ID (선택적)
  hospitalId: varchar("hospital_id").notNull(),
  hospitalName: text("hospital_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // 주호소
  chiefComplaint: text("chief_complaint").notNull(),
  chiefComplaintDetail: text("chief_complaint_detail"),
  
  // 발병 시기
  onsetDate: text("onset_date").notNull(),
  
  // 경과
  courseStatus: text("course_status").notNull(),
  courseDetail: text("course_detail"),
  
  // 복약 순응도
  adherence: text("adherence").notNull(),
  adherenceReason: text("adherence_reason"),
  
  // 부작용/알레르기
  hasAdverseEvents: boolean("has_adverse_events").default(false),
  adverseEventsDetail: text("adverse_events_detail"),
  hasAllergies: boolean("has_allergies").default(false),
  allergiesDetail: text("allergies_detail"),
  
  // 의사 소견 (환자 기록)
  doctorNote: text("doctor_note"),
  
  // 삭제 여부
  isDeleted: boolean("is_deleted").default(false),
});

export const insertIntakeSchema = createInsertSchema(intakes).omit({ 
  id: true, 
  createdAt: true,
  isDeleted: true
});
export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type Intake = typeof intakes.$inferSelect;

// OCR 추출 약물 정보 (접수 시 업로드)
export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intakeId: varchar("intake_id").notNull(),
  medicationName: text("medication_name").notNull(),
  dose: text("dose"),
  frequency: text("frequency"),
  duration: text("duration"),
  prescriptionDate: text("prescription_date"),
  dispensingDate: text("dispensing_date"),
  confidence: integer("confidence").default(80),
  needsVerification: boolean("needs_verification").default(false),
  rawOcrText: text("raw_ocr_text"),
  sourceType: text("source_type").notNull(),
  // 확장 필드
  ingredients: text("ingredients"), // 약물 성분
  indication: text("indication"), // 적응증/처방 목적
  startDate: text("start_date"), // 복용 시작일
  endDate: text("end_date"), // 복용 종료일
  totalDoses: integer("total_doses"), // 총 복용 횟수
  dosesPerDay: integer("doses_per_day"), // 1일 복용 횟수
});

// 복약 순응도 로그 테이블 (환자의 실제 복용 기록)
export const adherenceLogs = pgTable("adherence_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  medicationId: varchar("medication_id"), // medications 테이블 참조 (선택)
  prescriptionMedicationId: varchar("prescription_medication_id"), // prescriptionMedications 참조 (선택)
  medicationName: text("medication_name").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(), // 예정 복용 시간
  takenAt: timestamp("taken_at"), // 실제 복용 시간
  status: text("status").notNull().default("pending"), // pending, taken, missed, skipped
  note: text("note"), // 환자 메모
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

export const insertAdherenceLogSchema = createInsertSchema(adherenceLogs).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertAdherenceLog = z.infer<typeof insertAdherenceLogSchema>;
export type AdherenceLog = typeof adherenceLogs.$inferSelect;

// 충돌/검증 필요 플래그
export const verificationFlags = pgTable("verification_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intakeId: varchar("intake_id").notNull(),
  flagType: text("flag_type").notNull(),
  description: text("description").notNull(),
  relatedMedicationIds: text("related_medication_ids").array(),
});

export const insertVerificationFlagSchema = createInsertSchema(verificationFlags).omit({ id: true });
export type InsertVerificationFlag = z.infer<typeof insertVerificationFlagSchema>;
export type VerificationFlag = typeof verificationFlags.$inferSelect;

// 접근 토큰 테이블
export const accessTokens = pgTable("access_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intakeId: varchar("intake_id").notNull(),
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isInvalidated: boolean("is_invalidated").default(false),
});

export const insertAccessTokenSchema = createInsertSchema(accessTokens).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertAccessToken = z.infer<typeof insertAccessTokenSchema>;
export type AccessToken = typeof accessTokens.$inferSelect;

// 접근 로그
export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intakeId: varchar("intake_id").notNull(),
  tokenId: varchar("token_id").notNull(),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  action: text("action").notNull(),
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({ 
  id: true, 
  accessedAt: true 
});
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;

// 알림 테이블
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  type: text("type").notNull(), // 'medication_reminder', 'follow_up', 'intake_viewed'
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedIntakeId: varchar("related_intake_id"),
  isRead: boolean("is_read").default(false),
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true,
  isRead: true
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// 알림 설정 테이블
export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().unique(),
  medicationReminder: boolean("medication_reminder").default(true),
  followUpReminder: boolean("follow_up_reminder").default(true),
  intakeViewedAlert: boolean("intake_viewed_alert").default(true),
  reminderTime: text("reminder_time").default("09:00"), // HH:mm format
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({ id: true });
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  prescriptions: many(prescriptions),
  intakes: many(intakes),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  medications: many(prescriptionMedications),
}));

export const prescriptionMedicationsRelations = relations(prescriptionMedications, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [prescriptionMedications.prescriptionId],
    references: [prescriptions.id],
  }),
}));

export const intakesRelations = relations(intakes, ({ many, one }) => ({
  patient: one(patients, {
    fields: [intakes.patientId],
    references: [patients.id],
  }),
  medications: many(medications),
  verificationFlags: many(verificationFlags),
  accessTokens: many(accessTokens),
  accessLogs: many(accessLogs),
}));

export const medicationsRelations = relations(medications, ({ one }) => ({
  intake: one(intakes, {
    fields: [medications.intakeId],
    references: [intakes.id],
  }),
}));

export const verificationFlagsRelations = relations(verificationFlags, ({ one }) => ({
  intake: one(intakes, {
    fields: [verificationFlags.intakeId],
    references: [intakes.id],
  }),
}));

export const accessTokensRelations = relations(accessTokens, ({ one }) => ({
  intake: one(intakes, {
    fields: [accessTokens.intakeId],
    references: [intakes.id],
  }),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  intake: one(intakes, {
    fields: [accessLogs.intakeId],
    references: [intakes.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  patient: one(patients, {
    fields: [notifications.patientId],
    references: [patients.id],
  }),
  relatedIntake: one(intakes, {
    fields: [notifications.relatedIntakeId],
    references: [intakes.id],
  }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  patient: one(patients, {
    fields: [notificationSettings.patientId],
    references: [patients.id],
  }),
}));

export const adherenceLogsRelations = relations(adherenceLogs, ({ one }) => ({
  patient: one(patients, {
    fields: [adherenceLogs.patientId],
    references: [patients.id],
  }),
  medication: one(medications, {
    fields: [adherenceLogs.medicationId],
    references: [medications.id],
  }),
  prescriptionMedication: one(prescriptionMedications, {
    fields: [adherenceLogs.prescriptionMedicationId],
    references: [prescriptionMedications.id],
  }),
}));

// 전체 요약 데이터 타입 (API 응답용)
export interface IntakeSummary {
  intake: Intake;
  medications: Medication[];
  verificationFlags: VerificationFlag[];
  accessLogs: AccessLog[];
  adherenceSummary?: AdherenceSummary;
}

// 처방 기록 + 약물 (API 응답용)
export interface PrescriptionWithMedications {
  prescription: Prescription;
  medications: PrescriptionMedication[];
}

// 약물 통계 (API 응답용)
export interface MedicationStats {
  medicationName: string;
  totalCount: number;
  avgConfidence: number;
  lastPrescribedDate: string | null;
  doses: string[];
  frequencies: string[];
}

// 증상별 과거 진료 요약
export interface SymptomHistory {
  chiefComplaint: string;
  totalVisits: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  prescriptions: PrescriptionWithMedications[];
  medicationStats: MedicationStats[];
}

// 주호소 옵션 (한국어)
export const CHIEF_COMPLAINTS = [
  { value: "pain", label: "통증" },
  { value: "fever", label: "발열" },
  { value: "cough", label: "기침" },
  { value: "headache", label: "두통" },
  { value: "fatigue", label: "피로감" },
  { value: "dizziness", label: "어지러움" },
  { value: "nausea", label: "메스꺼움" },
  { value: "digestive", label: "소화 불량" },
  { value: "skin", label: "피부 증상" },
  { value: "respiratory", label: "호흡 곤란" },
  { value: "other", label: "기타" },
] as const;

// 경과 상태 옵션
export const COURSE_STATUS = [
  { value: "improving", label: "호전 중" },
  { value: "worsening", label: "악화 중" },
  { value: "stable", label: "변화 없음" },
] as const;

// 복약 순응도 옵션
export const ADHERENCE_OPTIONS = [
  { value: "yes", label: "예, 처방대로 복용 중" },
  { value: "partial", label: "부분적으로 복용" },
  { value: "no", label: "복용하지 않음" },
] as const;

// 복약 순응도 상태 옵션
export const ADHERENCE_STATUS = [
  { value: "pending", label: "예정됨" },
  { value: "taken", label: "복용함" },
  { value: "missed", label: "놓침" },
  { value: "skipped", label: "건너뜀" },
] as const;

// 복약 순응도 요약 (API 응답용)
export interface AdherenceSummary {
  totalScheduled: number;
  takenCount: number;
  missedCount: number;
  skippedCount: number;
  adherenceRate: number; // 0-100
  recentLogs: AdherenceLog[];
}

// 환자 전체 히스토리 (의료진 뷰용)
export interface PatientHistory {
  patient: Patient;
  intakes: Intake[];
  prescriptions: PrescriptionWithMedications[];
  adherenceSummary: AdherenceSummary;
  medicationStats: MedicationStats[];
}
