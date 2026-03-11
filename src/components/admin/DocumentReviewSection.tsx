import * as React from "react";
import { DealDocument, DocumentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { verifyDocumentAction, rejectDocumentAction } from "@/actions/document";

interface DocumentReviewSectionProps {
  documents: DealDocument[];
}

export function DocumentReviewSection({ documents }: DocumentReviewSectionProps) {
  if (documents.length === 0) {
    return (
      <div className="bg-muted/30 border-2 border-dashed rounded-3xl p-12 text-center">
        <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest italic italic-bold">No document requirements found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {documents.map((doc) => {
        const isUploaded = doc.documentStatus === DocumentStatus.UPLOADED;
        const isPending = doc.documentStatus === DocumentStatus.PENDING;
        const isVerified = doc.documentStatus === DocumentStatus.VERIFIED;
        const isRejected = doc.documentStatus === DocumentStatus.REJECTED;

        const displayType = doc.documentType.split("_").join(" ");

        return (
          <Card key={doc.id} className="rounded-2xl border-2 shadow-none overflow-hidden border-primary/10 bg-background group">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/5 p-2 rounded-lg text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Type</p>
                    <p className="font-bold text-sm uppercase tracking-tight">{displayType}</p>
                  </div>
                </div>
                <Badge 
                  variant={isVerified ? "default" : isRejected ? "destructive" : "outline"}
                  className={`uppercase text-[9px] font-black px-2 py-0.5 rounded-full border-2 ${isVerified ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                >
                  {doc.documentStatus}
                </Badge>
              </div>

              <div className="flex flex-col gap-4">
                {doc.fileUrl ? (
                  <a 
                    href={`/api/documents/${doc.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-primary/5 hover:bg-primary/5 transition-colors group/link"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover/link:text-primary transition-colors">View Document</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover/link:text-primary transition-colors" />
                  </a>
                ) : (
                  <div className="p-3 rounded-xl bg-muted/10 border border-dashed border-primary/5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">Waiting for upload</span>
                  </div>
                )}

                {isUploaded && (
                  <div className="flex gap-2 pt-2">
                    <form action={async () => { "use server"; await verifyDocumentAction(doc.id); }} className="flex-1">
                      <Button size="sm" className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-9 bg-green-600 hover:bg-green-700 shadow-md">
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Verify
                      </Button>
                    </form>
                    <form action={async () => { "use server"; await rejectDocumentAction(doc.id); }} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-9 border-2 border-destructive text-destructive hover:bg-destructive hover:text-white transition-all">
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
