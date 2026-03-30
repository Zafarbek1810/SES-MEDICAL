import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ResultShareDialog } from "../components/ResultShareDialog";
import { StatusBadge } from "../components/StatusBadge";
import {
  getEnums,
  enumEntryDisplayLabel,
  enumLabel,
  type EnumsData,
  type EnumEntry,
} from "../../services/enumsApi";
import { fetchLaboratories, type LaboratoryDto } from "../../services/laboratoriesApi";
import { fetchAnalyses, type AnalysisDto } from "../../services/analysesApi";
import {
  fetchOrderDetailsList,
  type OrderDetailListItem,
  type OrderDetailListFilters,
} from "../../services/orderDetailsListApi";
import { formatTableDateTime } from "../../utils/tableDateFormat";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function patientFio(row: OrderDetailListItem): string {
  const a = [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ").trim();
  return a || "—";
}

function objectFio(row: OrderDetailListItem): string {
  const parts = [row.sampleName, row.sampleSourceName].filter((x) => x && String(x).trim());
  return parts.length ? parts.join(" · ") : "—";
}

function money(n: number) {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Math.max(0, n));
}

function getAnalysisStateEntry(enums: EnumsData | null, value: number): EnumEntry | undefined {
  return enums?.analysisStates?.find((e) => e.value === value);
}

/**
 * `StatusBadge` ranglari: enum `name` / `labelUz` va `value` (14/24/34/44).
 * 14 PENDING → Jarayonda, 24 RESULT_READY → Kutilmoqda, 34 APPROVED → Tasdiqlangan, 44 REJECTED.
 */
function analysisStateToBadgeStatus(
  enums: EnumsData | null,
  value: number
): "Pending" | "In Progress" | "Completed" | "Rejected" {
  const entry = getAnalysisStateEntry(enums, value);
  const name = (entry?.name ?? "").trim().toUpperCase();
  const label = (entry?.labelUz ?? "").trim().toLowerCase();

  if (name === "REJECTED" || /rad etilgan/.test(label)) return "Rejected";

  const completedNames = new Set([
    "COMPLETED",
    "APPROVED",
    "DONE",
    "RETURNED",
    "PAID",
    "FINISHED",
    "SUCCESS",
    "CLOSED",
    "READY",
  ]);
  if (completedNames.has(name)) return "Completed";
  if (
    /tasdiqlangan|bajaril|tasdiql|tugall|yakun|tayyor| chiqarildi/.test(label) &&
    name !== "RESULT_READY"
  ) {
    return "Completed";
  }

  const inProgressNames = new Set([
    "PENDING",
    "IN_PROGRESS",
    "PROCESSING",
    "RUNNING",
    "WAITING",
    "ASSIGNED",
    "STARTED",
  ]);
  if (name === "PENDING" || inProgressNames.has(name)) return "In Progress";
  if (/jarayonda/.test(label)) return "In Progress";

  if (name === "RESULT_READY" || /kutilmoqda/.test(label)) return "Pending";

  if (!entry) {
    if (value === 34) return "Completed";
    if (value === 44) return "Rejected";
    if (value === 14) return "In Progress";
    if (value === 24) return "Pending";
  }

  return "Pending";
}

function isAnalysisApproved(enums: EnumsData | null, analysisStatusValue: number): boolean {
  const entry = getAnalysisStateEntry(enums, analysisStatusValue);
  const n = (entry?.name ?? "").trim().toUpperCase();
  if (n === "APPROVED") return true;
  if (!entry && analysisStatusValue === 34) return true;
  return false;
}

export default function CashierAnalysesPage() {
  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [laboratories, setLaboratories] = useState<LaboratoryDto[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisDto[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  const [items, setItems] = useState<OrderDetailListItem[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filterLab, setFilterLab] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAnalysisId, setFilterAnalysisId] = useState("");
  const [filterPatient, setFilterPatient] = useState("");
  const [filterSample, setFilterSample] = useState("");

  const debouncedPatient = useDebouncedValue(filterPatient, 400);
  const debouncedSample = useDebouncedValue(filterSample, 400);

  const listFilters = useMemo((): OrderDetailListFilters | undefined => {
    const f: OrderDetailListFilters = {};
    if (filterLab !== "") {
      const n = Number(filterLab);
      if (Number.isFinite(n)) f.laboratoryId = n;
    }
    if (filterStatus !== "") {
      const n = Number(filterStatus);
      if (Number.isFinite(n)) f.analysisStatus = n;
    }
    if (filterAnalysisId !== "") {
      const n = Number(filterAnalysisId);
      if (Number.isFinite(n)) f.analysisId = n;
    }
    if (debouncedPatient.trim()) f.patientName = debouncedPatient.trim();
    if (debouncedSample.trim()) f.sampleName = debouncedSample.trim();
    return Object.keys(f).length > 0 ? f : undefined;
  }, [filterLab, filterStatus, filterAnalysisId, debouncedPatient, debouncedSample]);

  useEffect(() => {
    setPage(0);
  }, [debouncedPatient, debouncedSample]);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareRow, setShareRow] = useState<OrderDetailListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingRef(true);
    Promise.all([getEnums(), fetchLaboratories(), fetchAnalyses()])
      .then(([e, labs, ans]) => {
        if (!cancelled) {
          setEnums(e);
          setLaboratories(labs);
          setAnalyses(ans);
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Ma’lumotlar yuklanmadi"))
      .finally(() => {
        if (!cancelled) setLoadingRef(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchOrderDetailsList(page, pageSize, listFilters);
      setItems(p.items);
      setTotalPages(Math.max(1, p.totalPages));
      setTotalElements(p.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ro‘yxat yuklanmadi");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, listFilters]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const patchFilters = (patch: {
    filterLab?: string;
    filterStatus?: string;
    filterAnalysisId?: string;
  }) => {
    if (patch.filterLab !== undefined) setFilterLab(patch.filterLab);
    if (patch.filterStatus !== undefined) setFilterStatus(patch.filterStatus);
    if (patch.filterAnalysisId !== undefined) setFilterAnalysisId(patch.filterAnalysisId);
    setPage(0);
  };

  const clearFilters = () => {
    setFilterLab("");
    setFilterStatus("");
    setFilterAnalysisId("");
    setFilterPatient("");
    setFilterSample("");
    setPage(0);
  };

  const openShare = (row: OrderDetailListItem) => {
    setShareRow(row);
    setShareOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tahlillar</h1>
        <p className="text-sm text-muted-foreground">Buyurtma qatorlari bo‘yicha tahlil natijalari</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Laboratoriya, holat, tahlil, bemor va namuna bo‘yicha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Tozalash
            </Button>
          </div>
          <div className="overflow-x-auto">
            <div className="flex min-w-[900px] flex-nowrap items-end gap-2 xl:min-w-0">
              <div className="min-w-0 flex-1 space-y-2">
                <Label className="text-xs">Laboratoriya</Label>
                <Select value={filterLab || "all"} onValueChange={(v) => patchFilters({ filterLab: v === "all" ? "" : v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Barchasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    {laboratories.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.nameUz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label className="text-xs">Natija holati</Label>
                <Select
                  value={filterStatus || "all"}
                  onValueChange={(v) => patchFilters({ filterStatus: v === "all" ? "" : v })}
                  disabled={!enums}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Barchasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    {(enums?.analysisStates ?? []).map((e) => (
                      <SelectItem key={e.value} value={String(e.value)}>
                        {enumEntryDisplayLabel(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label className="text-xs">Tahlil</Label>
                <Select value={filterAnalysisId || "all"} onValueChange={(v) => patchFilters({ filterAnalysisId: v === "all" ? "" : v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Barchasi" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,320px)]">
                    <SelectItem value="all">Barchasi</SelectItem>
                    {analyses.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nameUz || `Tahlil #${a.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="cdf-patient" className="text-xs">
                  Bemor nomi
                </Label>
                <Input
                  id="cdf-patient"
                  value={filterPatient}
                  onChange={(e) => setFilterPatient(e.target.value)}
                  placeholder="Qidiruv…"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="cdf-sample" className="text-xs">
                  Namuna / obyekt
                </Label>
                <Input
                  id="cdf-sample"
                  value={filterSample}
                  onChange={(e) => setFilterSample(e.target.value)}
                  placeholder="Qidiruv…"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tahlil qatorlari</CardTitle>
          <CardDescription>Jami: {totalElements} ta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[72px]">№</TableHead>
                  <TableHead>Bemor FISH</TableHead>
                  <TableHead>Obyekt FISH</TableHead>
                  <TableHead>Laboratoriya nomi</TableHead>
                  <TableHead>Analiz nomi</TableHead>
                  <TableHead>Natija holati</TableHead>
                  <TableHead>Narxi</TableHead>
                  <TableHead>Yaratilgan vaqti</TableHead>
                  <TableHead>Natija vaqti</TableHead>
                  <TableHead className="text-right w-[100px]">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRef || loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      Yuklanmoqda…
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      Ma’lumot yo‘q
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row, idx) => {
                    const badgeStatus = analysisStateToBadgeStatus(enums, row.analysisStatus);
                    const showQr = isAnalysisApproved(enums, row.analysisStatus);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-sm tabular-nums">{page * pageSize + idx + 1}</TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={patientFio(row)}>
                          {patientFio(row)}
                        </TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={objectFio(row)}>
                          {objectFio(row)}
                        </TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate" title={row.laboratoryNameUz}>
                          {row.laboratoryNameUz}
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate" title={row.analysisNameUz}>
                          {row.analysisNameUz}
                        </TableCell>
                        <TableCell className="text-sm">
                          <StatusBadge
                            status={badgeStatus}
                            animated={false}
                            label={
                              enums
                                ? enumLabel(enums.analysisStates, row.analysisStatus)
                                : String(row.analysisStatus)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-sm font-semibold tabular-nums">{money(row.amount)}</TableCell>
                        <TableCell className="text-sm tabular-nums whitespace-nowrap">{formatTableDateTime(row.orderCreatedAt)}</TableCell>
                        <TableCell className="text-sm tabular-nums whitespace-nowrap">{formatTableDateTime(row.resultTime)}</TableCell>
                        <TableCell className="text-right">
                          {showQr ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => openShare(row)}
                            >
                              <QrCode className="h-4 w-4" />
                              QR
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm"></span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Sahifa: {page + 1} / {totalPages}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / sahifa</SelectItem>
                  <SelectItem value="20">20 / sahifa</SelectItem>
                  <SelectItem value="50">50 / sahifa</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label="Oldingi sahifa"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm tabular-nums px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={loading || page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Keyingi sahifa"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ResultShareDialog
        isOpen={shareOpen}
        onClose={() => {
          setShareOpen(false);
          setShareRow(null);
        }}
        testId={shareRow ? String(shareRow.id) : ""}
        patientName={shareRow ? patientFio(shareRow) : "—"}
        patientPhone=""
      />
    </div>
  );
}
