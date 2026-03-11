"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { uploadDocumentAction } from "@/actions/document";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Upload, FileText, AlertCircle, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { DocumentStatus } from "@prisma/client";

interface DocumentUploadZoneProps {
  dealId: string;
  documentId: string;
  documentType: string;
  status: DocumentStatus;
  fileUrl: string | null;
}

export function DocumentUploadZone({
  dealId,
  documentId,
  documentType,
  status,
  fileUrl,
}: DocumentUploadZoneProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit");
        setFile(null);
      } else if (!["application/pdf", "image/jpeg", "image/png"].includes(selectedFile.type)) {
        setError("Invalid file type. Only PDF, JPEG, and PNG are allowed.");
        setFile(null);
      } else {
        setError(null);
        setFile(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadDocumentAction(dealId, documentId, formData);
      if (result.success) {
        toast.success("Document uploaded successfully!");
        setFile(null);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong during upload");
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const isUploaded = status === DocumentStatus.UPLOADED;
  const isPending = status === DocumentStatus.PENDING;

  const displayType = documentType.split("_").join(" ");

  return (
    <Card className="rounded-[2rem] border-2 border-primary/5 overflow-hidden transition-all hover:shadow-lg shadow-sm">
      <CardHeader className="bg-primary/5 pb-6 pt-8 px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl text-primary shadow-sm ring-1 ring-primary/5">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tight italic">{displayType}</CardTitle>
          </div>
          <Badge 
            variant={isUploaded ? "default" : "outline"}
            className={`uppercase text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border-2 ${isUploaded ? "bg-green-100 text-green-700 border-green-200" : ""}`}
          >
            {isUploaded ? "Uploaded" : "Pending"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        {isUploaded ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-green-50/50 p-4 rounded-2xl border-2 border-green-100/20">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-green-800 uppercase tracking-tight">Requirement Met</p>
                <p className="text-xs font-medium text-green-700/70 italic">Your document has been securely stored.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={`/api/documents/${documentId}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full rounded-full h-12 px-6 font-black uppercase tracking-widest border-2 hover:bg-primary/5 group transition-all">
                  View File
                  <ExternalLink className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                </Button>
              </a>
              <div className="flex-1 relative">
                <input
                  type="file"
                  id={`replace-${documentId}`}
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <Button 
                  variant="ghost" 
                  onClick={() => document.getElementById(`replace-${documentId}`)?.click()}
                  className="w-full rounded-full h-12 px-6 font-black uppercase tracking-widest hover:bg-muted transition-all text-muted-foreground/60"
                >
                  Replace File
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative group">
              <input
                type="file"
                id={`upload-${documentId}`}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <div 
                onClick={() => document.getElementById(`upload-${documentId}`)?.click()}
                className={`border-2 border-dashed rounded-[1.5rem] p-8 text-center cursor-pointer transition-all hover:bg-primary/5 hover:border-primary/20 ${file ? "bg-primary/5 border-primary/30" : "border-primary/10 bg-muted/20"}`}
              >
                {file ? (
                  <div className="space-y-3">
                    <div className="bg-primary p-3 rounded-2xl w-fit mx-auto shadow-lg text-white">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight italic truncate max-w-xs mx-auto">{file.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="h-8 rounded-full text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-2xl w-fit mx-auto shadow-sm ring-1 ring-primary/5 text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black uppercase tracking-tight italic">Drop file or click to browse</p>
                      <p className="text-[10px] font-bold text-muted-foreground/40 uppercase">PDF, JPEG, or PNG (Max 10MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-destructive/5 p-4 rounded-2xl border-2 border-destructive/10 text-destructive animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-xs font-black uppercase tracking-tight leading-none">{error}</p>
              </div>
            )}

            <Button 
              disabled={!file || isUploading}
              onClick={handleUpload}
              className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-xl group disabled:opacity-50 disabled:shadow-none"
            >
              {isUploading ? "Uploading..." : "Secure Upload"}
              {!isUploading && <Upload className="ml-2 h-4 w-4 group-hover:-translate-y-1 transition-transform" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
