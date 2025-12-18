import { 
  hospitals, 
  intakes, 
  medications, 
  verificationFlags, 
  accessTokens, 
  accessLogs,
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
  type IntakeSummary
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Hospitals
  getHospitals(): Promise<Hospital[]>;
  getHospital(id: string): Promise<Hospital | undefined>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  
  // Intakes
  getIntakes(): Promise<Intake[]>;
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

  // Intakes
  async getIntakes(): Promise<Intake[]> {
    return db.select().from(intakes).where(eq(intakes.isDeleted, false)).orderBy(desc(intakes.createdAt));
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

    return {
      intake,
      medications: meds,
      verificationFlags: flags,
      accessLogs: logs,
    };
  }

  async getIntakeSummaryByToken(tokenValue: string): Promise<IntakeSummary | undefined> {
    const token = await this.getTokenByValue(tokenValue);
    if (!token) return undefined;

    return this.getIntakeSummary(token.intakeId);
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
