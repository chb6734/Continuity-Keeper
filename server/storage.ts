import { 
  hospitals, 
  intakes, 
  medications, 
  verificationFlags, 
  accessTokens, 
  accessLogs,
  patients,
  prescriptions,
  prescriptionMedications,
  notifications,
  notificationSettings,
  adherenceLogs,
  type Hospital, 
  type InsertHospital,
  type Intake, 
  type InsertIntake,
  type Medication,
  type InsertMedication,
  type VerificationFlag,
  type InsertVerificationFlag,
  type AccessToken,
  type InsertAccessToken,
  type AccessLog,
  type InsertAccessLog,
  type Patient,
  type InsertPatient,
  type Prescription,
  type InsertPrescription,
  type PrescriptionMedication,
  type InsertPrescriptionMedication,
  type Notification,
  type InsertNotification,
  type NotificationSettings,
  type InsertNotificationSettings,
  type AdherenceLog,
  type InsertAdherenceLog,
  type IntakeSummary,
  type PrescriptionWithMedications,
  type MedicationStats,
  type SymptomHistory,
  type AdherenceSummary
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt, sql } from "drizzle-orm";

export interface IStorage {
  // Hospitals
  getHospitals(): Promise<Hospital[]>;
  getHospital(id: string): Promise<Hospital | undefined>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  
  // Patients
  getPatientByDeviceId(deviceId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getOrCreatePatient(deviceId: string): Promise<Patient>;
  
  // Prescriptions
  getPrescriptionsByPatientId(patientId: string): Promise<Prescription[]>;
  getPrescriptionsBySymptom(patientId: string, chiefComplaint: string): Promise<PrescriptionWithMedications[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  
  // Prescription Medications
  getPrescriptionMedications(prescriptionId: string): Promise<PrescriptionMedication[]>;
  createPrescriptionMedication(medication: InsertPrescriptionMedication): Promise<PrescriptionMedication>;
  
  // Symptom History & Statistics
  getSymptomHistory(patientId: string, chiefComplaint: string): Promise<SymptomHistory | null>;
  getMedicationStatsBySymptom(patientId: string, chiefComplaint: string): Promise<MedicationStats[]>;
  
  // Intakes
  getIntakes(): Promise<Intake[]>;
  getIntakesByPatientId(patientId: string): Promise<Intake[]>;
  getIntake(id: string): Promise<Intake | undefined>;
  createIntake(intake: InsertIntake): Promise<Intake>;
  deleteIntake(id: string): Promise<void>;
  
  // Medications
  getMedicationsByIntakeId(intakeId: string): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  
  // Verification Flags
  getVerificationFlagsByIntakeId(intakeId: string): Promise<VerificationFlag[]>;
  createVerificationFlag(flag: InsertVerificationFlag): Promise<VerificationFlag>;
  
  // Access Tokens
  getActiveTokenByIntakeId(intakeId: string): Promise<AccessToken | undefined>;
  getTokenByValue(token: string): Promise<AccessToken | undefined>;
  createAccessToken(token: InsertAccessToken): Promise<AccessToken>;
  invalidateTokensByIntakeId(intakeId: string): Promise<void>;
  
  // Access Logs
  getAccessLogsByIntakeId(intakeId: string): Promise<AccessLog[]>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  
  // Notifications
  getNotificationsByPatientId(patientId: string): Promise<Notification[]>;
  getUnreadNotificationCount(patientId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(patientId: string): Promise<void>;
  
  // Notification Settings
  getNotificationSettings(patientId: string): Promise<NotificationSettings | undefined>;
  createOrUpdateNotificationSettings(patientId: string, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings>;
  
  // Adherence Logs
  getAdherenceLogsByPatientId(patientId: string): Promise<AdherenceLog[]>;
  getAdherenceLogsByMedicationId(medicationId: string): Promise<AdherenceLog[]>;
  createAdherenceLog(log: InsertAdherenceLog): Promise<AdherenceLog>;
  getAdherenceSummary(patientId: string): Promise<AdherenceSummary>;
  
  // Prescriptions with Medications (full)
  getPrescriptionsWithMedications(patientId: string): Promise<PrescriptionWithMedications[]>;
  
  // Full Summary
  getIntakeSummary(intakeId: string): Promise<IntakeSummary | undefined>;
  getIntakeSummaryByToken(token: string): Promise<IntakeSummary | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Hospitals
  async getHospitals(): Promise<Hospital[]> {
    return db.select().from(hospitals);
  }

  async getHospital(id: string): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return hospital || undefined;
  }

  async createHospital(hospital: InsertHospital): Promise<Hospital> {
    const [created] = await db.insert(hospitals).values(hospital).returning();
    return created;
  }

  // Patients
  async getPatientByDeviceId(deviceId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.deviceId, deviceId));
    return patient || undefined;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values(patient).returning();
    return created;
  }

  async getOrCreatePatient(deviceId: string): Promise<Patient> {
    let patient = await this.getPatientByDeviceId(deviceId);
    if (!patient) {
      patient = await this.createPatient({ deviceId });
    }
    return patient;
  }

  // Prescriptions
  async getPrescriptionsByPatientId(patientId: string): Promise<Prescription[]> {
    return db.select().from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));
  }

  async getPrescriptionsBySymptom(patientId: string, chiefComplaint: string): Promise<PrescriptionWithMedications[]> {
    const prescriptionList = await db.select().from(prescriptions)
      .where(and(
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.chiefComplaint, chiefComplaint)
      ))
      .orderBy(desc(prescriptions.createdAt));

    const results: PrescriptionWithMedications[] = [];
    for (const prescription of prescriptionList) {
      const meds = await this.getPrescriptionMedications(prescription.id);
      results.push({ prescription, medications: meds });
    }
    return results;
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [created] = await db.insert(prescriptions).values(prescription).returning();
    return created;
  }

  // Prescription Medications
  async getPrescriptionMedications(prescriptionId: string): Promise<PrescriptionMedication[]> {
    return db.select().from(prescriptionMedications)
      .where(eq(prescriptionMedications.prescriptionId, prescriptionId));
  }

  async createPrescriptionMedication(medication: InsertPrescriptionMedication): Promise<PrescriptionMedication> {
    const [created] = await db.insert(prescriptionMedications).values(medication).returning();
    return created;
  }

  // Symptom History & Statistics
  async getSymptomHistory(patientId: string, chiefComplaint: string): Promise<SymptomHistory | null> {
    const prescriptionList = await this.getPrescriptionsBySymptom(patientId, chiefComplaint);
    
    if (prescriptionList.length === 0) {
      return null;
    }

    const dates = prescriptionList
      .map(p => p.prescription.prescriptionDate || p.prescription.createdAt.toISOString().split('T')[0])
      .filter(Boolean)
      .sort();

    const medicationStats = await this.getMedicationStatsBySymptom(patientId, chiefComplaint);

    return {
      chiefComplaint,
      totalVisits: prescriptionList.length,
      firstVisitDate: dates[0] || null,
      lastVisitDate: dates[dates.length - 1] || null,
      prescriptions: prescriptionList,
      medicationStats,
    };
  }

  async getMedicationStatsBySymptom(patientId: string, chiefComplaint: string): Promise<MedicationStats[]> {
    const prescriptionList = await this.getPrescriptionsBySymptom(patientId, chiefComplaint);
    
    const medicationMap = new Map<string, {
      totalCount: number;
      confidenceSum: number;
      lastDate: string | null;
      doses: Set<string>;
      frequencies: Set<string>;
    }>();

    for (const { prescription, medications: meds } of prescriptionList) {
      for (const med of meds) {
        const existing = medicationMap.get(med.medicationName) || {
          totalCount: 0,
          confidenceSum: 0,
          lastDate: null,
          doses: new Set<string>(),
          frequencies: new Set<string>(),
        };

        existing.totalCount += 1;
        existing.confidenceSum += med.confidence || 80;
        
        const prescDate = prescription.prescriptionDate || prescription.createdAt.toISOString().split('T')[0];
        if (!existing.lastDate || prescDate > existing.lastDate) {
          existing.lastDate = prescDate;
        }
        
        if (med.dose) existing.doses.add(med.dose);
        if (med.frequency) existing.frequencies.add(med.frequency);

        medicationMap.set(med.medicationName, existing);
      }
    }

    return Array.from(medicationMap.entries()).map(([name, data]) => ({
      medicationName: name,
      totalCount: data.totalCount,
      avgConfidence: Math.round(data.confidenceSum / data.totalCount),
      lastPrescribedDate: data.lastDate,
      doses: Array.from(data.doses),
      frequencies: Array.from(data.frequencies),
    })).sort((a, b) => b.totalCount - a.totalCount);
  }

  // Intakes
  async getIntakes(): Promise<Intake[]> {
    return db.select().from(intakes).where(eq(intakes.isDeleted, false)).orderBy(desc(intakes.createdAt));
  }

  async getIntakesByPatientId(patientId: string): Promise<Intake[]> {
    return db.select().from(intakes)
      .where(and(
        eq(intakes.patientId, patientId),
        eq(intakes.isDeleted, false)
      ))
      .orderBy(desc(intakes.createdAt));
  }

  async getIntake(id: string): Promise<Intake | undefined> {
    const [intake] = await db.select().from(intakes).where(
      and(eq(intakes.id, id), eq(intakes.isDeleted, false))
    );
    return intake || undefined;
  }

  async createIntake(intake: InsertIntake): Promise<Intake> {
    const [created] = await db.insert(intakes).values(intake).returning();
    return created;
  }

  async deleteIntake(id: string): Promise<void> {
    await db.update(intakes).set({ isDeleted: true }).where(eq(intakes.id, id));
    await this.invalidateTokensByIntakeId(id);
  }

  // Medications
  async getMedicationsByIntakeId(intakeId: string): Promise<Medication[]> {
    return db.select().from(medications).where(eq(medications.intakeId, intakeId));
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [created] = await db.insert(medications).values(medication).returning();
    return created;
  }

  // Verification Flags
  async getVerificationFlagsByIntakeId(intakeId: string): Promise<VerificationFlag[]> {
    return db.select().from(verificationFlags).where(eq(verificationFlags.intakeId, intakeId));
  }

  async createVerificationFlag(flag: InsertVerificationFlag): Promise<VerificationFlag> {
    const [created] = await db.insert(verificationFlags).values(flag).returning();
    return created;
  }

  // Access Tokens
  async getActiveTokenByIntakeId(intakeId: string): Promise<AccessToken | undefined> {
    const now = new Date();
    const [token] = await db.select().from(accessTokens).where(
      and(
        eq(accessTokens.intakeId, intakeId),
        eq(accessTokens.isInvalidated, false),
        gt(accessTokens.expiresAt, now)
      )
    );
    return token || undefined;
  }

  async getTokenByValue(tokenValue: string): Promise<AccessToken | undefined> {
    const now = new Date();
    const [token] = await db.select().from(accessTokens).where(
      and(
        eq(accessTokens.token, tokenValue),
        eq(accessTokens.isInvalidated, false),
        gt(accessTokens.expiresAt, now)
      )
    );
    return token || undefined;
  }

  async createAccessToken(token: InsertAccessToken): Promise<AccessToken> {
    const [created] = await db.insert(accessTokens).values(token).returning();
    return created;
  }

  async invalidateTokensByIntakeId(intakeId: string): Promise<void> {
    await db.update(accessTokens)
      .set({ isInvalidated: true })
      .where(eq(accessTokens.intakeId, intakeId));
  }

  // Access Logs
  async getAccessLogsByIntakeId(intakeId: string): Promise<AccessLog[]> {
    return db.select().from(accessLogs)
      .where(eq(accessLogs.intakeId, intakeId))
      .orderBy(desc(accessLogs.accessedAt));
  }

  async createAccessLog(log: InsertAccessLog): Promise<AccessLog> {
    const [created] = await db.insert(accessLogs).values(log).returning();
    return created;
  }

  // Full Summary
  async getIntakeSummary(intakeId: string): Promise<IntakeSummary | undefined> {
    const intake = await this.getIntake(intakeId);
    if (!intake) return undefined;

    const [meds, flags, logs] = await Promise.all([
      this.getMedicationsByIntakeId(intakeId),
      this.getVerificationFlagsByIntakeId(intakeId),
      this.getAccessLogsByIntakeId(intakeId),
    ]);

    let adherenceSummary = undefined;
    if (intake.patientId) {
      adherenceSummary = await this.getAdherenceSummary(intake.patientId);
    }

    return {
      intake,
      medications: meds,
      verificationFlags: flags,
      accessLogs: logs,
      adherenceSummary,
    };
  }

  async getIntakeSummaryByToken(tokenValue: string): Promise<IntakeSummary | undefined> {
    const token = await this.getTokenByValue(tokenValue);
    if (!token) return undefined;

    return this.getIntakeSummary(token.intakeId);
  }

  // Notifications
  async getNotificationsByPatientId(patientId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.patientId, patientId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(patientId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.patientId, patientId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(patientId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.patientId, patientId));
  }

  // Notification Settings
  async getNotificationSettings(patientId: string): Promise<NotificationSettings | undefined> {
    const [settings] = await db.select().from(notificationSettings)
      .where(eq(notificationSettings.patientId, patientId));
    return settings || undefined;
  }

  async createOrUpdateNotificationSettings(patientId: string, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    const existing = await this.getNotificationSettings(patientId);
    
    if (existing) {
      const [updated] = await db.update(notificationSettings)
        .set(settings)
        .where(eq(notificationSettings.patientId, patientId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(notificationSettings)
        .values({ patientId, ...settings })
        .returning();
      return created;
    }
  }

  // Adherence Logs
  async getAdherenceLogsByPatientId(patientId: string): Promise<AdherenceLog[]> {
    return db.select().from(adherenceLogs)
      .where(eq(adherenceLogs.patientId, patientId))
      .orderBy(desc(adherenceLogs.scheduledTime));
  }

  async getAdherenceLogsByMedicationId(medicationId: string): Promise<AdherenceLog[]> {
    return db.select().from(adherenceLogs)
      .where(eq(adherenceLogs.medicationId, medicationId))
      .orderBy(desc(adherenceLogs.scheduledTime));
  }

  async createAdherenceLog(log: InsertAdherenceLog): Promise<AdherenceLog> {
    const [created] = await db.insert(adherenceLogs).values(log).returning();
    return created;
  }

  async getAdherenceSummary(patientId: string): Promise<AdherenceSummary> {
    const logs = await this.getAdherenceLogsByPatientId(patientId);
    
    const takenCount = logs.filter(l => l.status === "taken").length;
    const missedCount = logs.filter(l => l.status === "missed").length;
    const skippedCount = logs.filter(l => l.status === "skipped").length;
    const totalScheduled = logs.length;
    const adherenceRate = totalScheduled > 0 ? Math.round((takenCount / totalScheduled) * 100) : 100;
    
    return {
      totalScheduled,
      takenCount,
      missedCount,
      skippedCount,
      adherenceRate,
      recentLogs: logs.slice(0, 10),
    };
  }

  // Prescriptions with Medications (full)
  async getPrescriptionsWithMedications(patientId: string): Promise<PrescriptionWithMedications[]> {
    const patientPrescriptions = await db.select().from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.prescriptionDate));
    
    const result: PrescriptionWithMedications[] = [];
    
    for (const prescription of patientPrescriptions) {
      const meds = await db.select().from(prescriptionMedications)
        .where(eq(prescriptionMedications.prescriptionId, prescription.id));
      result.push({ prescription, medications: meds });
    }
    
    return result;
  }
}

export const storage = new DatabaseStorage();

// Seed initial hospitals
export async function seedHospitals() {
  const existingHospitals = await storage.getHospitals();
  if (existingHospitals.length > 0) return;

  const sampleHospitals: InsertHospital[] = [
    { name: "서울대학교병원", address: "서울특별시 종로구 대학로 101", type: "대학병원" },
    { name: "세브란스병원", address: "서울특별시 서대문구 연세로 50-1", type: "대학병원" },
    { name: "삼성서울병원", address: "서울특별시 강남구 일원로 81", type: "대학병원" },
    { name: "아산병원", address: "서울특별시 송파구 올림픽로43길 88", type: "대학병원" },
    { name: "강남세브란스병원", address: "서울특별시 강남구 언주로 211", type: "대학병원" },
    { name: "중앙내과의원", address: "서울특별시 중구 명동길 73", type: "의원" },
    { name: "행복가정의원", address: "서울특별시 마포구 월드컵북로 396", type: "의원" },
    { name: "건강약국", address: "서울특별시 강남구 테헤란로 152", type: "약국" },
    { name: "온누리약국", address: "서울특별시 서초구 강남대로 465", type: "약국" },
    { name: "경기도의료원 수원병원", address: "경기도 수원시 장안구 수성로 245", type: "도립병원" },
  ];

  for (const hospital of sampleHospitals) {
    await storage.createHospital(hospital);
  }
}
