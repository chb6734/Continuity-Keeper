import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { randomUUID } from "crypto";
import { storage, seedHospitals } from "./storage";
import { extractMedicationsFromImage, detectConflicts } from "./gemini";
import { insertIntakeSchema, insertPrescriptionSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
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
  app.get("/api/patient", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getOrCreatePatient(userId);
      res.json(patient);
    } catch (error) {
      console.error("Failed to get/create patient:", error);
      res.status(500).json({ error: "Failed to get/create patient" });
    }
  });

  // ==================== 처방 기록 API (별도 저장) ====================
  app.post("/api/prescriptions/import", isAuthenticated, upload.array("documents", 5), async (req: any, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const { chiefComplaint, hospitalName } = req.body;
      const userId = req.user.claims.sub;

      const patient = await storage.getOrCreatePatient(userId);
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

  app.get("/api/prescriptions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.json([]);
      }
      const prescriptions = await storage.getPrescriptionsByPatientId(patient.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Failed to get prescriptions:", error);
      res.status(500).json({ error: "Failed to get prescriptions" });
    }
  });

  // ==================== 증상별 과거 기록 및 통계 API ====================
  app.get("/api/symptom-history/:chiefComplaint", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { chiefComplaint } = req.params;
      const userId = req.user.claims.sub;
      
      const patient = await storage.getPatientByUserId(userId);
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

  app.get("/api/medication-stats/:chiefComplaint", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { chiefComplaint } = req.params;
      const userId = req.user.claims.sub;
      
      const patient = await storage.getPatientByUserId(userId);
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
  app.get("/api/intakes", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.json([]);
      }
      const intakes = await storage.getIntakesByPatientId(patient.id);
      res.json(intakes);
    } catch (error) {
      console.error("Failed to get intakes:", error);
      res.status(500).json({ error: "Failed to get intakes" });
    }
  });

  app.post("/api/intakes", isAuthenticated, upload.array("documents", 5), async (req: any, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const userId = req.user.claims.sub;
      
      const patient = await storage.getOrCreatePatient(userId);
      const patientId = patient.id;

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

      if (req.body.verifiedMedications) {
        try {
          const verifiedMeds = JSON.parse(req.body.verifiedMedications);
          
          if (verifiedMeds.length > 0 && patientId) {
            const prescription = await storage.createPrescription({
              patientId,
              chiefComplaint: intakeData.chiefComplaint || null,
              hospitalName: intakeData.hospitalName || null,
              prescriptionDate: null,
              dispensingDate: null,
              rawOcrText: null,
            });

            for (const med of verifiedMeds) {
              await storage.createPrescriptionMedication({
                prescriptionId: prescription.id,
                medicationName: med.name,
                dose: med.dose,
                frequency: med.frequency,
                duration: med.duration,
                confidence: 100,
                needsVerification: false,
                ingredients: null,
                indication: null,
                dosesPerDay: null,
                totalDoses: null,
              });
            }
          }

          for (const med of verifiedMeds) {
            const medication = await storage.createMedication({
              intakeId: intake.id,
              medicationName: med.name,
              dose: med.dose,
              frequency: med.frequency,
              duration: med.duration,
              prescriptionDate: null,
              dispensingDate: null,
              confidence: 100,
              needsVerification: false,
              rawOcrText: null,
              sourceType: "verified_prescription",
              ingredients: null,
              indication: null,
              dosesPerDay: null,
              totalDoses: null,
            });
            allMedications.push(medication);
          }
        } catch (parseError) {
          console.error("Failed to parse verified medications:", parseError);
        }
      } else {
        for (const file of files) {
          try {
            const ocrResult = await extractMedicationsFromImage(
              file.buffer,
              file.mimetype
            );

            if (ocrResult.medications.length > 0) {
              if (patientId) {
                const prescription = await storage.createPrescription({
                  patientId,
                  chiefComplaint: intakeData.chiefComplaint || null,
                  hospitalName: intakeData.hospitalName || null,
                  prescriptionDate: ocrResult.medications[0].prescriptionDate || null,
                  dispensingDate: ocrResult.medications[0].dispensingDate || null,
                  rawOcrText: ocrResult.rawText,
                });

                for (const med of ocrResult.medications) {
                  await storage.createPrescriptionMedication({
                    prescriptionId: prescription.id,
                    medicationName: med.medicationName,
                    dose: med.dose,
                    frequency: med.frequency,
                    duration: med.duration,
                    confidence: med.confidence,
                    needsVerification: med.confidence < 70,
                    ingredients: med.ingredients,
                    indication: med.indication,
                    dosesPerDay: med.dosesPerDay,
                    totalDoses: med.totalDoses,
                  });
                }
              }
            }

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
                ingredients: med.ingredients,
                indication: med.indication,
                dosesPerDay: med.dosesPerDay,
                totalDoses: med.totalDoses,
              });
              allMedications.push(medication);
            }
          } catch (ocrError) {
            console.error("OCR failed for file:", ocrError);
          }
        }
      }
      
      if (req.body.existingPrescriptionIds) {
        try {
          const prescriptionIds = JSON.parse(req.body.existingPrescriptionIds);
          
          for (const prescriptionId of prescriptionIds) {
            const prescriptionMeds = await storage.getPrescriptionMedications(prescriptionId);
            
            for (const pMed of prescriptionMeds) {
              const medication = await storage.createMedication({
                intakeId: intake.id,
                medicationName: pMed.medicationName,
                dose: pMed.dose,
                frequency: pMed.frequency,
                duration: pMed.duration,
                prescriptionDate: null,
                dispensingDate: null,
                confidence: pMed.confidence,
                needsVerification: pMed.needsVerification,
                rawOcrText: null,
                sourceType: "existing_prescription",
                ingredients: pMed.ingredients,
                indication: pMed.indication,
                dosesPerDay: pMed.dosesPerDay,
                totalDoses: pMed.totalDoses,
              });
              allMedications.push(medication);
            }
          }
        } catch (parseError) {
          console.error("Failed to parse existing prescription IDs:", parseError);
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
            intakeData.allergiesDetail ?? null,
            intakeData.adverseEventsDetail ?? null
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

  app.get("/api/intakes/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(403).json({ error: "Access denied" });
      }
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      if (intake.patientId !== patient.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(intake);
    } catch (error) {
      console.error("Failed to get intake:", error);
      res.status(500).json({ error: "Failed to get intake" });
    }
  });

  app.delete("/api/intakes/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(403).json({ error: "Access denied" });
      }
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      if (intake.patientId !== patient.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteIntake(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete intake:", error);
      res.status(500).json({ error: "Failed to delete intake" });
    }
  });

  app.get("/api/intakes/:id/token", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(403).json({ error: "Access denied" });
      }
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      if (intake.patientId !== patient.id) {
        return res.status(403).json({ error: "Access denied" });
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

  app.post("/api/intakes/:id/token/regenerate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(403).json({ error: "Access denied" });
      }
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      if (intake.patientId !== patient.id) {
        return res.status(403).json({ error: "Access denied" });
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

  app.get("/api/intakes/:id/logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(403).json({ error: "Access denied" });
      }
      const intake = await storage.getIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      if (intake.patientId !== patient.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const logs = await storage.getAccessLogsByIntakeId(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Failed to get access logs:", error);
      res.status(500).json({ error: "Failed to get access logs" });
    }
  });

  // ==================== 알림 API ====================
  app.get("/api/notifications", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.json({ notifications: [], unreadCount: 0 });
      }

      const [notificationList, unreadCount] = await Promise.all([
        storage.getNotificationsByPatientId(patient.id),
        storage.getUnreadNotificationCount(patient.id),
      ]);

      res.json({ notifications: notificationList, unreadCount });
    } catch (error) {
      console.error("Failed to get notifications:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: any, res: Response) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      await storage.markAllNotificationsAsRead(patient.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // ==================== 알림 설정 API ====================
  app.get("/api/notification-settings", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getOrCreatePatient(userId);
      
      let settings = await storage.getNotificationSettings(patient.id);
      
      if (!settings) {
        settings = await storage.createOrUpdateNotificationSettings(patient.id, {
          medicationReminder: true,
          followUpReminder: true,
          intakeViewedAlert: true,
          reminderTime: "09:00",
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Failed to get notification settings:", error);
      res.status(500).json({ error: "Failed to get notification settings" });
    }
  });

  app.post("/api/notification-settings", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getOrCreatePatient(userId);
      const settings = await storage.createOrUpdateNotificationSettings(patient.id, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // ==================== 복약 순응도 API ====================
  app.get("/api/adherence", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.json({ 
          totalScheduled: 0, 
          takenCount: 0, 
          missedCount: 0, 
          skippedCount: 0, 
          adherenceRate: 100, 
          recentLogs: [] 
        });
      }

      const summary = await storage.getAdherenceSummary(patient.id);
      res.json(summary);
    } catch (error) {
      console.error("Failed to get adherence summary:", error);
      res.status(500).json({ error: "Failed to get adherence summary" });
    }
  });

  app.get("/api/adherence/logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.json([]);
      }

      const logs = await storage.getAdherenceLogsByPatientId(patient.id);
      res.json(logs);
    } catch (error) {
      console.error("Failed to get adherence logs:", error);
      res.status(500).json({ error: "Failed to get adherence logs" });
    }
  });

  app.post("/api/adherence/log", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const { medicationId, prescriptionMedicationId, medicationName, scheduledTime, status, takenAt, note } = req.body;
      
      if (!medicationName) {
        return res.status(400).json({ error: "medicationName is required" });
      }
      
      const log = await storage.createAdherenceLog({
        patientId: patient.id,
        medicationId: medicationId || null,
        prescriptionMedicationId: prescriptionMedicationId || null,
        medicationName,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
        status: status || "taken",
        takenAt: takenAt ? new Date(takenAt) : null,
        note: note || null,
      });

      res.json(log);
    } catch (error) {
      console.error("Failed to create adherence log:", error);
      res.status(500).json({ error: "Failed to create adherence log" });
    }
  });

  // ==================== 처방 전체 조회 (약물 포함) API ====================
  app.get("/api/prescriptions-with-meds", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.json([]);
      }

      const prescriptions = await storage.getPrescriptionsWithMedications(patient.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Failed to get prescriptions with medications:", error);
      res.status(500).json({ error: "Failed to get prescriptions with medications" });
    }
  });

  // 처방 기록 삭제 API
  app.delete("/api/prescriptions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(403).json({ error: "Access denied" });
      }

      const prescription = await storage.getPrescription(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      if (prescription.patientId !== patient.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deletePrescription(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete prescription:", error);
      res.status(500).json({ error: "Failed to delete prescription" });
    }
  });

  // 처방 기록 수정 API
  app.patch("/api/prescriptions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(403).json({ error: "Access denied" });
      }

      const prescription = await storage.getPrescription(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      if (prescription.patientId !== patient.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { hospitalName, prescriptionDate, dispensingDate, chiefComplaint } = req.body;
      const updated = await storage.updatePrescription(req.params.id, {
        hospitalName,
        prescriptionDate,
        dispensingDate,
        chiefComplaint,
      });

      res.json(updated);
    } catch (error) {
      console.error("Failed to update prescription:", error);
      res.status(500).json({ error: "Failed to update prescription" });
    }
  });

  // 빠른 처방 기록 API (접수 없이 직접 처방전 업로드)
  app.post("/api/prescriptions/quick-upload", isAuthenticated, upload.single("documents"), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const patient = await storage.getOrCreatePatient(userId);
      const file = req.file as Express.Multer.File;

      if (!file) {
        return res.status(400).json({ error: "파일을 선택해주세요" });
      }

      const { hospitalName, chiefComplaint, prescriptionDate } = req.body;

      const ocrResult = await extractMedicationsFromImage(file.buffer, file.mimetype);

      const prescription = await storage.createPrescription({
        patientId: patient.id,
        chiefComplaint: chiefComplaint || null,
        hospitalName: hospitalName || null,
        prescriptionDate: prescriptionDate || ocrResult.medications[0]?.prescriptionDate || null,
        dispensingDate: ocrResult.medications[0]?.dispensingDate || null,
        rawOcrText: ocrResult.rawText,
      });

      for (const med of ocrResult.medications) {
        await storage.createPrescriptionMedication({
          prescriptionId: prescription.id,
          medicationName: med.medicationName,
          dose: med.dose,
          frequency: med.frequency,
          duration: med.duration,
          confidence: med.confidence,
          needsVerification: med.confidence < 80,
          ingredients: null,
          indication: null,
          dosesPerDay: null,
          totalDoses: null,
        });
      }

      res.json({ 
        prescription, 
        medicationCount: ocrResult.medications.length 
      });
    } catch (error) {
      console.error("Failed to quick upload prescription:", error);
      res.status(500).json({ error: "처방전 분석에 실패했습니다" });
    }
  });

  // 접수가 의료진에 의해 조회되었을 때 알림 생성 (view API 수정)
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

      // 환자에게 조회 알림 생성
      if (summary.intake.patientId) {
        const settings = await storage.getNotificationSettings(summary.intake.patientId);
        if (!settings || settings.intakeViewedAlert) {
          await storage.createNotification({
            patientId: summary.intake.patientId,
            type: "intake_viewed",
            title: "의료진 조회 알림",
            message: `${summary.intake.hospitalName}에서 접수 정보를 확인했습니다.`,
            relatedIntakeId: summary.intake.id,
          });
        }
      }

      res.json(summary);
    } catch (error) {
      console.error("Failed to view summary:", error);
      res.status(500).json({ error: "Failed to view summary" });
    }
  });

  return httpServer;
}
