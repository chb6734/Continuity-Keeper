import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, FileImage, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing?: boolean;
  maxFiles?: number;
}

export function DocumentUpload({ 
  onFilesSelected, 
  isProcessing = false,
  maxFiles = 5
}: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    const limitedFiles = newFiles.slice(0, maxFiles - selectedFiles.length);
    
    const newPreviews = limitedFiles.map(file => URL.createObjectURL(file));
    
    setSelectedFiles(prev => [...prev, ...limitedFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
    onFilesSelected([...selectedFiles, ...limitedFiles]);
  }, [selectedFiles, maxFiles, onFilesSelected]);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onFilesSelected(newFiles);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragOver && "border-primary bg-primary/5",
          !isDragOver && "border-muted-foreground/25"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          data-testid="input-file-upload"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          data-testid="input-camera-capture"
        />

        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileImage className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">처방전 또는 조제기록 사진 업로드</p>
            <p className="text-sm text-muted-foreground mt-1">
              드래그 앤 드롭하거나 버튼을 클릭하세요
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing || selectedFiles.length >= maxFiles}
              className="gap-2"
              data-testid="button-camera"
            >
              <Camera className="h-4 w-4" />
              카메라
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || selectedFiles.length >= maxFiles}
              className="gap-2"
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4" />
              파일 선택
            </Button>
          </div>
          {selectedFiles.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedFiles.length}/{maxFiles} 파일 선택됨
            </p>
          )}
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <Card 
              key={preview} 
              className="relative overflow-hidden aspect-[4/3]"
            >
              <img
                src={preview}
                alt={`업로드 이미지 ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {isProcessing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => removeFile(index)}
                  data-testid={`button-remove-file-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
