import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { randomUUID } from "crypto";
import { storage, seedHospitals } from "./storage";
import { extractMedicationsFromImage, detectConflicts } from "./gemini";
import { insertIntakeSchema, insertPrescriptionSchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await seedHospitals();

  // ==================== 병원 API ====================
  app.get("/api/hospitals", async (req: Request, res: Response) => {
    try {
      const hospitals = await storage.getHospitals();
      res.json(hospitals);
    } catch (error) {
      console.error("Failed to get hospitals:", error);
      res.status(500).json({ error: "Failed to get hospitals" });
    }
  });

  // ==================== 환자 API ====================
  app.post("/api/patients", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ error: "deviceId is required" });
      }
      const patient = await storage.getOrCreatePatient(deviceId);
      res.json(patient);
    } catch (error) {
      console.error("Failed to create patient:", error);
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  app.get("/api/patients/:deviceId", async (req: Request, res: Response) => {
    try {
      const patient = await storage.getPatientByDeviceId(req.params.deviceId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Failed to get patient:", error);
      res.status(500).json({ error: "Failed to get patient" });
    }
  });

  // ==================== 처방 기록 API (별도 저장) ====================
  app.post("/api/prescriptions/import", upload.array("documents", 5), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const { deviceId, chiefComplaint, hospitalName } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: "deviceId is required" });
      }

      const patient = await storage.getOrCreatePatient(deviceId);
      const results: any[] = [];

      for (const file of files) {
        try {
          const ocrResult = await extractMedicationsFromImage(file.buffer, file.mimetype);

          if (ocrResult.medications.length > 0) {
            const prescription = await storage.createPrescription({
              patientId: patient.id,
              chiefComplaint: chiefComplaint || null,
              hospitalName: hospitalName || null,
              prescriptionDate: ocrResult.medications[0].prescriptionDate || null,
              dispensingDate: ocrResult.medications[0].dispensingDate || null,
              rawOcrText: ocrResult.rawText,
            });

            const meds: any[] = [];
            for (const med of ocrResult.medications) {
              const created = await storage.createPrescriptionMedication({
                prescriptionId: prescription.id,
                medicationName: med.medicationName,
                dose: med.dose,
                frequency: med.frequency,
                duration: med.duration,
                confidence: med.confidence,
                needsVerification: med.confidence < 70,
              });
              meds.push(created);
            }

            results.push({ prescription, medications: meds });
          }
        } catch (ocrError) {
          console.error("OCR failed for file:", ocrError);
        }
      }

      res.json({ 
        success: true, 
        prescriptionsCreated: results.length,
        prescriptions: results 
      });
    } catch (error) {
      console.error("Failed to import prescriptions:", error);
      res.status(500).json({ error: "Failed to import prescriptions" });
    }
  });

  app.get("/api/prescriptions/:patientId", async (req: Request, res: Response) => {
    try {
      const prescriptions = await storage.getPrescriptionsByPatientId(req.params.patientId);
      res.json(prescriptions);
    } catch (error) {
      console.error("Failed to get prescriptions:", error);
      res.status(500).json({ error: "Failed to get prescriptions" });
    }
  });

  // ==================== 증상별 과거 기록 및 통계 API ====================
  app.get("/api/symptom-history/:deviceId/:chiefComplaint", async (req: Request, res: Response) => {
    try {
      const { deviceId, chiefComplaint } = req.params;
      
      const patient = await storage.getPatientByDeviceId(deviceId);
      if (!patient) {
        return res.json({ 
          hasHistory: false, 
          totalVisits: 0, 
          prescriptions: [], 
          medicationStats: [] 
        });
      }

      const history = await storage.getSymptomHistory(patient.id, chiefComplaint);
      
      if (!history) {
        return res.json({ 
          hasHistory: false, 
          totalVisits: 0, 
          prescriptions: [], 
          medicationStats: [] 
        });
      }

      res.json({
        hasHistory: true,
        ...history
      });
    } catch (error) {
      console.error("Failed to get symptom history:", error);
      res.status(500).json({ error: "Failed to get symptom history" });
    }
  });

  app.get("/api/medication-stats/:deviceId/:chiefComplaint", async (req: Request, res: Response) => {
    try {
      const { deviceId, chiefComplaint } = req.params;
      
      const patient = await storage.getPatientByDeviceId(deviceId);
      if (!patient) {
        return res.json([]);
      }

      const stats = await storage.getMedicationStatsBySymptom(patient.id, chiefComplaint);
      res.json(stats);
    } catch (error) {
      console.error("Failed to get medication stats:", error);
      res.status(500).json({ error: "Failed to get medication stats" });
    }
  });

  // ==================== 접수 API ====================
  app.get("/api/intakes", async (req: Request, res: Response) => {
    try {
      const intakes = await storage.getIntakes();
      res.json(intakes);
    } catch (error) {
      console.error("Failed to get intakes:", error);
      res.status(500).json({ error: "Failed to get intakes" });
    }
  });

  app.post("/api/intakes", upload.array("documents", 5), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      
      let patientId: string | null = null;
      if (req.body.deviceId) {
        const patient = await storage.getOrCreatePatient(req.body.deviceId);
        patientId = patient.id;
      }

      const rawIntakeData = {
        patientId,
        hospitalId: req.body.hospitalId,
        hospitalName: req.body.hospitalName,
        chiefComplaint: req.body.chiefComplaint,
        chiefComplaintDetail: req.body.chiefComplaintDetail || null,
        onsetDate: req.body.onsetDate,
        courseStatus: req.body.courseStatus,
        courseDetail: req.body.courseDetail || null,
        adherence: req.body.adherence,
        adherenceReason: req.body.adherenceReason || null,
        hasAdverseEvents: req.body.hasAdverseEvents === "true",
        adverseEventsDetail: req.body.adverseEventsDetail || null,
        hasAllergies: req.body.hasAllergies === "true",
        allergiesDetail: req.body.allergiesDetail || null,
        doctorNote: req.body.doctorNote || null,
      };

      const validationResult = insertIntakeSchema.safeParse(rawIntakeData);
      if (!validationResult.success) {
        console.error("Intake validation failed:", validationResult.error);
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다", 
          details: validationResult.error.errors.map(e => e.message)
        });
      }

      const intakeData = validationResult.data;
      const intake = await storage.createIntake(intakeData);

      const allMedications: any[] = [];

      for (const file of files) {
        try {
          const ocrResult = await extractMedicationsFromImage(
            file.buffer,
            file.mimetype
          );

          for (const med of ocrResult.medications) {
            const medication = await storage.createMedication({
              intakeId: intake.id,
              medicationName: med.medicationName,
              dose: med.dose,
              frequency: med.frequency,
              duration: med.duration,
              prescriptionDate: med.prescriptionDate,
              dispensingDate: med.dispensingDate,
              confidence: med.confidence,
              needsVerification: med.confidence < 70,
              rawOcrText: med.rawOcrText,
              sourceType: "prescription",
            });
            allMedications.push(medication);
          }
        } catch (ocrError) {
          console.error("OCR failed for file:", ocrError);
        }
      }

      const lowConfidenceMeds = allMedications.filter(m => m.confidence < 70);
      for (const med of lowConfidenceMeds) {
        await storage.createVerificationFlag({
          intakeId: intake.id,
          flagType: "low_confidence",
          description: `"${med.medicationName}" 항목의 OCR 신뢰도가 낮습니다 (${med.confidence}%). 확인이 필요합니다.`,
          relatedMedicationIds: [med.id],
        });
      }

      if (allMedications.length > 0) {
        try {
          const conflicts = await detectConflicts(
            allMedications,
            intakeData.allergiesDetail,
            intakeData.adverseEventsDetail
          );

          for (const conflict of conflicts) {
            await storage.createVerificationFlag({
              intakeId: intake.id,
              flagType: conflict.type,
              description: conflict.description,
              relatedMedicationIds: conflict.relatedMedIds || null,
            });
          }
        } catch (conflictError) {
          console.error("Conflict detection failed:", conflictError);
        }
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const token = await storage.createAccessToken({
        intakeId: intake.id,
        token: randomUUID(),
        expiresAt,
        isInvalidated: false,
      });

      res.json({ intake, token });
    } catch (error) {
      console.error("Failed to create intake:", error);
      res.status(500).json({ error: "Failed to create intake" });
    }
  });

  app.get("/api/intakes/:id", async (req: Request, res: Response) => {
    try {
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error) {
      console.error("Failed to get intake:", error);
      res.status(500).json({ error: "Failed to get intake" });
    }
  });

  app.delete("/api/intakes/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteIntake(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete intake:", error);
      res.status(500).json({ error: "Failed to delete intake" });
    }
  });

  app.get("/api/intakes/:id/token", async (req: Request, res: Response) => {
    try {
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }

      let token = await storage.getActiveTokenByIntakeId(req.params.id);
      
      if (!token) {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        token = await storage.createAccessToken({
          intakeId: intake.id,
          token: randomUUID(),
          expiresAt,
          isInvalidated: false,
        });
      }

      res.json({ intake, token });
    } catch (error) {
      console.error("Failed to get token:", error);
      res.status(500).json({ error: "Failed to get token" });
    }
  });

  app.post("/api/intakes/:id/token/regenerate", async (req: Request, res: Response) => {
    try {
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }

      await storage.invalidateTokensByIntakeId(req.params.id);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const token = await storage.createAccessToken({
        intakeId: intake.id,
        token: randomUUID(),
        expiresAt,
        isInvalidated: false,
      });

      res.json({ intake, token });
    } catch (error) {
      console.error("Failed to regenerate token:", error);
      res.status(500).json({ error: "Failed to regenerate token" });
    }
  });

  app.get("/api/view/:token", async (req: Request, res: Response) => {
    try {
      const tokenValue = req.params.token;
      
      const accessToken = await storage.getTokenByValue(tokenValue);
      if (!accessToken) {
        return res.status(410).json({ error: "Token expired or invalid" });
      }

      const summary = await storage.getIntakeSummary(accessToken.intakeId);
      if (!summary) {
        return res.status(404).json({ error: "Intake not found" });
      }

      await storage.createAccessLog({
        intakeId: accessToken.intakeId,
        tokenId: accessToken.id,
        action: "view",
      });

      res.json(summary);
    } catch (error) {
      console.error("Failed to view summary:", error);
      res.status(500).json({ error: "Failed to view summary" });
    }
  });

  app.get("/api/intakes/:id/logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAccessLogsByIntakeId(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Failed to get access logs:", error);
      res.status(500).json({ error: "Failed to get access logs" });
    }
  });

  return httpServer;
}
