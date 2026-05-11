import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Save, CheckCircle, Info, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { StatusBadge, type StatusBadgeStatus } from "../components/StatusBadge";
import { toast } from "sonner";
import { fetchSpParasites, type SpParasiteDto } from "../../services/spParasitesApi";
import { fetchOrderDetailById, type OrderDetailListItem } from "../../services/orderDetailsListApi";
import { getEnums, enumLabel, type EnumsData } from "../../services/enumsApi";
import { analysisStateToBadgeStatus } from "../../utils/analysisStateForBadge";
import { formatTableDateTime } from "../../utils/tableDateFormat";
import {
  fetchAnalysisResultFecesParasitesByOrderDetail,
  putAnalysisResultFecesParasites,
} from "../../services/analysisResultFecesParasitesApi";
import { fetchSpWaterChecks, type SpWaterCheckItem } from "../../services/spWaterCheckApi";
import {
  fetchAnalysisResultParasiteWaterChecksByOrderDetail,
  postAnalysisResultParasiteWaterChecks,
  putAnalysisResultParasiteWaterChecks,
  type ParasiteWaterCheckResultRow,
} from "../../services/analysisResultParasiteWaterChecksApi";

/** Suv na'munasida gijja urug'i (sp-water-check) — checkbox emas, qiymat inputlari */
const WATER_CHECK_ANALYSIS_SHORT_NAME = "SNGUA";

function parasiteWaterPostDoneStorageKey(orderDetailId: number): string {
  return `parasiteWaterCheckUsedPost:${orderDetailId}`;
}

function buildParasiteWaterPayload(
  orderDetailId: number,
  waterValues: Record<number, string>
): ParasiteWaterCheckResultRow[] {
  return Object.entries(waterValues)
    .map(([idStr, result]) => ({
      orderDetailId,
      waterCheckId: Number(idStr),
      result: String(result ?? "").trim(),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.waterCheckId) &&
        row.waterCheckId > 0 &&
        row.result.length > 0
    );
}

function patientFio(row: OrderDetailListItem): string {
  const a = [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ").trim();
  return a || "—";
}

function sampleLine(row: OrderDetailListItem): string {
  const parts = [row.sampleName, row.sampleSourceName].filter((x) => x && String(x).trim());
  return parts.length ? parts.join(" · ") : "—";
}

/** «Hech qanday» va boshqa parazitlar birga kelsa, boshqa parazitlar ustun */
function applyNoneExclusiveSelection(ids: number[], noneId: number): number[] {
  const unique = [...new Set(ids)];
  const hasNone = unique.includes(noneId);
  const others = unique.filter((x) => x !== noneId);
  if (hasNone && others.length > 0) return others;
  if (hasNone) return [noneId];
  return others;
}

export default function AnalysisDetail() {
  const { id: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  /** Laboratoriya direktori alohida yo‘l — doim faqat ko‘rish */
  const isLabDirectorContext = location.pathname.startsWith("/lab-director/analysis/");
  const laborantListPath = "/laborant/analyses";
  const labDirectorListPath = "/lab-director/analyses";
  const listPath = isLabDirectorContext ? labDirectorListPath : laborantListPath;
  const orderDetailId = idParam ? Number.parseInt(idParam, 10) : NaN;
  /** `?mode=view` — faqat ko‘rish; direktor kontekstida ham faqat ko‘rish */
  const isReadOnly = searchParams.get("mode") === "view" || isLabDirectorContext;
  const [detail, setDetail] = useState<OrderDetailListItem | null>(null);
  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [status, setStatus] = useState<StatusBadgeStatus>("Pending");
  const [parasites, setParasites] = useState<SpParasiteDto[]>([]);
  const [loadingParasites, setLoadingParasites] = useState(false);
  const [selectedParasiteIds, setSelectedParasiteIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [resultsSaved, setResultsSaved] = useState(false);
  const [savingResults, setSavingResults] = useState(false);

  const [waterChecks, setWaterChecks] = useState<SpWaterCheckItem[]>([]);
  const [waterValues, setWaterValues] = useState<Record<number, string>>({});
  const [loadingWaterChecks, setLoadingWaterChecks] = useState(false);
  /** Birinchi muvaffaqiyatli saqlash POST bo‘lsa, keyingilar PUT (sessionStorage bilan sahifa yangilanganda ham). */
  const waterFirstSaveDoneRef = useRef(false);

  const isWaterCheckAnalysis =
    detail?.analysisShortName?.trim().toUpperCase() === WATER_CHECK_ANALYSIS_SHORT_NAME;

  /** Tasdiqlangan / bajarilgan — tahrirlash mumkin emas */
  const isConfirmedAnalysis = useMemo(() => {
    if (!detail) return false;
    if (detail.analysisStatus === 34) return true;
    return analysisStateToBadgeStatus(enums, detail.analysisStatus) === "Completed";
  }, [detail, enums]);

  useEffect(() => {
    let cancelled = false;
    if (!detail) {
      setParasites([]);
      setLoadingParasites(false);
      return;
    }
    if (detail.analysisShortName?.trim().toUpperCase() === WATER_CHECK_ANALYSIS_SHORT_NAME) {
      setParasites([]);
      setLoadingParasites(false);
      setSelectedParasiteIds([]);
      return;
    }
    (async () => {
      try {
        setLoadingParasites(true);
        const list = await fetchSpParasites();
        if (!cancelled) setParasites(list);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Parazitlar ro‘yxati yuklanmadi");
          setParasites([]);
        }
      } finally {
        if (!cancelled) setLoadingParasites(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail]);

  useEffect(() => {
    let cancelled = false;
    if (
      !detail ||
      detail.analysisShortName?.trim().toUpperCase() !== WATER_CHECK_ANALYSIS_SHORT_NAME ||
      !Number.isFinite(orderDetailId) ||
      orderDetailId <= 0
    ) {
      setWaterChecks([]);
      setWaterValues({});
      setLoadingWaterChecks(false);
      return;
    }
    (async () => {
      try {
        setLoadingWaterChecks(true);
        const [list, savedRows] = await Promise.all([
          fetchSpWaterChecks(),
          /** Tahrirlash / ko‘rish: saqlangan qiymatlar */
          fetchAnalysisResultParasiteWaterChecksByOrderDetail(orderDetailId).catch(() => []),
        ]);
        if (cancelled) return;
        setWaterChecks(list);
        const next: Record<number, string> = {};
        for (const x of list) next[x.id] = "";
        for (const r of savedRows) {
          next[r.waterCheckId] = r.result ?? "";
        }
        setWaterValues(next);
        if (savedRows.length > 0) {
          waterFirstSaveDoneRef.current = true;
          try {
            sessionStorage.setItem(parasiteWaterPostDoneStorageKey(orderDetailId), "1");
          } catch {
            /* jim */
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Suv tekshiruvlari ro‘yxati yuklanmadi");
          setWaterChecks([]);
          setWaterValues({});
        }
      } finally {
        if (!cancelled) setLoadingWaterChecks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, orderDetailId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(orderDetailId) || orderDetailId <= 0) {
        setDetail(null);
        setLoadingDetail(false);
        toast.error("Noto‘g‘ri buyurtma qatori identifikatori");
        return;
      }
      try {
        setLoadingDetail(true);
        const [e, row] = await Promise.all([getEnums(), fetchOrderDetailById(orderDetailId)]);
        if (cancelled) return;
        setEnums(e);
        setDetail(row);
        if (row) {
          setStatus(analysisStateToBadgeStatus(e, row.analysisStatus));
        } else {
          toast.error("Buyurtma qatori topilmadi");
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Ma’lumot yuklanmadi");
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderDetailId]);

  useEffect(() => {
    setResultsSaved(false);
  }, [orderDetailId]);

  useEffect(() => {
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0) {
      waterFirstSaveDoneRef.current = false;
      return;
    }
    try {
      waterFirstSaveDoneRef.current =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(parasiteWaterPostDoneStorageKey(orderDetailId)) === "1";
    } catch {
      waterFirstSaveDoneRef.current = false;
    }
  }, [orderDetailId]);

  /** Mavjud saqlangan natijalar — faqat `/sp-parasites` ro‘yxatida bor `spParasitesId` lar tanlanadi */
  useEffect(() => {
    let cancelled = false;
    if (!detail || detail.analysisShortName?.trim().toUpperCase() === WATER_CHECK_ANALYSIS_SHORT_NAME) {
      setSelectedParasiteIds([]);
      return;
    }
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0) {
      setSelectedParasiteIds([]);
      return;
    }
    if (loadingParasites || parasites.length === 0) return;

    (async () => {
      try {
        const rows = await fetchAnalysisResultFecesParasitesByOrderDetail(orderDetailId);
        if (cancelled) return;
        const known = new Set(parasites.map((p) => p.id));
        const fromApi = rows.map((r) => r.spParasitesId).filter((id) => known.has(id));
        const noneId = parasites.find((p) => /hech qanday/i.test(p.name))?.id ?? 21;
        setSelectedParasiteIds(applyNoneExclusiveSelection(fromApi, noneId));
      } catch {
        if (!cancelled) setSelectedParasiteIds([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detail, orderDetailId, parasites, loadingParasites]);

  const toggleParasite = (id: number) => {
    if (isReadOnly) return;
    const noneId =
      parasites.find((p) => /hech qanday/i.test(p.name))?.id ?? 21;
    setSelectedParasiteIds((prev) => {
      if (id === noneId) {
        return prev.includes(noneId) ? prev.filter((x) => x !== noneId) : [noneId];
      }
      const withoutNone = prev.filter((x) => x !== noneId);
      if (withoutNone.includes(id)) return withoutNone.filter((x) => x !== id);
      return [...withoutNone, id];
    });
  };

  const handleSaveWaterResults = useCallback(async () => {
    if (isReadOnly) return;
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0 || !detail) return;
    const payload = buildParasiteWaterPayload(orderDetailId, waterValues);
    if (payload.length === 0) {
      toast.error("Kamida bitta parametr uchun qiymat kiriting");
      return;
    }
    try {
      setSavingResults(true);
      const res = waterFirstSaveDoneRef.current
        ? await putAnalysisResultParasiteWaterChecks(orderDetailId, payload)
        : await postAnalysisResultParasiteWaterChecks(payload);
      if (res.success === false) {
        const errMsg =
          typeof res.message === "string" && res.message.trim()
            ? res.message.trim()
            : "Saqlash muvaffaqiyatsiz";
        toast.error(errMsg);
        return;
      }
      if (!waterFirstSaveDoneRef.current) {
        waterFirstSaveDoneRef.current = true;
        try {
          sessionStorage.setItem(parasiteWaterPostDoneStorageKey(orderDetailId), "1");
        } catch {
          /* jim */
        }
      }
      const okMsg =
        typeof res.message === "string" && res.message.trim()
          ? res.message.trim()
          : "Natijalar muvaffaqiyatli saqlandi.";
      toast.success(okMsg);
      navigate(listPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Natijalarni saqlab bo‘lmadi");
    } finally {
      setSavingResults(false);
    }
  }, [isReadOnly, orderDetailId, detail, waterValues, navigate, listPath]);

  const handleSaveResults = useCallback(async () => {
    if (isReadOnly) return;
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0 || !detail) return;
    const payload = selectedParasiteIds.map((spParasitesId) => ({
      orderDetailId,
      spParasitesId,
    }));
    try {
      setSavingResults(true);
      const res = await putAnalysisResultFecesParasites(orderDetailId, payload);
      if (res.success === false) {
        const errMsg = typeof res.message === "string" && res.message.trim() ? res.message.trim() : "Saqlash muvaffaqiyatsiz";
        toast.error(errMsg);
        return;
      }
      const okMsg =
        typeof res.message === "string" && res.message.trim()
          ? res.message.trim()
          : "Natijalar muvaffaqiyatli saqlandi.";
      toast.success(okMsg);
      navigate(listPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Natijalarni saqlab bo‘lmadi");
    } finally {
      setSavingResults(false);
    }
  }, [isReadOnly, orderDetailId, detail, selectedParasiteIds, navigate, listPath]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(listPath)}
              className="rounded-xl hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <div>
            <motion.h1
              className="text-2xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              Tahlil tafsilotlari
            </motion.h1>
            <p className="text-sm text-muted-foreground">
              Buyurtma qatori: #{Number.isFinite(orderDetailId) ? orderDetailId : "—"}
              {detail ? ` · Buyurtma № ${detail.orderId}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isReadOnly && !isLabDirectorContext && Number.isFinite(orderDetailId) && orderDetailId > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              disabled={isConfirmedAnalysis}
              title={isConfirmedAnalysis ? "Tasdiqlangan tahlilni tahrirlab bo‘lmaydi" : undefined}
              onClick={() => navigate(`/laborant/analysis/${orderDetailId}`)}
            >
              <Pencil className="h-4 w-4" />
              Tahrirlash
            </Button>
          )}
          <StatusBadge
            status={status}
            label={
              resultsSaved || !detail || !enums
                ? undefined
                : enumLabel(enums.analysisStates, detail.analysisStatus)
            }
          />
        </div>
      </div>

      {/* Patient Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Bemor va tahlil haqida ma’lumot
            </CardTitle>
            <CardDescription>Buyurtma qatori bo‘yicha ma’lumotlar</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
            ) : !detail ? (
              <p className="text-sm text-muted-foreground">Ma’lumot topilmadi.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Bemor (F.I.O)", value: patientFio(detail) },
                  { label: "Tahlil turi", value: detail.analysisNameUz || "—" },
                  // { label: "Tahlil qisqa nomi", value: detail.analysisShortName?.trim() || "—" },
                  { label: "Laboratoriya", value: detail.laboratoryNameUz || "—" },
                  { label: "Namuna", value: sampleLine(detail) },
                  { label: "Buyurtma sanasi", value: formatTableDateTime(detail.orderCreatedAt) },
                  {
                    label: "Natija vaqti",
                    value: detail.resultTime ? formatTableDateTime(detail.resultTime) : "—",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    className="p-4 bg-muted/50 rounded-xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-green-600 dark:text-green-400" />
              {isWaterCheckAnalysis ? "Suv tekshiruvi parametrlari" : "Parazitlar va topilmalar"}
            </CardTitle>
            <CardDescription>
              {isWaterCheckAnalysis
                ? isReadOnly
                  ? "Parametr qiymatlari (faqat ko‘rish)"
                  : "Faqat to‘ldirilgan parametrlar saqlashda yuboriladi"
                : isReadOnly
                  ? "Saqlangan belgilashlar (faqat ko‘rish)"
                  : "Aniqlangan parazitlarni belgilang"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {!detail && !loadingDetail ? (
                <p className="text-sm text-muted-foreground">Avval buyurtma qatorini yuklang.</p>
              ) : isWaterCheckAnalysis ? (
                loadingWaterChecks ? (
                  <p className="text-sm text-muted-foreground">Parametrlar ro‘yxati yuklanmoqda…</p>
                ) : waterChecks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ro‘yxat bo‘sh yoki yuklanmadi.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {waterChecks.map((w, index) => (
                      <motion.div
                        key={w.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + Math.min(index, 12) * 0.02 }}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3"
                      >
                        <Label htmlFor={`water-${w.id}`} className="text-sm font-medium leading-snug">
                          {w.name}
                        </Label>
                        <Input
                          id={`water-${w.id}`}
                          type="text"
                          placeholder="Qiymat"
                          value={waterValues[w.id] ?? ""}
                          readOnly={isReadOnly}
                          disabled={isReadOnly}
                          onChange={(e) =>
                            setWaterValues((prev) => ({
                              ...prev,
                              [w.id]: e.target.value,
                            }))
                          }
                          className="rounded-lg border-border bg-background"
                        />
                      </motion.div>
                    ))}
                  </div>
                )
              ) : loadingParasites ? (
                <p className="text-sm text-muted-foreground">Parazitlar ro‘yxati yuklanmoqda...</p>
              ) : parasites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ro‘yxat bo‘sh yoki yuklanmadi.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parasites.map((p, index) => {
                    const cbId = `parasite-${p.id}`;
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + Math.min(index, 12) * 0.02 }}
                      >
                        <label
                          htmlFor={cbId}
                          className={
                            isReadOnly
                              ? "flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 cursor-default opacity-95"
                              : "flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                          }
                        >
                          <Checkbox
                            id={cbId}
                            className="mt-0.5"
                            disabled={isReadOnly}
                            checked={selectedParasiteIds.includes(p.id)}
                            onCheckedChange={() => toggleParasite(p.id)}
                          />
                          <span className="text-sm font-medium leading-snug">{p.name}</span>
                        </label>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Label htmlFor="notes" className="font-semibold">Qo‘shimcha eslatmalar</Label>
                <Textarea
                  id="notes"
                  placeholder="Qo‘shimcha kuzatish yoki eslatmalarni kiriting..."
                  rows={4}
                  value={notes}
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl border-border focus:border-primary resize-none"
                />
              </motion.div>

              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {isReadOnly ? (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(listPath)}
                      className="w-full rounded-xl h-12"
                    >
                      Orqaga
                    </Button>
                  </motion.div>
                ) : isWaterCheckAnalysis ? (
                  <>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        type="button"
                        onClick={() => void handleSaveWaterResults()}
                        disabled={loadingDetail || !detail || savingResults || loadingWaterChecks}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 rounded-xl h-12"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {savingResults ? "Saqlanmoqda…" : "Natijalarni saqlash"}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(listPath)}
                        className="rounded-xl h-12 px-8"
                      >
                        Bekor qilish
                      </Button>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button 
                        onClick={() => void handleSaveResults()}
                        disabled={loadingDetail || !detail || savingResults}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 rounded-xl h-12"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {savingResults ? "Saqlanmoqda…" : "Natijalarni saqlash"}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(listPath)}
                        className="rounded-xl h-12 px-8"
                      >
                        Bekor qilish
                      </Button>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Holat haqida</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Natijalarni saqlaganingizda holat avtomatik ravishda “Jarayonda” bo‘ladi. 
                  Laboratoriya direktori tasdiqlagach, holat “Bajarildi” ga o‘tadi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
