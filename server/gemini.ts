import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const extractedMedicationSchema = z.object({
  medicationName: z.string().min(1, "약물명은 필수입니다"),
  dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  prescriptionDate: z.string().nullable().optional(),
  dispensingDate: z.string().nullable().optional(),
  confidence: z.number().int().min(0).max(100),
  // 확장 필드
  ingredients: z.string().nullable().optional(), // 약물 성분
  indication: z.string().nullable().optional(), // 적응증/처방 목적
  dosesPerDay: z.number().int().nullable().optional(), // 1일 복용 횟수
  totalDoses: z.number().int().nullable().optional(), // 총 복용 횟수
});

const ocrResponseSchema = z.object({
  medications: z.array(extractedMedicationSchema),
  rawText: z.string(),
  hospitalName: z.string().nullable().optional(),
  patientCondition: z.string().nullable().optional(), // 진단명/상병명
});

export interface ExtractedMedication {
  medicationName: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  prescriptionDate: string | null;
  dispensingDate: string | null;
  confidence: number;
  rawOcrText: string;
  // 확장 필드
  ingredients: string | null;
  indication: string | null;
  dosesPerDay: number | null;
  totalDoses: number | null;
}

export interface OcrResult {
  medications: ExtractedMedication[];
  rawText: string;
  hospitalName?: string | null;
  patientCondition?: string | null;
  errors?: string[];
}

export async function extractMedicationsFromImage(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<OcrResult> {
  try {
    const base64Image = imageBuffer.toString("base64");

    const prompt = `이 이미지는 한국의 처방전 또는 조제기록입니다. 
이미지에서 약물 정보를 상세하게 추출해주세요.

다음 형식의 JSON으로 응답해주세요:
{
  "medications": [
    {
      "medicationName": "약물명",
      "dose": "용량 (예: 500mg, 1정)",
      "frequency": "복용 빈도 (예: 1일 3회)",
      "duration": "복용 기간 (예: 7일분)",
      "prescriptionDate": "처방일 (YYYY-MM-DD 형식)",
      "dispensingDate": "조제일 (YYYY-MM-DD 형식)",
      "confidence": 신뢰도 (0-100 정수),
      "ingredients": "약물의 주요 성분 (약학 지식 기반으로 추론)",
      "indication": "처방 목적/적응증 (어떤 증상이나 질병에 사용되는지)",
      "dosesPerDay": 1일 복용 횟수 (정수),
      "totalDoses": 총 복용 횟수 (기간 x 1일 복용 횟수)
    }
  ],
  "rawText": "이미지에서 읽은 전체 텍스트",
  "hospitalName": "처방/조제 기관명",
  "patientCondition": "진단명 또는 상병명 (있는 경우)"
}

주의사항:
- 날짜가 불분명하면 null로 표시
- 신뢰도가 낮으면 60-70 사이로 표시
- 읽을 수 없는 정보는 null로 표시
- 약물명은 최대한 정확하게 추출
- ingredients는 약물명을 기반으로 일반적인 성분을 추론 (예: 타이레놀 -> 아세트아미노펜)
- indication은 약물의 일반적인 용도를 추론 (예: 타이레놀 -> 해열/진통)
- 복용 빈도에서 1일 복용 횟수를 추출 (예: "1일 3회" -> dosesPerDay: 3)`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  medicationName: { type: Type.STRING },
                  dose: { type: Type.STRING, nullable: true },
                  frequency: { type: Type.STRING, nullable: true },
                  duration: { type: Type.STRING, nullable: true },
                  prescriptionDate: { type: Type.STRING, nullable: true },
                  dispensingDate: { type: Type.STRING, nullable: true },
                  confidence: { type: Type.INTEGER },
                  ingredients: { type: Type.STRING, nullable: true },
                  indication: { type: Type.STRING, nullable: true },
                  dosesPerDay: { type: Type.INTEGER, nullable: true },
                  totalDoses: { type: Type.INTEGER, nullable: true },
                },
                required: ["medicationName", "confidence"],
              },
            },
            rawText: { type: Type.STRING },
            hospitalName: { type: Type.STRING, nullable: true },
            patientCondition: { type: Type.STRING, nullable: true },
          },
          required: ["medications", "rawText"],
        },
      },
    });

    const rawResult = JSON.parse(response.text || "{}");
    
    const validationResult = ocrResponseSchema.safeParse(rawResult);
    
    if (!validationResult.success) {
      console.warn("OCR response validation failed:", validationResult.error);
      return {
        medications: rawResult.medications?.filter((med: any) => 
          med.medicationName && typeof med.medicationName === "string"
        ).map((med: any) => ({
          medicationName: String(med.medicationName),
          dose: med.dose ? String(med.dose) : null,
          frequency: med.frequency ? String(med.frequency) : null,
          duration: med.duration ? String(med.duration) : null,
          prescriptionDate: med.prescriptionDate ? String(med.prescriptionDate) : null,
          dispensingDate: med.dispensingDate ? String(med.dispensingDate) : null,
          confidence: typeof med.confidence === "number" ? Math.min(100, Math.max(0, Math.round(med.confidence))) : 50,
          rawOcrText: rawResult.rawText || "",
          ingredients: med.ingredients ? String(med.ingredients) : null,
          indication: med.indication ? String(med.indication) : null,
          dosesPerDay: typeof med.dosesPerDay === "number" ? med.dosesPerDay : null,
          totalDoses: typeof med.totalDoses === "number" ? med.totalDoses : null,
        })) || [],
        rawText: rawResult.rawText || "",
        hospitalName: rawResult.hospitalName || null,
        patientCondition: rawResult.patientCondition || null,
        errors: validationResult.error.errors.map(e => e.message),
      };
    }

    return {
      medications: validationResult.data.medications.map((med) => ({
        medicationName: med.medicationName,
        dose: med.dose || null,
        frequency: med.frequency || null,
        duration: med.duration || null,
        prescriptionDate: med.prescriptionDate || null,
        dispensingDate: med.dispensingDate || null,
        confidence: med.confidence,
        rawOcrText: validationResult.data.rawText,
        ingredients: med.ingredients || null,
        indication: med.indication || null,
        dosesPerDay: med.dosesPerDay || null,
        totalDoses: med.totalDoses || null,
      })),
      rawText: validationResult.data.rawText,
      hospitalName: validationResult.data.hospitalName || null,
      patientCondition: validationResult.data.patientCondition || null,
    };
  } catch (error) {
    console.error("OCR extraction failed:", error);
    return {
      medications: [],
      rawText: "",
      errors: [error instanceof Error ? error.message : "OCR 처리 중 오류 발생"],
    };
  }
}

export async function detectConflicts(
  medications: ExtractedMedication[],
  allergies: string | null,
  adverseEvents: string | null
): Promise<Array<{ type: string; description: string; relatedMedIds?: string[] }>> {
  if (medications.length === 0) return [];

  try {
    const prompt = `다음 약물 목록에서 잠재적인 문제점을 확인해주세요:

약물 목록:
${medications.map((m, i) => `${i + 1}. ${m.medicationName} (용량: ${m.dose || "불명"}, 기간: ${m.duration || "불명"})`).join("\n")}

환자 보고 알레르기: ${allergies || "없음"}
환자 보고 부작용: ${adverseEvents || "없음"}

다음 유형의 문제를 확인하세요:
1. duplicate: 동일/유사 약물 중복
2. date_overlap: 복용 기간 중복
3. allergy_conflict: 알레르기 약물과의 충돌 가능성
4. low_confidence: OCR 신뢰도가 낮은 항목

JSON 배열로 응답해주세요:
[
  {
    "type": "duplicate|date_overlap|allergy_conflict|low_confidence",
    "description": "문제 설명 (한국어)"
  }
]

문제가 없으면 빈 배열 []을 반환하세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["type", "description"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Conflict detection failed:", error);
    return [];
  }
}
