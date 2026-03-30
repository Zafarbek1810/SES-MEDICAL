import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Filter, Building2, MapPin, User } from "lucide-react";

const { RangePicker } = DatePicker;
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { toast } from "sonner";
import { getEnums, enumLabel, enumName, enumEntryDisplayLabel, type EnumsData } from "../../../services/enumsApi";
import {
  createOrder,
  deleteOrder,
  fetchOrder,
  fetchOrders,
  updateOrder,
  type OrderDetailDto,
  type OrderDto,
  type OrdersListFilters,
  type SaveOrderBody,
} from "../../../services/ordersApi";
import { fetchAnalyses, type AnalysisDto } from "../../../services/analysesApi";
import { fetchAnalysisPrices, type AnalysisPriceDto } from "../../../services/analysisPricesApi";
import { fetchPatients, type PatientDto } from "../../../services/patientsApi";
import { fetchSamples, type SampleDto } from "../../../services/samplesApi";
import { fetchLaboratories, type LaboratoryDto } from "../../../services/laboratoriesApi";
import { formatTableDateTime } from "../../../utils/tableDateFormat";

const PICKER_LIST_SIZE = 500;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function patientPickerLabel(p: PatientDto): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return name ? `${name} (#${p.id})` : `Bemor #${p.id}`;
}

function samplePickerLabel(s: SampleDto): string {
  const title = s.name?.trim() || s.sourceName?.trim();
  return title ? `${title} (#${s.id})` : `Namuna #${s.id}`;
}

/** GET /enums `orderStates[].name` bo‘yicha rang (matn `labelUz` dan) */
function orderStateBadge(nameKey: string) {
  const key = nameKey.trim().toUpperCase();
  if (key === "COMPLETED" || key === "APPROVED") return { cls: "bg-green-100 text-green-700 border-green-200" };
  if (key === "IN_PROGRESS" || key === "PROCESSING") return { cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (key === "CANCELLED" || key === "REJECTED") return { cls: "bg-rose-100 text-rose-700 border-rose-200" };
  if (key === "NEW" || key === "PENDING") return { cls: "bg-slate-100 text-slate-700 border-slate-200" };
  return { cls: "bg-slate-100 text-slate-700 border-slate-200" };
}

function paymentTypeBadge(labelRaw: string) {
  const key = labelRaw.trim().toUpperCase();
  if (key === "CASH") return { text: "Naqd", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (key === "CARD") return { text: "Karta", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (key === "TRANSFER") return { text: "O‘tkazma", cls: "bg-violet-100 text-violet-700 border-violet-200" };
  return { text: labelRaw || "—", cls: "bg-slate-100 text-slate-700 border-slate-200" };
}

function paymentStatusBadge(labelRaw: string) {
  const key = labelRaw.trim().toUpperCase();
  if (key === "PAID") return { text: "To‘langan", cls: "bg-green-100 text-green-700 border-green-200" };
  if (key === "UNPAID") return { text: "To‘lanmagan", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (key === "RETURNED") return { text: "Qaytarilgan", cls: "bg-rose-100 text-rose-700 border-rose-200" };
  return { text: labelRaw || "—", cls: "bg-slate-100 text-slate-700 border-slate-200" };
}

type DetailFormRow = {
  analysisId: string;
  /** 0–100, foiz */
  discountPercent: string;
  quantity: string;
};

/** Backend `discount` maydoni foiz (0–100) */
function detailDiscountToPercentField(d: OrderDetailDto): string {
  const pct = Number(d.discount ?? 0);
  if (!Number.isFinite(pct) || pct <= 0) return "0";
  return String(Math.min(100, Math.max(0, Math.round(pct * 100) / 100)));
}

function formatDetailDiscountPercent(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Math.min(100, Math.max(0, Number(n)));
  return `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 2 }).format(v)}%`;
}

type OrderFormState = {
  orderType: string;
  laboratoryId: string;
  patientId: string;
  sampleId: string;
  paymentType: string;
  paymentStatus: string;
  details: DetailFormRow[];
};

function emptyDetailRow(): DetailFormRow {
  return { analysisId: "", discountPercent: "0", quantity: "1" };
}

function defaultForm(enums: EnumsData | null): OrderFormState {
  const ot = enums?.orderTypes[0]?.value;
  const pt = enums?.paymentTypes[0]?.value;
  const ps = enums?.paymentStatuses[0]?.value;
  return {
    orderType: ot !== undefined ? String(ot) : "",
    laboratoryId: "",
    patientId: "",
    sampleId: "",
    paymentType: pt !== undefined ? String(pt) : "",
    paymentStatus: ps !== undefined ? String(ps) : "",
    details: [emptyDetailRow()],
  };
}

/** Buyurtma ildizida laboratoriya bo‘lmasa, details qatoridan oladi */
function resolveOrderLaboratoryId(o: OrderDto): number {
  if (o.laboratoryId > 0) return o.laboratoryId;
  for (const d of o.details) {
    const lid = d.laboratoryId;
    if (lid != null && lid > 0) return lid;
  }
  return 0;
}

function orderToForm(o: OrderDto): OrderFormState {
  const labId = resolveOrderLaboratoryId(o);
  return {
    orderType: String(o.orderType),
    laboratoryId: labId > 0 ? String(labId) : "",
    patientId: String(o.patientId),
    sampleId: String(o.sampleId),
    paymentType: String(o.paymentType),
    paymentStatus: String(o.paymentStatus),
    details:
      o.details.length > 0
        ? o.details.map((d) => ({
          analysisId: String(d.analysisId),
          discountPercent: detailDiscountToPercentField(d),
          quantity: String(d.quantity),
        }))
        : [emptyDetailRow()],
  };
}

function formToBody(
  f: OrderFormState,
  mode: { isHumanOrder: boolean; isObjectOrder: boolean },
  priceByAnalysisId: Map<number, number>
): SaveOrderBody | null {
  const orderType = Number(f.orderType);
  const laboratoryId = Number(f.laboratoryId);
  const patientId = Number(f.patientId);
  const sampleId = Number(f.sampleId);
  const paymentType = Number(f.paymentType);
  const paymentStatus = Number(f.paymentStatus);
  if (!Number.isFinite(orderType)) {
    toast.error("Buyurtma turini tanlang");
    return null;
  }
  if (!Number.isFinite(laboratoryId) || laboratoryId <= 0) {
    toast.error("Laboratoriyani tanlang");
    return null;
  }
  if (mode.isObjectOrder) {
    if (!Number.isFinite(sampleId) || sampleId <= 0) {
      toast.error("OBJECT uchun namuna tanlang");
      return null;
    }
  } else if (mode.isHumanOrder) {
    if (!Number.isFinite(patientId) || patientId <= 0) {
      toast.error("HUMAN uchun bemor tanlang");
      return null;
    }
  } else {
    if (!Number.isFinite(patientId) || patientId <= 0) {
      toast.error("Bemorni tanlang");
      return null;
    }
    if (!Number.isFinite(sampleId) || sampleId <= 0) {
      toast.error("Namunani tanlang");
      return null;
    }
  }
  if (!Number.isFinite(paymentType) || !Number.isFinite(paymentStatus)) {
    toast.error("To‘lov turini va holatini tanlang");
    return null;
  }
  const details: SaveOrderBody["details"] = [];
  for (const row of f.details) {
    const analysisId = Number(row.analysisId);
    const quantity = Number(row.quantity);
    const pctRaw = Number(row.discountPercent);
    const pct = Math.min(100, Math.max(0, Number.isFinite(pctRaw) ? pctRaw : 0));
    if (!Number.isFinite(analysisId) || analysisId <= 0) {
      toast.error("Har bir qatorda tahlil tanlang");
      return null;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Miqdor musbat bo‘lishi kerak");
      return null;
    }
    const unitPrice = priceByAnalysisId.get(analysisId);
    if (unitPrice == null) {
      toast.error("Tanlangan tahlillar uchun narx topilmadi");
      return null;
    }
    const discountPct = Math.round(pct * 100) / 100;
    details.push({
      analysisId,
      discount: discountPct,
      quantity,
    });
  }
  if (details.length === 0) {
    toast.error("Kamida bitta tahlil qatori qo‘shing");
    return null;
  }
  return {
    orderType,
    laboratoryId,
    patientId: mode.isObjectOrder ? null : Number.isFinite(patientId) ? patientId : null,
    sampleId: mode.isHumanOrder ? null : Number.isFinite(sampleId) ? sampleId : null,
    paymentType,
    paymentStatus,
    details,
  };
}

export default function CashierOrdersTab() {
  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [loadingEnums, setLoadingEnums] = useState(true);
  const [analyses, setAnalyses] = useState<AnalysisDto[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [analysisPrices, setAnalysisPrices] = useState<AnalysisPriceDto[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [laboratories, setLaboratories] = useState<LaboratoryDto[]>([]);
  const [loadingLaboratories, setLoadingLaboratories] = useState(true);
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [samples, setSamples] = useState<SampleDto[]>([]);
  const [loadingPickerLists, setLoadingPickerLists] = useState(true);

  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [orderPage, setOrderPage] = useState(0);
  const [orderPageSize, setOrderPageSize] = useState(10);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotalElements, setOrderTotalElements] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilters, setOrderFilters] = useState({
    orderType: "",
    humanName: "",
    objectName: "",
    orderDate: "",
    fromDate: "",
    toDate: "",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<OrderFormState>(() => defaultForm(null));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrderDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderPreviewOpen, setOrderPreviewOpen] = useState(false);
  const [orderPreview, setOrderPreview] = useState<OrderDto | null>(null);
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false);

  const patchOrderFilters = useCallback((patch: Partial<typeof orderFilters>) => {
    setOrderFilters((f) => ({ ...f, ...patch }));
    setOrderPage(0);
  }, []);

  const debouncedHumanName = useDebouncedValue(orderFilters.humanName, 400);
  const debouncedObjectName = useDebouncedValue(orderFilters.objectName, 400);

  const ordersListFilters = useMemo((): OrdersListFilters | undefined => {
    const f: OrdersListFilters = {};
    if (orderFilters.orderType !== "") {
      const n = Number(orderFilters.orderType);
      if (Number.isFinite(n)) f.orderType = n;
    }
    if (debouncedHumanName.trim()) f.humanName = debouncedHumanName.trim();
    if (debouncedObjectName.trim()) f.objectName = debouncedObjectName.trim();
    if (orderFilters.orderDate.trim()) f.orderDate = orderFilters.orderDate.trim();
    if (orderFilters.fromDate.trim()) f.fromDate = orderFilters.fromDate.trim();
    if (orderFilters.toDate.trim()) f.toDate = orderFilters.toDate.trim();
    return Object.keys(f).length > 0 ? f : undefined;
  }, [
    orderFilters.orderType,
    orderFilters.orderDate,
    orderFilters.fromDate,
    orderFilters.toDate,
    debouncedHumanName,
    debouncedObjectName,
  ]);

  useEffect(() => {
    setOrderPage(0);
  }, [debouncedHumanName, debouncedObjectName]);

  useEffect(() => {
    let cancelled = false;
    setLoadingEnums(true);
    getEnums()
      .then((data) => {
        if (!cancelled) setEnums(data);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Enumlar yuklanmadi"))
      .finally(() => {
        if (!cancelled) setLoadingEnums(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPrices(true);
    fetchAnalysisPrices()
      .then((rows) => {
        if (!cancelled) setAnalysisPrices(rows);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Tahlil narxlari yuklanmadi"))
      .finally(() => {
        if (!cancelled) setLoadingPrices(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingAnalyses(true);
    fetchAnalyses()
      .then((rows) => {
        if (!cancelled) setAnalyses(rows);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Tahlillar yuklanmadi"))
      .finally(() => {
        if (!cancelled) setLoadingAnalyses(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingLaboratories(true);
    fetchLaboratories()
      .then((rows) => {
        if (!cancelled) setLaboratories(rows);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Laboratoriyalar yuklanmadi"))
      .finally(() => {
        if (!cancelled) setLoadingLaboratories(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPickerLists(true);
    Promise.all([fetchPatients(0, PICKER_LIST_SIZE), fetchSamples(0, PICKER_LIST_SIZE)])
      .then(([p, s]) => {
        if (!cancelled) {
          setPatients(p.items);
          setSamples(s.items);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Bemorlar / namunalar yuklanmadi"))
      .finally(() => {
        if (!cancelled) setLoadingPickerLists(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patientIdsInList = useMemo(() => new Set(patients.map((x) => x.id)), [patients]);
  const sampleIdsInList = useMemo(() => new Set(samples.map((x) => x.id)), [samples]);
  const showOrphanPatient =
    form.patientId !== "" &&
    Number.isFinite(Number(form.patientId)) &&
    Number(form.patientId) > 0 &&
    !patientIdsInList.has(Number(form.patientId));
  const showOrphanSample =
    form.sampleId !== "" &&
    Number.isFinite(Number(form.sampleId)) &&
    Number(form.sampleId) > 0 &&
    !sampleIdsInList.has(Number(form.sampleId));
  const laboratoryIdsInList = useMemo(() => new Set(laboratories.map((l) => l.id)), [laboratories]);
  const showOrphanLaboratory =
    form.laboratoryId !== "" &&
    Number.isFinite(Number(form.laboratoryId)) &&
    Number(form.laboratoryId) > 0 &&
    !laboratoryIdsInList.has(Number(form.laboratoryId));
  const patientNameById = useMemo(() => {
    const m = new Map<number, string>();
    patients.forEach((p) => {
      const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
      m.set(p.id, full || `Bemor #${p.id}`);
    });
    return m;
  }, [patients]);
  const sampleNameById = useMemo(() => {
    const m = new Map<number, string>();
    samples.forEach((s) => {
      const title = s.name?.trim() || s.sourceName?.trim();
      m.set(s.id, title || `Namuna #${s.id}`);
    });
    return m;
  }, [samples]);
  const analysisNameById = useMemo(() => {
    const m = new Map<number, string>();
    analyses.forEach((a) => {
      m.set(a.id, a.nameUz || a.nameRu || `Tahlil #${a.id}`);
    });
    return m;
  }, [analyses]);
  const selectedOrderTypeName = useMemo(() => {
    const typeValue = Number(form.orderType);
    if (!Number.isFinite(typeValue)) return "";
    const hit = enums?.orderTypes.find((x) => x.value === typeValue);
    return hit?.name?.toUpperCase() ?? "";
  }, [enums, form.orderType]);
  const isHumanOrder = selectedOrderTypeName === "HUMAN";
  const isObjectOrder = selectedOrderTypeName === "OBJECT";
  const selectedLaboratoryId = useMemo(() => {
    const n = Number(form.laboratoryId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [form.laboratoryId]);
  const analysesForSelectedLab = useMemo(() => {
    if (!selectedLaboratoryId) return [];
    return analyses.filter((a) => Number(a.laboratoryId) === selectedLaboratoryId);
  }, [analyses, selectedLaboratoryId]);
  const priceByAnalysisId = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of analysisPrices) {
      if (!m.has(p.analysisId)) m.set(p.analysisId, p.price);
    }
    return m;
  }, [analysisPrices]);
  const money = (n: number) =>
    new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Math.max(0, n));
  const amountSummary = useMemo(() => {
    let subTotal = 0;
    let discountTotal = 0;
    let missingPriceCount = 0;
    for (const row of form.details) {
      const analysisId = Number(row.analysisId);
      const qty = Number(row.quantity);
      const pctRaw = Number(row.discountPercent);
      const pct = Math.min(100, Math.max(0, Number.isFinite(pctRaw) ? pctRaw : 0));
      if (!Number.isFinite(analysisId) || !Number.isFinite(qty) || qty <= 0) continue;
      const price = priceByAnalysisId.get(analysisId);
      if (price == null) {
        missingPriceCount += 1;
        continue;
      }
      const lineGross = price * qty;
      subTotal += lineGross;
      discountTotal += Math.round((lineGross * pct) / 100);
    }
    return {
      subTotal,
      discountTotal,
      total: Math.max(0, subTotal - discountTotal),
      missingPriceCount,
    };
  }, [form.details, priceByAnalysisId]);

  useEffect(() => {
    if (isHumanOrder && form.sampleId !== "") {
      setForm((prev) => ({ ...prev, sampleId: "" }));
      return;
    }
    if (isObjectOrder && form.patientId !== "") {
      setForm((prev) => ({ ...prev, patientId: "" }));
    }
  }, [isHumanOrder, isObjectOrder, form.sampleId, form.patientId]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const p = await fetchOrders(orderPage, orderPageSize, ordersListFilters);
      setOrders(p.items);
      setOrderTotalPages(Math.max(1, p.totalPages));
      setOrderTotalElements(p.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Buyurtmalar yuklanmadi");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [orderPage, orderPageSize, ordersListFilters]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm(enums));
    setDialogOpen(true);
  };

  const openEdit = async (row: OrderDto) => {
    setEditingId(row.id);
    setDialogOpen(true);
    try {
      const full = await fetchOrder(row.id);
      setForm(orderToForm(full));
    } catch {
      setForm(orderToForm(row));
    }
  };

  const openOrderPreview = async (row: OrderDto) => {
    setOrderPreviewOpen(true);
    setOrderPreviewLoading(true);
    setOrderPreview(null);
    try {
      const full = await fetchOrder(row.id);
      setOrderPreview(full);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Buyurtma yuklanmadi");
      setOrderPreview(row);
    } finally {
      setOrderPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    const body = formToBody(form, { isHumanOrder, isObjectOrder }, priceByAnalysisId);
    if (!body) return;
    setSaving(true);
    try {
      if (editingId != null) {
        await updateOrder(editingId, body);
        toast.success("Buyurtma yangilandi");
      } else {
        await createOrder(body);
        toast.success("Buyurtma yaratildi");
      }
      setDialogOpen(false);
      setEditingId(null);
      await loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOrder(deleteTarget.id);
      toast.success("Buyurtma o‘chirildi");
      setDeleteTarget(null);
      await loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O‘chirishda xatolik");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Buyurtmalar</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => setFiltersOpen((v) => !v)}
              disabled={loadingEnums}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filterlash
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 shrink-0" onClick={openCreate} disabled={loadingEnums}>
              <Plus className="h-4 w-4 mr-2" />
              Buyurtma yaratish
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(loadingEnums || loadingAnalyses) && (
          <p className="text-sm text-muted-foreground">Ma’lumotlar yuklanmoqda…</p>
        )}

        {filtersOpen && (
          <div className="rounded-md border bg-muted/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Buyurtmalarni filterlash</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOrderFilters({
                    orderType: "",
                    humanName: "",
                    objectName: "",
                    orderDate: "",
                    fromDate: "",
                    toDate: "",
                  });
                  setOrderPage(0);
                }}
              >
                Tozalash
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="flex min-w-[920px] flex-nowrap items-end gap-2 xl:min-w-0">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className="block truncate">Buyurtma turi</Label>
                  <Select
                    value={orderFilters.orderType || "all"}
                    onValueChange={(v) => patchOrderFilters({ orderType: v === "all" ? "" : v })}
                    disabled={!enums}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Barchasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barchasi</SelectItem>
                      {(enums?.orderTypes ?? []).map((e) => (
                        <SelectItem key={e.value} value={String(e.value)}>
                          {enumEntryDisplayLabel(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="of-human" className="block truncate">
                    Bemor nomi
                  </Label>
                  <Input
                    id="of-human"
                    value={orderFilters.humanName}
                    onChange={(e) => setOrderFilters((prev) => ({ ...prev, humanName: e.target.value }))}
                    placeholder="Qidiruv…"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="of-object" className="block truncate">
                    Ob’ekt / namuna
                  </Label>
                  <Input
                    id="of-object"
                    value={orderFilters.objectName}
                    onChange={(e) => setOrderFilters((prev) => ({ ...prev, objectName: e.target.value }))}
                    placeholder="Qidiruv…"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="of-order-date" className="block truncate">
                    Buyurtma sanasi
                  </Label>
                  <DatePicker
                    id="of-order-date"
                    className="w-full min-w-[130px]"
                    size="middle"
                    placeholder="Sanani tanlang"
                    format="YYYY-MM-DD"
                    allowClear
                    value={orderFilters.orderDate ? dayjs(orderFilters.orderDate, "YYYY-MM-DD") : null}
                    onChange={(date) =>
                      patchOrderFilters({
                        orderDate: date ? date.format("YYYY-MM-DD") : "",
                      })
                    }
                  />
                </div>
                <div className="min-w-0 flex-[1.15] space-y-2">
                  <Label htmlFor="of-range" className="block truncate">
                    Sana oralig‘i
                  </Label>
                  <RangePicker
                    id="of-range"
                    className="w-full min-w-[220px]"
                    size="middle"
                    format="YYYY-MM-DD"
                    placeholder={["Dan", "Gacha"]}
                    allowClear
                    value={
                      orderFilters.fromDate || orderFilters.toDate
                        ? [
                            orderFilters.fromDate ? dayjs(orderFilters.fromDate, "YYYY-MM-DD") : null,
                            orderFilters.toDate ? dayjs(orderFilters.toDate, "YYYY-MM-DD") : null,
                          ]
                        : null
                    }
                    onChange={(dates) => {
                      if (!dates || dates.length !== 2) {
                        patchOrderFilters({ fromDate: "", toDate: "" });
                        return;
                      }
                      const [d0, d1] = dates;
                      patchOrderFilters({
                        fromDate: d0 ? d0.format("YYYY-MM-DD") : "",
                        toDate: d1 ? d1.format("YYYY-MM-DD") : "",
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">№</TableHead>
                <TableHead>Buyurtma nomi</TableHead>
                <TableHead>Narxi</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead>To'lov turi</TableHead>
                <TableHead>Buyurtma turi</TableHead>
                <TableHead>To'lov holati</TableHead>
                <TableHead>Telefon raqami</TableHead>
                <TableHead>Yaratilgan vaqti</TableHead>
                <TableHead className="text-right w-[120px]">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingOrders ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    Yuklanmoqda…
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    Buyurtmalar yo‘q
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o, idx) => {
                  return (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer hover:bg-muted/60 data-[state=selected]:bg-muted"
                      onClick={() => void openOrderPreview(o)}
                    >
                      {(() => {
                        const orderTypeName =
                          enums?.orderTypes.find((x) => x.value === o.orderType)?.name?.toUpperCase() ?? "";
                        const rowIsHuman = orderTypeName === "HUMAN";
                        const rowIsObject = orderTypeName === "OBJECT";
                        const patient = patients.find((p) => p.id === o.patientId);
                        return (
                          <>
                            <TableCell className="font-mono text-sm tabular-nums">
                              {orderPage * orderPageSize + idx + 1}
                            </TableCell>
                            {rowIsHuman && (
                              <TableCell className="text-sm">
                                {patientNameById.get(o.patientId) ?? `Bemor #${o.patientId}`}
                              </TableCell>
                            )}
                            {rowIsObject && (
                              <TableCell className="text-sm">
                                {sampleNameById.get(o.sampleId) ?? `Namuna #${o.sampleId}`}
                              </TableCell>
                            )}

                            <TableCell className="text-sm font-semibold tabular-nums">
                              {o.amount != null ? money(o.amount) : "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(() => {
                                const nameKey = enums ? enumName(enums.orderStates, o.orderState) : String(o.orderState ?? "");
                                const displayText = enums
                                  ? enumLabel(enums.orderStates, o.orderState)
                                  : o.orderState !== undefined
                                    ? String(o.orderState)
                                    : "—";
                                const config = orderStateBadge(nameKey);
                                return <Badge className={`${config.cls} border font-medium`}>{displayText}</Badge>;
                              })()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(() => {
                                const nameKey = enums ? enumName(enums.paymentTypes, o.paymentType) : String(o.paymentType);
                                const displayText = enums ? enumLabel(enums.paymentTypes, o.paymentType) : String(o.paymentType);
                                const config = paymentTypeBadge(nameKey);
                                return <Badge className={`${config.cls} border font-medium`}>{displayText}</Badge>;
                              })()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {enums ? enumLabel(enums.orderTypes, o.orderType) : o.orderType}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(() => {
                                const nameKey = enums ? enumName(enums.paymentStatuses, o.paymentStatus) : String(o.paymentStatus);
                                const displayText = enums ? enumLabel(enums.paymentStatuses, o.paymentStatus) : String(o.paymentStatus);
                                const config = paymentStatusBadge(nameKey);
                                return <Badge className={`${config.cls} border font-medium`}>{displayText}</Badge>;
                              })()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {/* bu yerda agarda human bolsa phoneNumber ko'rsatish kerak */}
                              {rowIsHuman && (
                                <span className="text-sm">{patient?.phoneNumber ?? "—"}</span>
                              )}
                              {rowIsObject && (
                                <span className="text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatTableDateTime(o.createdDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" type="button" onClick={() => void openEdit(o)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" type="button" onClick={() => setDeleteTarget(o)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Jami: {orderTotalElements} ta</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(orderPageSize)}
              onValueChange={(v) => {
                setOrderPageSize(Number(v));
                setOrderPage(0);
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
                disabled={orderPage <= 0 || loadingOrders}
                onClick={() => setOrderPage((p) => Math.max(0, p - 1))}
                aria-label="Oldingi sahifa"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums px-2">
                {orderPage + 1} / {orderTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={loadingOrders || orderPage >= orderTotalPages - 1}
                onClick={() => setOrderPage((p) => p + 1)}
                aria-label="Keyingi sahifa"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog
          open={orderPreviewOpen}
          onOpenChange={(open) => {
            setOrderPreviewOpen(open);
            if (!open) setOrderPreview(null);
          }}
        >
          <DialogContent className="max-h-[92vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Buyurtma #{orderPreview?.id ?? "—"}
                </DialogTitle>
                <DialogDescription>
                  To‘liq ma’lumot va tahlil qatorlari
                </DialogDescription>
              </DialogHeader>
            </div>
            <ScrollArea className="max-h-[calc(92vh-8rem)] px-6 py-4">
              {orderPreviewLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Yuklanmoqda…</p>
              ) : orderPreview ? (
                <div className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Umumiy narx</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                        {orderPreview.amount != null ? money(orderPreview.amount) : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buyurtma turi</p>
                      <p className="mt-1 text-sm font-semibold">
                        {orderPreview.orderTypeName?.trim() ||
                          (enums ? enumLabel(enums.orderTypes, orderPreview.orderType) : orderPreview.orderType)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm sm:col-span-2">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Holat</p>
                            {(() => {
                              const nameKey = enums
                                ? enumName(enums.orderStates, orderPreview.orderState)
                                : String(orderPreview.orderState ?? "");
                              const displayText = enums
                                ? enumLabel(enums.orderStates, orderPreview.orderState)
                                : orderPreview.orderState !== undefined
                                  ? String(orderPreview.orderState)
                                  : "—";
                              const cfg = orderStateBadge(nameKey);
                              return (
                                <Badge className={`mt-1 ${cfg.cls} border font-medium`}>{displayText}</Badge>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <User className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">To‘lov</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(() => {
                                const pt = enums
                                  ? enumName(enums.paymentTypes, orderPreview.paymentType)
                                  : String(orderPreview.paymentType);
                                const ps = enums
                                  ? enumName(enums.paymentStatuses, orderPreview.paymentStatus)
                                  : String(orderPreview.paymentStatus);
                                const c1 = paymentTypeBadge(pt);
                                const c2 = paymentStatusBadge(ps);
                                return (
                                  <>
                                    <Badge className={`${c1.cls} border font-medium`}>
                                      {enums ? enumLabel(enums.paymentTypes, orderPreview.paymentType) : orderPreview.paymentType}
                                    </Badge>
                                    <Badge className={`${c2.cls} border font-medium`}>
                                      {enums
                                        ? enumLabel(enums.paymentStatuses, orderPreview.paymentStatus)
                                        : orderPreview.paymentStatus}
                                    </Badge>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {(orderPreview.regionNameUz || orderPreview.districtNameUz) && (
                      <div className="rounded-xl border bg-card p-4 shadow-sm sm:col-span-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Hudud</p>
                            <p className="mt-1 text-sm">
                              {[orderPreview.regionNameUz, orderPreview.districtNameUz].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bemor</p>
                      <p className="mt-1 text-sm font-medium">
                        {[orderPreview.patientFirstName, orderPreview.patientLastName].filter(Boolean).join(" ").trim() ||
                          patientNameById.get(orderPreview.patientId) ||
                          (orderPreview.patientId ? `Bemor #${orderPreview.patientId}` : "—")}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Namuna / obyekt</p>
                      <p className="mt-1 text-sm font-medium">
                        {[orderPreview.sampleName, orderPreview.sampleSourceName].filter(Boolean).join(" · ").trim() ||
                          sampleNameById.get(orderPreview.sampleId) ||
                          (orderPreview.sampleId ? `Namuna #${orderPreview.sampleId}` : "—")}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Yaratilgan</p>
                        <p className="mt-1 text-sm tabular-nums">{formatTableDateTime(orderPreview.createdDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Yangilangan</p>
                        <p className="mt-1 text-sm tabular-nums">{formatTableDateTime(orderPreview.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Tahlil qatorlari</h3>
                    {orderPreview.details.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Qatorlar yo‘q</p>
                    ) : (
                      <div className="rounded-xl border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="w-12">№</TableHead>
                              <TableHead>Analiz</TableHead>
                              <TableHead>Laboratoriya</TableHead>
                              <TableHead>Holat</TableHead>
                              <TableHead className="text-right">Narx</TableHead>
                              <TableHead className="text-right">Chegirma (%)</TableHead>
                              <TableHead className="text-right">Miqdor</TableHead>
                              <TableHead className="text-right">Summa</TableHead>
                              <TableHead>Natija vaqti</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderPreview.details.map((d, idx) => {
                              const stName = enums
                                ? enumName(enums.analysisStates, d.analysisStatus)
                                : String(d.analysisStatus ?? "");
                              const stCfg = orderStateBadge(stName);
                              const analysisTitle =
                                d.analysisNameUz?.trim() ||
                                analysisNameById.get(d.analysisId) ||
                                `Tahlil #${d.analysisId}`;
                              return (
                                <TableRow key={d.id ?? `${d.analysisId}-${idx}`}>
                                  <TableCell className="font-mono text-xs tabular-nums">{idx + 1}</TableCell>
                                  <TableCell className="text-sm max-w-[200px]">
                                    <span className="font-medium">{analysisTitle}</span>
                                  </TableCell>
                                  <TableCell className="text-sm max-w-[160px] truncate" title={d.laboratoryNameUz}>
                                    {d.laboratoryNameUz ?? "—"}
                                  </TableCell>
                                  <TableCell>
                                    {d.analysisStatus !== undefined && enums ? (
                                      <Badge className={`${stCfg.cls} border font-medium text-xs`}>
                                        {enumLabel(enums.analysisStates, d.analysisStatus)}
                                      </Badge>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {d.price != null ? money(d.price) : "—"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {formatDetailDiscountPercent(d.discount)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">{d.quantity ?? "—"}</TableCell>
                                  <TableCell className="text-right font-medium tabular-nums text-sm">
                                    {d.amount != null ? money(d.amount) : "—"}
                                  </TableCell>
                                  <TableCell className="text-xs tabular-nums whitespace-nowrap">
                                    {formatTableDateTime(d.resultTime)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6">Ma’lumot yo‘q</p>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingId(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId != null ? "Buyurtmani tahrirlash" : "Yangi buyurtma"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Buyurtma turi</Label>
                  <Select value={form.orderType} onValueChange={(v) => setForm({ ...form, orderType: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingEnums ? "…" : "Tanlang"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(enums?.orderTypes ?? []).map((e) => (
                        <SelectItem key={e.value} value={String(e.value)}>
                          {enumEntryDisplayLabel(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>To‘lov turi</Label>
                  <Select value={form.paymentType} onValueChange={(v) => setForm({ ...form, paymentType: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {(enums?.paymentTypes ?? []).map((e) => (
                        <SelectItem key={e.value} value={String(e.value)}>
                          {enumEntryDisplayLabel(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To‘lov holati</Label>
                  <Select
                    value={form.paymentStatus}
                    onValueChange={(v) => setForm({ ...form, paymentStatus: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {(enums?.paymentStatuses ?? []).map((e) => (
                        <SelectItem key={e.value} value={String(e.value)}>
                          {enumEntryDisplayLabel(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {!isObjectOrder && (
                    <div className="space-y-2">
                      <Label>Bemor</Label>
                      <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })} disabled={loadingPickerLists}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingPickerLists ? "Yuklanmoqda…" : "Tanlang"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[min(60vh,320px)]">
                          {showOrphanPatient && (
                            <SelectItem value={form.patientId}>Bemor #{form.patientId} (ro‘yxatda yo‘q)</SelectItem>
                          )}
                          {patients.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {patientPickerLabel(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {!isHumanOrder && (
                    <div className="space-y-2">
                      <Label>Namuna</Label>
                      <Select value={form.sampleId} onValueChange={(v) => setForm({ ...form, sampleId: v })} disabled={loadingPickerLists}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingPickerLists ? "Yuklanmoqda…" : "Tanlang"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[min(60vh,320px)]">
                          {showOrphanSample && (
                            <SelectItem value={form.sampleId}>Namuna #{form.sampleId} (ro‘yxatda yo‘q)</SelectItem>
                          )}
                          {samples.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {samplePickerLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Laboratoriya</Label>
                  <Select
                    value={form.laboratoryId}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        laboratoryId: v,
                        details: prev.details.map((d) => ({ ...d, analysisId: "" })),
                      }))
                    }
                    disabled={loadingLaboratories}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingLaboratories ? "Yuklanmoqda…" : "Tanlang"} />
                    </SelectTrigger>
                    <SelectContent>
                      {showOrphanLaboratory && (
                        <SelectItem value={form.laboratoryId}>
                          Laboratoriya #{form.laboratoryId} (ro‘yxatda yo‘q)
                        </SelectItem>
                      )}
                      {laboratories.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.nameUz || l.nameRu || `Laboratoriya #${l.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tahlil qatorlari (details)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, details: [...form.details, emptyDetailRow()] })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Qator
                  </Button>
                </div>
                <div className="space-y-3 rounded-lg border p-3">
                  {form.details.map((row, idx) => {
                    const aid = Number(row.analysisId);
                    const analysisInSelectedLab =
                      Number.isFinite(aid) &&
                      aid > 0 &&
                      analysesForSelectedLab.some((a) => a.id === aid);
                    const showOrphanAnalysis =
                      Number.isFinite(aid) && aid > 0 && !analysisInSelectedLab;
                    return (
                    <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-xs">Tahlil</Label>
                        <Select
                          value={row.analysisId}
                          onValueChange={(v) => {
                            const next = [...form.details];
                            next[idx] = { ...next[idx], analysisId: v };
                            setForm({ ...form, details: next });
                          }}
                          disabled={!selectedLaboratoryId || loadingAnalyses}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !selectedLaboratoryId
                                  ? "Avval laboratoriyani tanlang"
                                  : loadingAnalyses
                                    ? "…"
                                    : "Tanlang"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {showOrphanAnalysis && (
                              <SelectItem value={row.analysisId}>
                                {analysisNameById.get(aid) ?? `Tahlil #${aid}`} (boshqa lab / ro‘yxatda yo‘q)
                              </SelectItem>
                            )}
                            {analysesForSelectedLab.map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {a.nameUz}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs">Chegirma (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          inputMode="decimal"
                          value={row.discountPercent}
                          onChange={(e) => {
                            const next = [...form.details];
                            next[idx] = { ...next[idx], discountPercent: e.target.value };
                            setForm({ ...form, details: next });
                          }}
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs">Miqdor</Label>
                        <Input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => {
                            const next = [...form.details];
                            next[idx] = { ...next[idx], quantity: e.target.value };
                            setForm({ ...form, details: next });
                          }}
                        />
                      </div>
                      <div className="sm:col-span-1 flex sm:justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={form.details.length <= 1}
                          onClick={() => {
                            const next = form.details.filter((_, i) => i !== idx);
                            setForm({ ...form, details: next.length ? next : [emptyDetailRow()] });
                          }}
                          aria-label="Qatorni o‘chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                  })}
                </div>
                {selectedLaboratoryId && analysesForSelectedLab.length === 0 && !loadingAnalyses && (
                  <p className="text-xs text-muted-foreground">
                    Tanlangan laboratoriyada tahlillar topilmadi.
                  </p>
                )}
                {!loadingPrices && amountSummary.missingPriceCount > 0 && (
                  <p className="text-xs text-amber-600">
                    {amountSummary.missingPriceCount} ta tahlil uchun narx topilmadi, summaga qo‘shilmadi.
                  </p>
                )}
                {analyses.length === 0 && !loadingAnalyses && (
                  <p className="text-xs text-muted-foreground">Tahlillar ro‘yxati bo‘sh (GET /analyses/admin).</p>
                )}
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Jami (subtotal)</span>
                  <span className="font-medium">{money(amountSummary.subTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Chegirma</span>
                  <span className="font-medium">-{money(amountSummary.discountTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold pt-1 border-t">
                  <span>Umumiy summa</span>
                  <span>{money(amountSummary.total)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Bekor qilish
                </Button>
                <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saqlanmoqda…" : "Saqlash"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buyurtmani o‘chirish</AlertDialogTitle>
              <AlertDialogDescription>
                #{deleteTarget?.id} buyurtmasi o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Bekor</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDelete();
                }}
              >
                {deleting ? "O‘chirilmoqda…" : "O‘chirish"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
