import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, Pencil, X, AlertTriangle, Pill, ChevronLeft, ChevronRight } from "lucide-react";

export interface ExtractedMedication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  confidence: number;
}

export interface OcrResult {
  imageUrl: string;
  fileName: string;
  medications: ExtractedMedication[];
}

interface OcrVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocrResults: OcrResult[];
  onConfirm: (results: OcrResult[]) => void;
  onCancel: () => void;
}

export function OcrVerificationModal({
  open,
  onOpenChange,
  ocrResults,
  onConfirm,
  onCancel,
}: OcrVerificationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [results, setResults] = useState<OcrResult[]>(ocrResults);

  useEffect(() => {
    setResults(ocrResults);
    setCurrentIndex(0);
    setEditingMedId(null);
  }, [ocrResults]);

  const currentResult = results[currentIndex];
  const hasMultipleResults = results.length > 1;

  const handleMedicationChange = (
    medId: string,
    field: keyof ExtractedMedication,
    value: string
  ) => {
    setResults((prev) =>
      prev.map((result, idx) =>
        idx === currentIndex
          ? {
              ...result,
              medications: result.medications.map((med) =>
                med.id === medId ? { ...med, [field]: value } : med
              ),
            }
          : result
      )
    );
  };

  const handleDeleteMedication = (medId: string) => {
    setResults((prev) =>
      prev.map((result, idx) =>
        idx === currentIndex
          ? {
              ...result,
              medications: result.medications.filter((med) => med.id !== medId),
            }
          : result
      )
    );
  };

  const handleAddMedication = () => {
    const newMed: ExtractedMedication = {
      id: `new-${Date.now()}`,
      name: "",
      dose: "",
      frequency: "",
      duration: "",
      confidence: 100,
    };
    setResults((prev) =>
      prev.map((result, idx) =>
        idx === currentIndex
          ? { ...result, medications: [...result.medications, newMed] }
          : result
      )
    );
    setEditingMedId(newMed.id);
  };

  const handleConfirm = () => {
    onConfirm(results);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const goToNext = () => {
    if (currentIndex < results.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setEditingMedId(null);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setEditingMedId(null);
    }
  };

  if (!currentResult) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            OCR 결과 확인
          </DialogTitle>
          <DialogDescription>
            추출된 약물 정보가 맞는지 확인해주세요. 틀린 부분이 있으면 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span className="text-sm font-medium">{currentResult.fileName}</span>
              {hasMultipleResults && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                    data-testid="button-prev-image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} / {results.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNext}
                    disabled={currentIndex === results.length - 1}
                    data-testid="button-next-image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex-1 rounded-md border overflow-auto bg-muted/50 min-h-[300px]">
              <img
                src={currentResult.imageUrl}
                alt={currentResult.fileName}
                className="w-full h-auto object-contain"
                data-testid="img-prescription"
              />
            </div>
          </div>

          <div className="flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span className="text-sm font-medium">
                추출된 약물 ({currentResult.medications.length}개)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddMedication}
                data-testid="button-add-medication"
              >
                약물 추가
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-3">
                {currentResult.medications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>추출된 약물이 없습니다</p>
                    <p className="text-sm">직접 약물을 추가해주세요</p>
                  </div>
                ) : (
                  currentResult.medications.map((med) => (
                    <Card
                      key={med.id}
                      className={med.confidence < 70 ? "border-amber-500" : ""}
                    >
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            {editingMedId === med.id ? (
                              <Input
                                value={med.name}
                                onChange={(e) =>
                                  handleMedicationChange(med.id, "name", e.target.value)
                                }
                                className="w-48"
                                placeholder="약물명"
                                autoFocus
                                data-testid={`input-med-name-${med.id}`}
                              />
                            ) : (
                              <span>{med.name || "약물명 없음"}</span>
                            )}
                            {med.confidence < 70 && (
                              <Badge variant="outline" className="text-amber-600 border-amber-500">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                확인 필요
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            {editingMedId === med.id ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingMedId(null)}
                                data-testid={`button-save-med-${med.id}`}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingMedId(med.id)}
                                data-testid={`button-edit-med-${med.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMedication(med.id)}
                              data-testid={`button-delete-med-${med.id}`}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        {editingMedId === med.id ? (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">용량</Label>
                              <Input
                                value={med.dose}
                                onChange={(e) =>
                                  handleMedicationChange(med.id, "dose", e.target.value)
                                }
                                placeholder="예: 500mg"
                                className="mt-1"
                                data-testid={`input-med-dose-${med.id}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">복용 횟수</Label>
                              <Input
                                value={med.frequency}
                                onChange={(e) =>
                                  handleMedicationChange(med.id, "frequency", e.target.value)
                                }
                                placeholder="예: 1일 3회"
                                className="mt-1"
                                data-testid={`input-med-frequency-${med.id}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">복용 기간</Label>
                              <Input
                                value={med.duration}
                                onChange={(e) =>
                                  handleMedicationChange(med.id, "duration", e.target.value)
                                }
                                placeholder="예: 7일"
                                className="mt-1"
                                data-testid={`input-med-duration-${med.id}`}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {med.dose && <span>{med.dose}</span>}
                            {med.dose && med.frequency && <Separator orientation="vertical" className="h-4" />}
                            {med.frequency && <span>{med.frequency}</span>}
                            {(med.dose || med.frequency) && med.duration && <Separator orientation="vertical" className="h-4" />}
                            {med.duration && <span>{med.duration}</span>}
                            {!med.dose && !med.frequency && !med.duration && (
                              <span className="italic">상세 정보 없음</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-ocr">
            취소
          </Button>
          <Button onClick={handleConfirm} data-testid="button-confirm-ocr">
            <Check className="h-4 w-4 mr-2" />
            확인 완료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
