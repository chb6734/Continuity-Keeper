import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// 병원/의료기관 테이블
export const hospitals = pgTable("hospitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(), // 병원, 의원, 약국
});

export const insertHospitalSchema = createInsertSchema(hospitals).omit({ id: true });
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitals.$inferSelect;

// 환자 접수 (세션) 테이블
export const intakes = pgTable("intakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: varchar("hospital_id").notNull(),
  hospitalName: text("hospital_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // 주호소
  chiefComplaint: text("chief_complaint").notNull(),
  chiefComplaintDetail: text("chief_complaint_detail"),
  
  // 발병 시기
  onsetDate: text("onset_date").notNull(),
  
  // 경과
  courseStatus: text("course_status").notNull(), // improving, worsening, stable
  courseDetail: text("course_detail"),
  
  // 복약 순응도
  adherence: text("adherence").notNull(), // yes, partial, no
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

// OCR 추출 약물 정보
export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intakeId: varchar("intake_id").notNull(),
  
  // OCR 추출 데이터
  medicationName: text("medication_name").notNull(),
  dose: text("dose"),
  frequency: text("frequency"),
  duration: text("duration"),
  prescriptionDate: text("prescription_date"),
  dispensingDate: text("dispensing_date"),
  
  // OCR 신뢰도
  confidence: integer("confidence").default(80), // 0-100
  needsVerification: boolean("needs_verification").default(false),
  
  // 원본 OCR 텍스트
  rawOcrText: text("raw_ocr_text"),
  
  // 소스 타입
  sourceType: text("source_type").notNull(), // prescription, dispensing_record
});

export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

// 충돌/검증 필요 플래그
export const verificationFlags = pgTable("verification_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intakeId: varchar("intake_id").notNull(),
  flagType: text("flag_type").notNull(), // duplicate, date_overlap, allergy_conflict, low_confidence
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
  action: text("action").notNull(), // view, open
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({ 
  id: true, 
  accessedAt: true 
});
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;

// Relations
export const intakesRelations = relations(intakes, ({ many, one }) => ({
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

// 전체 요약 데이터 타입 (API 응답용)
export interface IntakeSummary {
  intake: Intake;
  medications: Medication[];
  verificationFlags: VerificationFlag[];
  accessLogs: AccessLog[];
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
