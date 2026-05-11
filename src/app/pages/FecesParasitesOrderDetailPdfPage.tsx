import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";
import { fetchFecesParasitesPdfBlobByOrderDetail } from "../../services/analysisResultFecesParasitesApi";
import { fetchParasiteWaterChecksPdfBlobByOrderDetail } from "../../services/analysisResultParasiteWaterChecksApi";

const LIST_PATH = "/lab-director/analyses";

export default function FecesParasitesOrderDetailPdfPage() {
  const { orderDetailId: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderDetailId = idParam ? Number.parseInt(idParam, 10) : NaN;
  const analysisShortName = useMemo(
    () => searchParams.get("analysisShortName")?.trim().toUpperCase() ?? "",
    [searchParams]
  );
  const isWaterCheckPdf = analysisShortName === "SNGUA";

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState(`analysis-result-${idParam ?? "buyurtma"}.pdf`);

  useEffect(() => {
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0) {
      setLoading(false);
      setError("Noto‘g‘ri buyurtma qatori identifikatori");
      setPdfUrl(null);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });

        const blob = isWaterCheckPdf
          ? await fetchParasiteWaterChecksPdfBlobByOrderDetail(orderDetailId)
          : await fetchFecesParasitesPdfBlobByOrderDetail(orderDetailId);
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setPdfUrl(url);
        setFileName(
          isWaterCheckPdf
            ? `parasite-water-checks-${orderDetailId}.pdf`
            : `feces-parasites-${orderDetailId}.pdf`
        );
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "PDF yuklanmadi";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setPdfUrl(null);
    };
  }, [isWaterCheckPdf, orderDetailId]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(LIST_PATH)} aria-label="Orqaga">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Tahlil natijasi (PDF)</h1>
            <p className="text-sm text-muted-foreground">
              Buyurtma qatori: #{Number.isFinite(orderDetailId) ? orderDetailId : "—"}
              {analysisShortName ? ` · ${analysisShortName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => navigate(LIST_PATH)}>
            Ro‘yxatga qaytish
          </Button>
          <Button type="button" variant="default" size="sm" className="gap-1" disabled={!pdfUrl} onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Yuklab olish
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[70vh] items-center justify-center text-muted-foreground">PDF yuklanmoqda...</div>
          ) : error ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : pdfUrl ? (
            <iframe title="Tahlil natijasi PDF" src={pdfUrl} className="h-[min(85vh,900px)] w-full border-0 bg-muted/30" />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
