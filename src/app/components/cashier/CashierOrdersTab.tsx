import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DatePicker,
  Modal,
  Input as AntInput,
  Select as AntSelect,
  Button as AntButton,
  Typography,
  Space,
} from "antd";
import dayjs from "dayjs";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Filter, Building2, MapPin, User } from "lucide-react";

const { RangePicker } = DatePicker;
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader } from "../ui/card";
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
import { fetchPatients, type FetchPatientsParams, type PatientDto } from "../../../services/patientsApi";
import { fetchSamples, type SampleDto } from "../../../services/samplesApi";
import { fetchLaboratories, type LaboratoryDto } from "../../../services/laboratoriesApi";
import { fetchSanMinimums, type SanMinimumDto } from "../../../services/sanMinimumsApi";
import { fetchActiveCourses, type CourseDto } from "../../../services/coursesApi";
import { fetchCoursePrice, type CoursePriceDto } from "../../../services/coursePricesApi";
import { formatTableDateTime } from "../../../utils/tableDateFormat";

const PICKER_LIST_SIZE = 500;
/** Buyurtma «Bemor» tanlovi uchun GET /patients — `availableForOrder=true` majburiy emas, lekin shu forma uchun true */
const PATIENTS_QUERY_FOR_ORDER: FetchPatientsParams = { availableForOrder: true };

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function patientPickerLabel(p: PatientDto): string {
  const name = [p.firstName, p.lastName, p.surname].filter(Boolean).join(" ").trim();
  return name ? `${name} (#${p.id})` : `Bemor #${p.id}`;
}

function samplePickerLabel(s: SampleDto): string {
  const title = s.name?.trim() || s.sourceName?.trim();
  return title ? `${title} (#${s.id})` : `Namuna #${s.id}`;
}

function sanMinimumPickerLabel(m: SanMinimumDto): string {
  const fio = [m.lastName, m.firstName, m.surname].filter(Boolean).join(" ").trim();
  return fio ? `${fio} (#${m.id})` : `San minimum #${m.id}`;
}

function sanMinimumOrderDisplayName(o: OrderDto): string {
  const fn = o.sanMinimumFirstName?.trim() ?? "";
  const ln = o.sanMinimumLastName?.trim() ?? "";
  const fio = [ln, fn].filter(Boolean).join(" ").trim();
  if (fio) return fio;
  if (o.sanMinimumId != null && o.sanMinimumId > 0) return `San minimum #${o.sanMinimumId}`;
  return "—";
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
  /** GET /enums `cardTypes` — faqat to‘lov turi CARD bo‘lganda */
  cardId: string;
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
    cardId: "",
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
  const sanMinId = o.sanMinimumId != null && o.sanMinimumId > 0 ? o.sanMinimumId : null;
  const patientOrSanId = sanMinId ?? o.patientId;
  return {
    orderType: String(o.orderType),
    laboratoryId: labId > 0 ? String(labId) : "",
    patientId: String(patientOrSanId ?? ""),
    sampleId: String(o.sampleId),
    paymentType: String(o.paymentType),
    cardId: o.cardId != null && o.cardId > 0 ? String(o.cardId) : "",
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
  mode: {
    isHumanOrder: boolean;
    isObjectOrder: boolean;
    isSanMinimumOrder: boolean;
    useSanMinimumPicker: boolean;
  },
  priceByAnalysisId: Map<number, number>,
  enums: EnumsData | null,
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
  // SAN_MINIMUM uchun kurs tanlash majburiy, boshqa turlarda laboratoriya tanlash majburiy
  if (mode.isSanMinimumOrder) {
    if (!Number.isFinite(laboratoryId) || laboratoryId <= 0) {
      toast.error("Kursni tanlang");
      return null;
    }
  } else {
    if (!Number.isFinite(laboratoryId) || laboratoryId <= 0) {
      toast.error("Laboratoriyani tanlang");
      return null;
    }
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
  } else if (mode.isSanMinimumOrder) {
    if (mode.useSanMinimumPicker) {
      if (!Number.isFinite(patientId) || patientId <= 0) {
        toast.error("San minimum o‘quvchini tanlang");
        return null;
      }
    } else if (!Number.isFinite(patientId) || patientId <= 0) {
      toast.error("SAN_MINIMUM uchun bemor tanlang");
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
  let details: SaveOrderBody["details"] = [];

  // SAN_MINIMUM uchun details bo‘sh yuboriladi, faqat kurs va sanMinimum ishlatiladi
  let rootDiscountPercent: number | undefined;
  if (mode.isSanMinimumOrder) {
    const row = f.details[0];
    if (row) {
      const pctRaw = Number(row.discountPercent);
      const pct = Math.min(100, Math.max(0, Number.isFinite(pctRaw) ? pctRaw : 0));
      rootDiscountPercent = Math.round(pct * 100) / 100;
    }
    details = [];
  } else {
    details = [];
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
  }

  let outPatientId: number | null;
  let outSampleId: number | null;
  let sanMinimumId: number | undefined;

  if (mode.isObjectOrder) {
    outPatientId = null;
    outSampleId = Number.isFinite(sampleId) && sampleId > 0 ? sampleId : null;
  } else if (mode.useSanMinimumPicker) {
    outPatientId = null;
    outSampleId = null;
    sanMinimumId = Number.isFinite(patientId) && patientId > 0 ? patientId : undefined;
  } else if (mode.isHumanOrder || mode.isSanMinimumOrder) {
    outPatientId = Number.isFinite(patientId) && patientId > 0 ? patientId : null;
    outSampleId = null;
  } else {
    outPatientId = Number.isFinite(patientId) && patientId > 0 ? patientId : null;
    outSampleId = Number.isFinite(sampleId) && sampleId > 0 ? sampleId : null;
  }

  const baseBody: SaveOrderBody = {
    orderType,
    patientId: outPatientId,
    sampleId: outSampleId,
    paymentType,
    paymentStatus,
    details,
  };

  const paymentTypeName =
    enums?.paymentTypes.find((x) => x.value === paymentType)?.name?.trim().toUpperCase() ?? "";
  if (paymentTypeName === "CARD") {
    const cardId = Number(f.cardId);
    if (!Number.isFinite(cardId) || cardId <= 0) {
      toast.error("Karta turini tanlang");
      return null;
    }
    baseBody.cardId = cardId;
  }

  // SAN_MINIMUM uchun kurs va umumiy chegirma, sanMinimumId ni ham biriktiramiz
  if (mode.isSanMinimumOrder) {
    const courseId = Number(f.laboratoryId);
    if (Number.isFinite(courseId) && courseId > 0) {
      (baseBody as SaveOrderBody).courseId = courseId;
    }
    if (sanMinimumId !== undefined) {
      (baseBody as SaveOrderBody).sanMinimumId = sanMinimumId;
    }
    if (rootDiscountPercent !== undefined) {
      (baseBody as SaveOrderBody).discountPercent = rootDiscountPercent;
    }
  } else if (sanMinimumId !== undefined) {
    // Boshqa hollarda ham agar sanMinimumId bo‘lsa, yuborib qo‘yamiz
    (baseBody as SaveOrderBody).sanMinimumId = sanMinimumId;
  }

  return baseBody;
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
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursePrice, setCoursePrice] = useState<CoursePriceDto | null>(null);
  const [loadingCoursePrice, setLoadingCoursePrice] = useState(false);
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [samples, setSamples] = useState<SampleDto[]>([]);
  const [loadingPickerLists, setLoadingPickerLists] = useState(true);
  const [sanMinimums, setSanMinimums] = useState<SanMinimumDto[]>([]);
  const [loadingSanMinimums, setLoadingSanMinimums] = useState(false);

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
    setLoadingCourses(true);
    fetchActiveCourses()
      .then((rows) => {
        if (!cancelled) setCourses(rows);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Kurslar yuklanmadi"))
      .finally(() => {
        if (!cancelled) setLoadingCourses(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPickerLists(true);
    Promise.all([
      fetchPatients(0, PICKER_LIST_SIZE, PATIENTS_QUERY_FOR_ORDER),
      fetchSamples(0, PICKER_LIST_SIZE),
    ])
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
  const courseIdsInList = useMemo(() => new Set(courses.map((c) => c.id)), [courses]);
  const showOrphanCourse =
    form.laboratoryId !== "" &&
    Number.isFinite(Number(form.laboratoryId)) &&
    Number(form.laboratoryId) > 0 &&
    !courseIdsInList.has(Number(form.laboratoryId));
  const patientNameById = useMemo(() => {
    const m = new Map<number, string>();
    patients.forEach((p) => {
      const full = [p.firstName, p.lastName, p.surname].filter(Boolean).join(" ").trim();
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
  const isSanMinimumOrder = selectedOrderTypeName === "SAN_MINIMUM";
  const selectedPaymentTypeName = useMemo(() => {
    const v = Number(form.paymentType);
    if (!Number.isFinite(v)) return "";
    const hit = enums?.paymentTypes.find((x) => x.value === v);
    return hit?.name?.trim().toUpperCase() ?? "";
  }, [enums, form.paymentType]);
  const isCardPayment = selectedPaymentTypeName === "CARD";
  const selectedLaboratory = useMemo(() => {
    const n = Number(form.laboratoryId);
    if (!Number.isFinite(n) || n <= 0) return null;
    return laboratories.find((l) => l.id === n) ?? null;
  }, [laboratories, form.laboratoryId]);
  const useSanMinimumPicker = isSanMinimumOrder;
  const sanMinimumIdsInList = useMemo(() => new Set(sanMinimums.map((m) => m.id)), [sanMinimums]);
  const showOrphanSanMinimum =
    useSanMinimumPicker &&
    form.patientId !== "" &&
    Number.isFinite(Number(form.patientId)) &&
    Number(form.patientId) > 0 &&
    !sanMinimumIdsInList.has(Number(form.patientId));
  const selectedLaboratoryId = useMemo(() => {
    const n = Number(form.laboratoryId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [form.laboratoryId]);
  const analysesForSelectedLab = useMemo(() => {
    if (!selectedLaboratoryId) return [];
    return analyses.filter((a) => Number(a.laboratoryId) === selectedLaboratoryId);
  }, [analyses, selectedLaboratoryId]);

  /** SAN_MINIMUM da `form.laboratoryId` kurs ID — analizlar `/analyses/admin` uchun `laboratoryId` filter orqali olinadi */
  const analysesFetchLaboratoryId = useMemo(() => {
    if (isSanMinimumOrder) return null;
    return selectedLaboratoryId;
  }, [isSanMinimumOrder, selectedLaboratoryId]);

  useEffect(() => {
    let cancelled = false;
    if (analysesFetchLaboratoryId == null) {
      setAnalyses([]);
      setLoadingAnalyses(false);
      return () => {
        cancelled = true;
      };
    }
    setLoadingAnalyses(true);
    fetchAnalyses({ laboratoryId: analysesFetchLaboratoryId })
      .then((rows) => {
        if (!cancelled) setAnalyses(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Tahlillar yuklanmadi");
          setAnalyses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalyses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analysesFetchLaboratoryId]);

  useEffect(() => {
    // SAN_MINIMUM + kurs tanlanganda kurs narxini olish
    if (!dialogOpen || !isSanMinimumOrder) {
      setCoursePrice(null);
      return;
    }
    const courseId = Number(form.laboratoryId);
    if (!Number.isFinite(courseId) || courseId <= 0) {
      setCoursePrice(null);
      return;
    }
    let cancelled = false;
    setLoadingCoursePrice(true);
    fetchCoursePrice(courseId)
      .then((p) => {
        if (!cancelled) setCoursePrice(p);
      })
      .catch((e) => {
        if (!cancelled) {
          setCoursePrice(null);
          toast.error(e instanceof Error ? e.message : "Kurs narxi yuklanmadi");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCoursePrice(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, isSanMinimumOrder, form.laboratoryId]);
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
    // SAN_MINIMUM uchun course narxiga asoslangan hisob
    if (isSanMinimumOrder && coursePrice) {
      const row = form.details[0] ?? emptyDetailRow();
      const qtyRaw = Number(row.quantity);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const pctRaw = Number(row.discountPercent);
      const pct = Math.min(100, Math.max(0, Number.isFinite(pctRaw) ? pctRaw : 0));
      const subTotal = coursePrice.price * qty;
      const discountTotal = Math.round((subTotal * pct) / 100);
      return {
        subTotal,
        discountTotal,
        total: Math.max(0, subTotal - discountTotal),
        missingPriceCount: 0,
      };
    }

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
  }, [form.details, priceByAnalysisId, isSanMinimumOrder, coursePrice]);

  useEffect(() => {
    if ((isHumanOrder || isSanMinimumOrder) && form.sampleId !== "") {
      setForm((prev) => ({ ...prev, sampleId: "" }));
      return;
    }
    if (isObjectOrder && form.patientId !== "") {
      setForm((prev) => ({ ...prev, patientId: "" }));
    }
  }, [isHumanOrder, isObjectOrder, isSanMinimumOrder, form.sampleId, form.patientId]);

  useEffect(() => {
    if (!dialogOpen || !useSanMinimumPicker) {
      setSanMinimums([]);
      return;
    }
    let cancelled = false;
    setLoadingSanMinimums(true);
    fetchSanMinimums(0, PICKER_LIST_SIZE)
      .then((p) => {
        if (!cancelled) setSanMinimums(p.items);
      })
      .catch((e) => {
        if (!cancelled) {
          setSanMinimums([]);
          toast.error(e instanceof Error ? e.message : "San minimumlar yuklanmadi");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSanMinimums(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, useSanMinimumPicker]);

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
    const body = formToBody(
      form,
      { isHumanOrder, isObjectOrder, isSanMinimumOrder, useSanMinimumPicker },
      priceByAnalysisId,
      enums,
    );
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-wrap gap-2">
            <AntButton
              icon={<Filter className="h-4 w-4" />}
              className="shrink-0"
              onClick={() => setFiltersOpen((v) => !v)}
              disabled={loadingEnums}
            >
              Filterlash
            </AntButton>
            <AntButton type="primary" icon={<Plus className="h-4 w-4" />} className="shrink-0" onClick={openCreate} disabled={loadingEnums}>
              Buyurtma yaratish
            </AntButton>
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
                        const rowIsSanMinimum = orderTypeName === "SAN_MINIMUM";
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
                            {rowIsSanMinimum && (
                              <TableCell className="text-sm max-w-[240px] truncate" title={sanMinimumOrderDisplayName(o)}>
                                {sanMinimumOrderDisplayName(o)}
                              </TableCell>
                            )}
                            {!rowIsHuman && !rowIsObject && !rowIsSanMinimum && (
                              <TableCell className="text-sm text-muted-foreground">—</TableCell>
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
                              {rowIsHuman && (
                                <span className="text-sm">{o.patientPhoneNumber ?? "—"}</span>
                              )}
                              {rowIsObject && (
                                <span className="text-sm">-</span>
                              )}
                              {rowIsSanMinimum && (
                                <span className="text-sm">{o.sanMinimumPhoneNumber ?? "—"}</span>
                              )}
                              {!rowIsHuman && !rowIsObject && !rowIsSanMinimum && (
                                <span className="text-sm">—</span>
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

        <Modal
          title={editingId != null ? "Buyurtmani tahrirlash" : "Yangi buyurtma"}
          open={dialogOpen}
          onCancel={() => {
            setDialogOpen(false);
            setEditingId(null);
          }}
          width={800}
          destroyOnClose
          styles={{ body: { maxHeight: "min(90vh, 720px)", overflowY: "auto" } }}
          footer={
            <Space>
              <AntButton
                onClick={() => {
                  setDialogOpen(false);
                  setEditingId(null);
                }}
                disabled={saving}
              >
                Bekor qilish
              </AntButton>
              <AntButton type="primary" loading={saving} onClick={() => void handleSave()}>
                Saqlash
              </AntButton>
            </Space>
          }
        >
          <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Typography.Text>Buyurtma turi</Typography.Text>
                  <AntSelect
                    className="w-full"
                    placeholder={loadingEnums ? "…" : "Tanlang"}
                    loading={loadingEnums}
                    disabled={loadingEnums}
                    value={form.orderType || undefined}
                    onChange={(v) => setForm({ ...form, orderType: v ?? "" })}
                    options={(enums?.orderTypes ?? []).map((e) => ({
                      value: String(e.value),
                      label: enumEntryDisplayLabel(e),
                    }))}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Typography.Text>To‘lov turi</Typography.Text>
                  <AntSelect
                    className="w-full"
                    placeholder="Tanlang"
                    value={form.paymentType || undefined}
                    onChange={(v) => {
                      const next = v ?? "";
                      const payName =
                        enums?.paymentTypes.find((x) => String(x.value) === next)?.name?.trim().toUpperCase() ?? "";
                      setForm((prev) => ({
                        ...prev,
                        paymentType: next,
                        cardId: payName === "CARD" ? prev.cardId : "",
                      }));
                    }}
                    options={(enums?.paymentTypes ?? []).map((e) => ({
                      value: String(e.value),
                      label: enumEntryDisplayLabel(e),
                    }))}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>
                {isCardPayment ? (
                  <div className="flex flex-col gap-1">
                    <Typography.Text>Karta turi</Typography.Text>
                    <AntSelect
                      className="w-full"
                      placeholder={loadingEnums ? "…" : "Tanlang"}
                      loading={loadingEnums}
                      disabled={loadingEnums}
                      value={form.cardId || undefined}
                      onChange={(v) => setForm({ ...form, cardId: v ?? "" })}
                      options={(enums?.cardTypes ?? []).map((e) => ({
                        value: String(e.value),
                        label: enumEntryDisplayLabel(e),
                      }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </div>
                ) : null}
                <div className="flex flex-col gap-1">
                  <Typography.Text>To‘lov holati</Typography.Text>
                  <AntSelect
                    className="w-full"
                    placeholder="Tanlang"
                    value={form.paymentStatus || undefined}
                    onChange={(v) => setForm({ ...form, paymentStatus: v ?? "" })}
                    options={(enums?.paymentStatuses ?? []).map((e) => ({
                      value: String(e.value),
                      label: enumEntryDisplayLabel(e),
                    }))}
                    showSearch
                    optionFilterProp="label"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>{isSanMinimumOrder ? "Kurs" : "Laboratoriya"}</Typography.Text>
                  {isSanMinimumOrder ? (
                    <AntSelect
                      className="w-full"
                      placeholder={loadingCourses ? "Yuklanmoqda…" : "Tanlang"}
                      loading={loadingCourses}
                      disabled={loadingCourses}
                      value={form.laboratoryId || undefined}
                      onChange={(v) => setForm((prev) => ({ ...prev, laboratoryId: v ?? "" }))}
                      options={[
                        ...(showOrphanCourse
                          ? [
                              {
                                value: form.laboratoryId,
                                label: `Kurs #${form.laboratoryId} (ro‘yxatda yo‘q)`,
                              },
                            ]
                          : []),
                        ...courses.map((c) => ({
                          value: String(c.id),
                          label: c.name || `Kurs #${c.id}`,
                        })),
                      ]}
                      showSearch
                      optionFilterProp="label"
                      listHeight={320}
                    />
                  ) : (
                    <AntSelect
                      className="w-full"
                      placeholder={loadingLaboratories ? "Yuklanmoqda…" : "Tanlang"}
                      loading={loadingLaboratories}
                      disabled={loadingLaboratories}
                      value={form.laboratoryId || undefined}
                      onChange={(v) => setForm((prev) => ({ ...prev, laboratoryId: v ?? "" }))}
                      options={[
                        ...(showOrphanLaboratory
                          ? [
                              {
                                value: form.laboratoryId,
                                label: `Laboratoriya #${form.laboratoryId} (ro‘yxatda yo‘q)`,
                              },
                            ]
                          : []),
                        ...laboratories.map((l) => ({
                          value: String(l.id),
                          label: l.nameUz || l.nameRu || `Laboratoriya #${l.id}`,
                        })),
                      ]}
                      showSearch
                      optionFilterProp="label"
                      listHeight={320}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {useSanMinimumPicker ? (
                    <div className="flex flex-col gap-1">
                      <Typography.Text>San minimum</Typography.Text>
                      <AntSelect
                        className="w-full"
                        placeholder={loadingSanMinimums ? "Yuklanmoqda…" : "Tanlang"}
                        loading={loadingSanMinimums}
                        disabled={loadingSanMinimums}
                        value={form.patientId || undefined}
                        onChange={(v) => setForm({ ...form, patientId: v ?? "" })}
                        options={[
                          ...(showOrphanSanMinimum
                            ? [
                                {
                                  value: form.patientId,
                                  label: `San minimum #${form.patientId} (ro‘yxatda yo‘q)`,
                                },
                              ]
                            : []),
                          ...sanMinimums.map((m) => ({
                            value: String(m.id),
                            label: sanMinimumPickerLabel(m),
                          })),
                        ]}
                        showSearch
                        optionFilterProp="label"
                        listHeight={320}
                      />
                    </div>
                  ) : (
                    <>
                      {!isObjectOrder && (
                        <div className="flex flex-col gap-1">
                          {/* Ro‘yxat: `PATIENTS_QUERY_FOR_ORDER` → GET /patients?availableForOrder=true */}
                          <Typography.Text>Bemor</Typography.Text>
                          <AntSelect
                            className="w-full"
                            placeholder={loadingPickerLists ? "Yuklanmoqda…" : "Tanlang"}
                            loading={loadingPickerLists}
                            disabled={loadingPickerLists}
                            value={form.patientId || undefined}
                            onChange={(v) => setForm({ ...form, patientId: v ?? "" })}
                            options={[
                              ...(showOrphanPatient
                                ? [
                                    {
                                      value: form.patientId,
                                      label: `Bemor #${form.patientId} (ro‘yxatda yo‘q)`,
                                    },
                                  ]
                                : []),
                              ...patients.map((p) => ({
                                value: String(p.id),
                                label: patientPickerLabel(p),
                              })),
                            ]}
                            showSearch
                            optionFilterProp="label"
                            listHeight={320}
                          />
                        </div>
                      )}
                      {!isHumanOrder && !isSanMinimumOrder && (
                        <div className="flex flex-col gap-1">
                          <Typography.Text>Namuna</Typography.Text>
                          <AntSelect
                            className="w-full"
                            placeholder={loadingPickerLists ? "Yuklanmoqda…" : "Tanlang"}
                            loading={loadingPickerLists}
                            disabled={loadingPickerLists}
                            value={form.sampleId || undefined}
                            onChange={(v) => setForm({ ...form, sampleId: v ?? "" })}
                            options={[
                              ...(showOrphanSample
                                ? [
                                    {
                                      value: form.sampleId,
                                      label: `Namuna #${form.sampleId} (ro‘yxatda yo‘q)`,
                                    },
                                  ]
                                : []),
                              ...samples.map((s) => ({
                                value: String(s.id),
                                label: samplePickerLabel(s),
                              })),
                            ]}
                            showSearch
                            optionFilterProp="label"
                            listHeight={320}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {isSanMinimumOrder ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Typography.Text strong>Kurs bo‘yicha hisob</Typography.Text>
                    </div>
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                        <div className="sm:col-span-6 space-y-1">
                          <Typography.Text type="secondary" className="text-xs">
                            Kurs
                          </Typography.Text>
                          <p className="text-sm font-medium">
                            {loadingCoursePrice
                              ? "Yuklanmoqda…"
                              : coursePrice
                                ? coursePrice.courseName || `Kurs #${coursePrice.courseId}`
                                : "Kurs tanlanmagan yoki narx topilmadi"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Narx:{" "}
                            {coursePrice ? money(coursePrice.price) : loadingCoursePrice ? "…" : "—"}
                          </p>
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <Typography.Text type="secondary" className="text-xs">
                            Chegirma (%)
                          </Typography.Text>
                          <AntInput
                            className="w-full"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            inputMode="decimal"
                            value={form.details[0]?.discountPercent ?? "0"}
                            onChange={(e) => {
                              const next = [...form.details];
                              const row = next[0] ?? emptyDetailRow();
                              next[0] = { ...row, discountPercent: e.target.value };
                              setForm({ ...form, details: next });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Typography.Text strong>Tahlil qatorlari (details)</Typography.Text>
                      <AntButton
                        type="default"
                        size="small"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => setForm({ ...form, details: [...form.details, emptyDetailRow()] })}
                      >
                        Qator
                      </AntButton>
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
                              <Typography.Text type="secondary" className="text-xs">
                                Tahlil
                              </Typography.Text>
                              <AntSelect
                                className="w-full"
                                placeholder={
                                  !selectedLaboratoryId
                                    ? "Avval laboratoriyani tanlang"
                                    : loadingAnalyses
                                      ? "…"
                                      : "Tanlang"
                                }
                                loading={loadingAnalyses}
                                disabled={!selectedLaboratoryId || loadingAnalyses}
                                value={row.analysisId || undefined}
                                onChange={(v) => {
                                  const next = [...form.details];
                                  next[idx] = { ...next[idx], analysisId: v ?? "" };
                                  setForm({ ...form, details: next });
                                }}
                                options={[
                                  ...(showOrphanAnalysis
                                    ? [
                                        {
                                          value: row.analysisId,
                                          label: `${analysisNameById.get(aid) ?? `Tahlil #${aid}`} (boshqa lab / ro‘yxatda yo‘q)`,
                                        },
                                      ]
                                    : []),
                                  ...analysesForSelectedLab.map((a) => ({
                                    value: String(a.id),
                                    label: a.nameUz,
                                  })),
                                ]}
                                showSearch
                                optionFilterProp="label"
                                listHeight={280}
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <Typography.Text type="secondary" className="text-xs">
                                Chegirma (%)
                              </Typography.Text>
                              <AntInput
                                className="w-full"
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
                              <Typography.Text type="secondary" className="text-xs">
                                Miqdor
                              </Typography.Text>
                              <AntInput
                                className="w-full"
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
                              <AntButton
                                type="text"
                                danger
                                disabled={form.details.length <= 1}
                                onClick={() => {
                                  const next = form.details.filter((_, i) => i !== idx);
                                  setForm({ ...form, details: next.length ? next : [emptyDetailRow()] });
                                }}
                                aria-label="Qatorni o‘chirish"
                                icon={<Trash2 className="h-4 w-4" />}
                              />
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
                  </>
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
          </div>
        </Modal>

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
