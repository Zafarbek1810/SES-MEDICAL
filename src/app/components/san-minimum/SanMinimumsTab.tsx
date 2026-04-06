import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Filter, Award } from "lucide-react";
import {
  Modal,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Table,
  Pagination,
  Typography,
  Space,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { formatTableDate } from "../../../utils/tableDateFormat";
import {
  fetchWorkplaces,
  fetchWorkplacesByUserLocation,
  fetchWorkplacesAdmin,
  type WorkplaceDto,
} from "../../../services/workplacesApi";
import { fetchDepartments, type DepartmentDto } from "../../../services/departmentsApi";
import { getEnums, enumLabel, enumName, enumEntryDisplayLabel, type EnumsData } from "../../../services/enumsApi";
import {
  createSanMinimum,
  deleteSanMinimum,
  fetchSanMinimum,
  fetchSanMinimumCertificateBlob,
  fetchSanMinimums,
  updateSanMinimum,
  type SanMinimumDto,
  type SanMinimumListFilters,
  type SaveSanMinimumBody,
} from "../../../services/sanMinimumsApi";
import type { ReferenceItem } from "../../../services/referenceDataApi";
import { fetchRegions, fetchDistricts } from "../../../services/referenceDataApi";
import {
  fetchSpIndustries,
  fetchSpPositions,
  type SpIndustryDto,
  type SpPositionDto,
} from "../../../services/spIndustriesPositionsApi";
import { fetchEmployees, type EmployeeDto } from "../../../services/employeesApi";

const UZ_PHONE_PREFIX = "+998";
const PHONE_LOCAL_DIGITS = 9;

function parseFormDateString(s: string | undefined | null): Dayjs | null {
  if (s == null || !String(s).trim()) return null;
  const d = dayjs(String(s).trim());
  return d.isValid() ? d : null;
}

/** API / forma: to‘liq raqamdan +998 keyingi 9 ta raqam */
function parseLocalDigitsFromStored(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length >= 3 + PHONE_LOCAL_DIGITS) {
    return digits.slice(3, 3 + PHONE_LOCAL_DIGITS);
  }
  if (digits.length >= PHONE_LOCAL_DIGITS) {
    return digits.slice(-PHONE_LOCAL_DIGITS);
  }
  return digits.slice(0, PHONE_LOCAL_DIGITS);
}

/** AdminPanel / kassa bemorlari bilan bir xil — selectlarda lotincha nom (nameLat) */
function employeeOptionLabel(e: EmployeeDto): string {
  const fio = [e.lastName, e.firstName, e.surname].filter(Boolean).join(" ").trim();
  return fio || `Xodim #${e.id}`;
}

function referenceNameLatLabel(item: ReferenceItem): string {
  const o = item as Record<string, unknown>;
  const nameLat =
    (typeof o.nameLat === "string" ? o.nameLat : undefined) ??
    (typeof o.name_lat === "string" ? o.name_lat : undefined);
  const fallback =
    item.nameUz?.trim() || item.name?.trim() || item.nameRu?.trim() || `#${item.id}`;
  return nameLat?.trim() || fallback;
}

/** GET /enums `sanPaymentTypes[].name` bo‘yicha rang */
function sanPaymentTypeBadgeClass(nameKey: string): string {
  const key = nameKey.trim().toUpperCase();
  if (key === "PAID") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (key === "FREE") return "bg-sky-100 text-sky-800 border-sky-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

/** GET /enums `courseStates[].name` bo‘yicha rang */
function courseStateBadgeClass(nameKey: string): string {
  const key = nameKey.trim().toUpperCase();
  if (key === "COMPLETED") return "bg-green-100 text-green-800 border-green-200";
  if (key === "UNFINISHED") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

/** 1/2/3-kun sanalari — to‘lov / kurs holati badgelaridan boshqacha (mono sana, har kun alohida rang) */
function sanSessionDayBadgeClass(day: 1 | 2 | 3): string {
  if (day === 1) {
    return "bg-indigo-50 text-indigo-900 border-indigo-200/90 dark:bg-indigo-950/50 dark:text-indigo-100 dark:border-indigo-800";
  }
  if (day === 2) {
    return "bg-rose-50 text-rose-900 border-rose-200/90 dark:bg-rose-950/45 dark:text-rose-100 dark:border-rose-800";
  }
  return "bg-teal-50 text-teal-900 border-teal-200/90 dark:bg-teal-950/45 dark:text-teal-100 dark:border-teal-800";
}

function renderSanSessionDateCell(date: string | undefined, day: 1 | 2 | 3) {
  if (!date) return "—";
  return (
    <Badge
      className={`${sanSessionDayBadgeClass(day)} border font-mono tabular-nums text-xs font-normal whitespace-nowrap`}
    >
      {formatTableDate(date)}
    </Badge>
  );
}

type FormState = {
  firstName: string;
  lastName: string;
  surname: string;
  /** +998 dan keyingi aynan 9 ta raqam (prefiks alohida ko‘rsatiladi) */
  phoneLocalDigits: string;
  /** Ish joyini viloyat/tuman bo‘yicha tanlash uchun */
  regionId: string;
  districtId: string;
  spIndustryId: string;
  spPositionId: string;
  employeeId: string;
  workplaceId: string;
  spDepartmentId: string;
  firstDate: string;
  secondDate: string;
  thirdDate: string;
  paymentType: string;
};

function emptyForm(): FormState {
  return {
    firstName: "",
    lastName: "",
    surname: "",
    phoneLocalDigits: "",
    regionId: "",
    districtId: "",
    spIndustryId: "",
    spPositionId: "",
    employeeId: "",
    workplaceId: "",
    spDepartmentId: "0",
    firstDate: "",
    secondDate: "",
    thirdDate: "",
    paymentType: "0",
  };
}

function dtoToForm(d: SanMinimumDto, workplacesList: WorkplaceDto[]): FormState {
  const wp = workplacesList.find((w) => w.id === d.workplaceId);
  const regionId =
    d.regionId && d.regionId > 0 ? String(d.regionId) : wp ? String(wp.regionId) : "";
  const districtId =
    d.districtId && d.districtId > 0 ? String(d.districtId) : wp ? String(wp.districtId) : "";
  const industryId =
    d.positionIndustryId != null && d.positionIndustryId > 0 ? String(d.positionIndustryId) : "";
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    surname: d.surname,
    phoneLocalDigits: parseLocalDigitsFromStored(d.phoneNumber),
    regionId,
    districtId,
    spIndustryId: industryId,
    spPositionId: d.positionId && d.positionId > 0 ? String(d.positionId) : "",
    employeeId: d.employeeId ? String(d.employeeId) : "",
    workplaceId: String(d.workplaceId),
    spDepartmentId: "0",
    firstDate: d.firstDate ?? "",
    secondDate: d.secondDate ?? "",
    thirdDate: d.thirdDate ?? "",
    paymentType: String(d.paymentType),
  };
}

function formToBody(f: FormState): SaveSanMinimumBody | null {
  if (!f.firstName.trim() || !f.lastName.trim()) {
    toast.error("Ism va familiya majburiy");
    return null;
  }
  const regionId = Number(f.regionId);
  const districtId = Number(f.districtId);
  const workplaceId = Number(f.workplaceId);
  const positionId = Number(f.spPositionId);
  const employeeId = Number(f.employeeId);
  const paymentType = Number(f.paymentType);
  if (!Number.isFinite(regionId) || regionId <= 0) {
    toast.error("Viloyatni tanlang");
    return null;
  }
  if (!Number.isFinite(districtId) || districtId <= 0) {
    toast.error("Tumanni tanlang");
    return null;
  }
  if (!Number.isFinite(workplaceId) || workplaceId <= 0) {
    toast.error("Ish joyini tanlang");
    return null;
  }
  if (!Number.isFinite(positionId) || positionId <= 0) {
    toast.error("Lavozimni tanlang");
    return null;
  }
  if (!Number.isFinite(employeeId) || employeeId <= 0) {
    toast.error("Xodimni tanlang");
    return null;
  }
  if (!Number.isFinite(paymentType) || paymentType < 0) {
    toast.error("To‘lov turini tanlang");
    return null;
  }
  const phoneDigits = f.phoneLocalDigits.replace(/\D/g, "");
  if (phoneDigits.length !== PHONE_LOCAL_DIGITS) {
    toast.error(`Telefon: +998 dan keyin aynan ${PHONE_LOCAL_DIGITS} ta raqam kiriting`);
    return null;
  }
  return {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    surname: f.surname.trim(),
    phoneNumber: `${UZ_PHONE_PREFIX}${phoneDigits}`,
    regionId,
    districtId,
    workplaceId,
    positionId,
    employeeId,
    firstDate: f.firstDate.trim(),
    secondDate: f.secondDate.trim(),
    thirdDate: f.thirdDate.trim(),
    paymentType,
  };
}

/** API `positionIndustryId` bermasa, lavozim orqali sohani topish (tahrirlash formasi uchun). */
async function resolvePositionIndustryId(d: SanMinimumDto): Promise<SanMinimumDto> {
  if (d.positionIndustryId != null && d.positionIndustryId > 0) return d;
  if (!d.positionId || d.positionId <= 0) return d;
  try {
    const industries = await fetchSpIndustries();
    for (const ind of industries) {
      const positions = await fetchSpPositions(ind.id);
      if (positions.some((p) => p.id === d.positionId)) {
        return { ...d, positionIndustryId: ind.id };
      }
    }
  } catch {
    /* ignore */
  }
  return d;
}

const MONTH_NAMES_UZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
] as const;

function buildAppliedFilters(draft: {
  courseState: string;
  paymentType: string;
  workplaceId: string;
  date: Dayjs | null;
  month: string;
  year: string;
}): SanMinimumListFilters {
  const f: SanMinimumListFilters = {};
  const cs = Number(draft.courseState);
  if (draft.courseState.trim() !== "" && Number.isFinite(cs)) f.courseState = cs;
  const pt = Number(draft.paymentType);
  if (draft.paymentType.trim() !== "" && Number.isFinite(pt)) f.paymentType = pt;
  const wp = Number(draft.workplaceId);
  if (draft.workplaceId.trim() !== "" && Number.isFinite(wp) && wp > 0) f.workplaceId = wp;
  if (draft.date) f.date = draft.date.format("YYYY-MM-DD");
  const monthNum = Number(draft.month);
  if (draft.month.trim() !== "" && Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12) {
    f.month = monthNum;
  }
  const yearNum = Number(draft.year);
  if (draft.year.trim() !== "" && Number.isFinite(yearNum) && yearNum >= 1900 && yearNum <= 2100) {
    f.year = yearNum;
  }
  return f;
}

export type SanMinimumsTabProps = {
  /** Kassa: true. SAN_MINIMUM roli: yangi yozuv qo‘shish o‘chiriladi. */
  allowCreate?: boolean;
  /** 1/2/3-kun sanalari tahrirlash — faqat SAN_MINIMUM roli (kassada ko‘rinmaydi). */
  showCourseDatesOnEdit?: boolean;
};

export default function SanMinimumsTab({
  allowCreate = true,
  showCourseDatesOnEdit = false,
}: SanMinimumsTabProps) {
  const [items, setItems] = useState<SanMinimumDto[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [workplaces, setWorkplaces] = useState<WorkplaceDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [loadingRef, setLoadingRef] = useState(true);

  const [draftCourseState, setDraftCourseState] = useState("");
  const [draftPaymentType, setDraftPaymentType] = useState("");
  const [draftWorkplaceId, setDraftWorkplaceId] = useState("");
  const [draftDate, setDraftDate] = useState<Dayjs | null>(null);
  const [draftMonth, setDraftMonth] = useState("");
  const [draftYear, setDraftYear] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SanMinimumDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [districts, setDistricts] = useState<ReferenceItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [spIndustries, setSpIndustries] = useState<SpIndustryDto[]>([]);
  const [spPositions, setSpPositions] = useState<SpPositionDto[]>([]);
  const [loadingSpPositions, setLoadingSpPositions] = useState(false);
  const [employeesList, setEmployeesList] = useState<EmployeeDto[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const appliedFilters = useMemo(
    () =>
      buildAppliedFilters({
        courseState: draftCourseState,
        paymentType: draftPaymentType,
        workplaceId: draftWorkplaceId,
        date: draftDate,
        month: draftMonth,
        year: draftYear,
      }),
    [draftCourseState, draftPaymentType, draftWorkplaceId, draftDate, draftMonth, draftYear],
  );

  useEffect(() => {
    setPage(0);
  }, [draftCourseState, draftPaymentType, draftWorkplaceId, draftDate, draftMonth, draftYear]);

  const clearFilters = () => {
    setDraftCourseState("");
    setDraftPaymentType("");
    setDraftWorkplaceId("");
    setDraftDate(null);
    setDraftMonth("");
    setDraftYear("");
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingRef(true);
    Promise.all([
      getEnums().catch(() => null),
      fetchWorkplacesByUserLocation()
        .catch(() => fetchWorkplaces())
        .catch(() => fetchWorkplacesAdmin()),
      fetchDepartments(),
      fetchRegions(),
      fetchSpIndustries().catch(() => []),
    ])
      .then(([e, w, d, r, ind]) => {
        if (!cancelled) {
          if (e) setEnums(e);
          setWorkplaces(w);
          setDepartments(d);
          setRegions(r);
          setSpIndustries(ind);
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

  useEffect(() => {
    const rid = Number(form.regionId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    fetchDistricts(rid)
      .then((rows) => {
        if (!cancelled) setDistricts(rows);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.regionId]);

  useEffect(() => {
    const iid = Number(form.spIndustryId);
    if (!Number.isFinite(iid) || iid <= 0) {
      setSpPositions([]);
      return;
    }
    let cancelled = false;
    setLoadingSpPositions(true);
    fetchSpPositions(iid)
      .then((rows) => {
        if (!cancelled) setSpPositions(rows);
      })
      .catch(() => {
        if (!cancelled) setSpPositions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSpPositions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.spIndustryId]);

  useEffect(() => {
    const rid = Number(form.regionId);
    const did = Number(form.districtId);
    if (!Number.isFinite(rid) || rid <= 0 || !Number.isFinite(did) || did <= 0) {
      setEmployeesList([]);
      return;
    }
    const dep = Number(form.spDepartmentId);
    let cancelled = false;
    setLoadingEmployees(true);
    fetchEmployees(0, 100, {
      regionId: rid,
      districtId: did,
      ...(Number.isFinite(dep) && dep > 0 ? { spDepartmentId: dep } : {}),
    })
      .then((p) => {
        if (!cancelled) setEmployeesList(p.items);
      })
      .catch(() => {
        if (!cancelled) setEmployeesList([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployees(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.regionId, form.districtId, form.spDepartmentId]);

  const workplacesForForm = useMemo(() => {
    const rid = Number(form.regionId);
    const did = Number(form.districtId);
    let list = workplaces;
    if (Number.isFinite(rid) && rid > 0) {
      list = list.filter((w) => w.regionId === rid);
    }
    if (Number.isFinite(did) && did > 0) {
      list = list.filter((w) => w.districtId === did);
    }
    return list;
  }, [workplaces, form.regionId, form.districtId]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const p = await fetchSanMinimums(page, pageSize, appliedFilters);
      setItems(p.items);
      setTotalElements(p.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ro‘yxat yuklanmadi");
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [page, pageSize, appliedFilters]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const workplaceName = (id: number) => {
    if (id <= 0) return "—";
    return workplaces.find((w) => w.id === id)?.name ?? `Ish joyi #${id}`;
  };

  const sanPaymentTypes = enums?.sanPaymentTypes ?? [];
  const courseStates = enums?.courseStates ?? [];

  const workplaceSelectIds = useMemo(() => new Set(workplacesForForm.map((w) => w.id)), [workplacesForForm]);
  const orphanWorkplaceId = Number(form.workplaceId);
  const showOrphanWorkplace =
    Number.isFinite(orphanWorkplaceId) &&
    orphanWorkplaceId > 0 &&
    !workplaceSelectIds.has(orphanWorkplaceId);

  const positionSelectIds = useMemo(() => new Set(spPositions.map((p) => p.id)), [spPositions]);
  const orphanPositionId = Number(form.spPositionId);
  const showOrphanPosition =
    Number.isFinite(orphanPositionId) &&
    orphanPositionId > 0 &&
    !positionSelectIds.has(orphanPositionId);

  const employeeSelectIds = useMemo(() => new Set(employeesList.map((e) => e.id)), [employeesList]);
  const orphanEmployeeId = Number(form.employeeId);
  const showOrphanEmployee =
    Number.isFinite(orphanEmployeeId) &&
    orphanEmployeeId > 0 &&
    !employeeSelectIds.has(orphanEmployeeId);

  const filterCourseStateOptions = useMemo(
    () => courseStates.map((cs) => ({ value: String(cs.value), label: enumEntryDisplayLabel(cs) })),
    [courseStates],
  );
  const filterPaymentTypeOptions = useMemo(
    () => sanPaymentTypes.map((pt) => ({ value: String(pt.value), label: enumEntryDisplayLabel(pt) })),
    [sanPaymentTypes],
  );
  const filterWorkplaceOptions = useMemo(
    () => workplaces.map((w) => ({ value: String(w.id), label: w.name })),
    [workplaces],
  );
  const monthFilterOptions = useMemo(
    () => MONTH_NAMES_UZ.map((label, i) => ({ value: String(i + 1), label: `${label}` })),
    [],
  );
  const yearFilterOptions = useMemo(() => {
    const cy = dayjs().year();
    const out: { value: string; label: string }[] = [];
    for (let y = cy + 1; y >= cy - 15; y -= 1) {
      out.push({ value: String(y), label: String(y) });
    }
    return out;
  }, []);
  const regionSelectOptions = useMemo(
    () => regions.map((r) => ({ value: String(r.id), label: referenceNameLatLabel(r) })),
    [regions],
  );
  const districtSelectOptions = useMemo(
    () => districts.map((d) => ({ value: String(d.id), label: referenceNameLatLabel(d) })),
    [districts],
  );
  const industrySelectIds = useMemo(() => new Set(spIndustries.map((i) => i.id)), [spIndustries]);
  const orphanIndustryId = Number(form.spIndustryId);
  const showOrphanIndustry =
    Number.isFinite(orphanIndustryId) &&
    orphanIndustryId > 0 &&
    !industrySelectIds.has(orphanIndustryId);

  const industrySelectOptions = useMemo(() => {
    const rows = spIndustries.map((ind) => ({ value: String(ind.id), label: ind.name }));
    const iid = form.spIndustryId;
    if (showOrphanIndustry && iid && !rows.some((r) => r.value === iid)) {
      return [{ value: iid, label: `Soha #${iid}` }, ...rows];
    }
    return rows;
  }, [spIndustries, showOrphanIndustry, form.spIndustryId]);
  const positionSelectOptions = useMemo(() => {
    const rows = spPositions.map((p) => ({ value: String(p.id), label: p.name }));
    const pid = form.spPositionId;
    if (showOrphanPosition && pid && !rows.some((r) => r.value === pid)) {
      return [{ value: pid, label: `Lavozim #${pid}` }, ...rows];
    }
    return rows;
  }, [spPositions, showOrphanPosition, form.spPositionId]);
  const employeeSelectOptions = useMemo(() => {
    const rows = employeesList.map((em) => ({
      value: String(em.id),
      label: employeeOptionLabel(em),
    }));
    const eid = form.employeeId;
    if (showOrphanEmployee && eid && !rows.some((r) => r.value === eid)) {
      return [{ value: eid, label: `Xodim #${eid}` }, ...rows];
    }
    return rows;
  }, [employeesList, showOrphanEmployee, form.employeeId]);
  const workplaceDialogOptions = useMemo(() => {
    const rows = workplacesForForm.map((w) => ({ value: String(w.id), label: w.name }));
    const wid = form.workplaceId;
    if (showOrphanWorkplace && wid && !rows.some((r) => r.value === wid)) {
      return [{ value: wid, label: `Ish joyi #${wid}` }, ...rows];
    }
    return rows;
  }, [workplacesForForm, showOrphanWorkplace, form.workplaceId]);
  const paymentTypeFormOptions = useMemo(
    () => sanPaymentTypes.map((pt) => ({ value: String(pt.value), label: enumEntryDisplayLabel(pt) })),
    [sanPaymentTypes],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (row: SanMinimumDto) => {
    setEditingId(row.id);
    setDialogOpen(true);
    try {
      const full = await resolvePositionIndustryId(await fetchSanMinimum(row.id));
      setForm(dtoToForm(full, workplaces));
    } catch {
      const fallback = await resolvePositionIndustryId(row);
      setForm(dtoToForm(fallback, workplaces));
    }
  };

  const handleSave = async () => {
    if (editingId == null && !allowCreate) return;
    const body = formToBody(form);
    if (!body) return;
    setSaving(true);
    try {
      if (editingId != null) {
        await updateSanMinimum(editingId, body);
        toast.success("Yangilandi");
      } else {
        await createSanMinimum(body);
        toast.success("Yaratildi");
      }
      setDialogOpen(false);
      setEditingId(null);
      await loadList();
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
      await deleteSanMinimum(deleteTarget.id);
      toast.success("O‘chirildi");
      setDeleteTarget(null);
      await loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O‘chirishda xatolik");
    } finally {
      setDeleting(false);
    }
  };

  const openCertificate = useCallback(async (row: SanMinimumDto) => {
    try {
      let blob = await fetchSanMinimumCertificateBlob(row.id);
      const ct = blob.type?.toLowerCase() ?? "";
      if (!ct || ct === "application/octet-stream") {
        blob = new Blob([blob], { type: "application/pdf" });
      }
      const url = URL.createObjectURL(blob);
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Yangi oynani ochib bo‘lmadi. Brauzer bloklovini tekshiring.");
        URL.revokeObjectURL(url);
        return;
      }
      const safeSrc = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      win.document.open();
      win.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Ma'lumotnoma</title>` +
          `<style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%;}</style></head>` +
          `<body><iframe src="${safeSrc}" title="Ma'lumotnoma"/></body></html>`
      );
      win.document.close();
      win.addEventListener("beforeunload", () => URL.revokeObjectURL(url));
      window.setTimeout(() => URL.revokeObjectURL(url), 600_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ma'lumotnoma yuklanmadi");
    }
  }, []);

  const tableColumns: ColumnsType<SanMinimumDto> = useMemo(
    () => [
      {
        title: "№",
        width: 72,
        render: (row, _record, index) =>  index + 1,
      },
      {
        title: "O'quvchi (F.I.O)",
        ellipsis: true,
        render: (row) =>
          [row.lastName, row.firstName, row.surname].filter(Boolean).join(" ").trim() || "—",
      },
      {
        title: "Ish joyi",
        ellipsis: true,
        render: (row) => row.workplaceName ?? workplaceName(row.workplaceId),
      },
      {
        title: "Lavozim",
        width: 200,
        ellipsis: true,
        render: (row) => row.positionName ?? (row.positionId ? `#${row.positionId}` : "—"),
      },
      {
        title: "Telefon raqami",
        render: (row) => row.phoneNumber || "—",
      },
      {
        title: "To‘lov turi",
        render: (row) => {
          const nameKey = enumName(sanPaymentTypes, row.paymentType);
          const text = row.paymentTypeName ?? enumLabel(sanPaymentTypes, row.paymentType);
          return (
            <Badge className={`${sanPaymentTypeBadgeClass(nameKey)} border font-medium whitespace-nowrap`}>
              {text}
            </Badge>
          );
        },
      },
      {
        title: "1-kun",
        render: (row) => renderSanSessionDateCell(row.firstDate, 1),
      },
      {
        title: "2-kun",
        render: (row) => renderSanSessionDateCell(row.secondDate, 2),
      },
      {
        title: "3-kun",
        render: (row) => renderSanSessionDateCell(row.thirdDate, 3),
      },
      {
        title: "Kursni tugatganlik holati",
        render: (row) => {
          const nameKey = enumName(courseStates, row.courseState);
          const text = row.courseStateName ?? enumLabel(courseStates, row.courseState);
          return (
            <Badge className={`${courseStateBadgeClass(nameKey)} border font-medium whitespace-nowrap`}>
              {text}
            </Badge>
          );
        },
      },
      {
        title: "Hujjat raqami",
        render: (row) => {
          const courseDone =
            enumName(courseStates, row.courseState).trim().toUpperCase() === "COMPLETED";
          const text = courseDone ? row.referenceNumber : undefined;
          return (
            <Typography.Text className="text-sm font-medium text-center">
              {text != null && text !== "" ? text : "—"}
            </Typography.Text>
          );
        },
      },
      {
        title: "Amallar",
        key: "actions",
        align: "right",
        width: 156,
        render: (row) => {
          const courseDone =
            enumName(courseStates, row.courseState).trim().toUpperCase() === "COMPLETED";
          return (
            <Space size="small">
              <Button type="text" size="small" icon={<Edit className="h-4 w-4" />} onClick={() => void openEdit(row)} />
              {courseDone ? (
                <Button
                  type="text"
                  size="small"
                  icon={<Award className="h-4 w-4" />}
                  title="Ma'lumotnoma"
                  aria-label="Sertifikat"
                  onClick={() => void openCertificate(row)}
                />
              ) : null}
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setDeleteTarget(row)}
              />
            </Space>
          );
        },
      },
    ],
    [page, pageSize, sanPaymentTypes, courseStates, workplaces, openCertificate],
  );

  return (
    <Card
      title="San minimumlar"
      extra={
        <Space wrap>
          <Button icon={<Filter className="h-4 w-4" />} onClick={() => setFiltersOpen((v) => !v)} disabled={loadingRef}>
            Filterlash
          </Button>
          {allowCreate ? (
            <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={loadingRef}>
              Qo‘shish
            </Button>
          ) : null}
        </Space>
      }
    >
      <Space direction="vertical" size="large" className="w-full">
        {filtersOpen && (
          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Typography.Text strong>San minimumlarni filterlash</Typography.Text>
              <Button type="link" size="small" onClick={clearFilters}>
                Tozalash
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="flex flex-col gap-1">
                <Typography.Text type="secondary" className="text-xs">
                  Kurs holati
                </Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder="Barchasi"
                  value={draftCourseState || undefined}
                  onChange={(v) => setDraftCourseState(v ?? "")}
                  options={filterCourseStateOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text type="secondary" className="text-xs">
                  To‘lov turi
                </Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder="Barchasi"
                  value={draftPaymentType || undefined}
                  onChange={(v) => setDraftPaymentType(v ?? "")}
                  options={filterPaymentTypeOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text type="secondary" className="text-xs">
                  Ish joyi
                </Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder="Barchasi"
                  value={draftWorkplaceId || undefined}
                  onChange={(v) => setDraftWorkplaceId(v ?? "")}
                  options={filterWorkplaceOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text type="secondary" className="text-xs">
                  Sana
                </Typography.Text>
                <DatePicker
                  className="w-full"
                  value={draftDate}
                  onChange={(d) => setDraftDate(d)}
                  format="DD.MM.YYYY"
                  allowClear
                  placeholder="Tanlang"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text type="secondary" className="text-xs">
                  Yil (year)
                </Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder="Barchasi"
                  value={draftYear || undefined}
                  onChange={(v) => setDraftYear(v ?? "")}
                  options={yearFilterOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text type="secondary" className="text-xs">
                  Oy (month)
                </Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder="Barchasi"
                  value={draftMonth || undefined}
                  onChange={(v) => setDraftMonth(v ?? "")}
                  options={monthFilterOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
             
            </div>
          </div>
        )}

        <Table<SanMinimumDto>
          rowKey="id"
          loading={loadingList}
          columns={tableColumns}
          dataSource={items}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Ma’lumot yo‘q" }}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Pagination
            current={page + 1}
            pageSize={pageSize}
            total={totalElements}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            disabled={loadingList}
            onChange={(p, ps) => {
              if (ps != null && ps !== pageSize) {
                setPageSize(ps);
                setPage(0);
              } else {
                setPage(p - 1);
              }
            }}
            showTotal={(t) => `Jami: ${t} ta`}
          />
        </div>

        <Modal
          title={editingId != null ? "Tahrirlash" : "Yangi san minimum"}
          open={dialogOpen}
          onCancel={() => {
            setDialogOpen(false);
            setEditingId(null);
          }}
          width={720}
          destroyOnClose
          footer={
            <Space>
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  setEditingId(null);
                }}
              >
                Bekor qilish
              </Button>
              <Button type="primary" loading={saving} onClick={() => void handleSave()}>
                {saving ? "Saqlanmoqda…" : "Saqlash"}
              </Button>
            </Space>
          }
        >
          <Typography.Paragraph type="secondary" className="!mb-4">
            Barcha maydonlar serverga yuboriladi.
          </Typography.Paragraph>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Typography.Text>Ism</Typography.Text>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Ism"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Familiya</Typography.Text>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Familiya"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Otasining ismi</Typography.Text>
                <Input
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                  placeholder="Otasining ismi"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Telefon</Typography.Text>
                <Input
                  addonBefore={UZ_PHONE_PREFIX}
                  className="w-full"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={PHONE_LOCAL_DIGITS}
                  placeholder="901234567"
                  value={form.phoneLocalDigits}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, PHONE_LOCAL_DIGITS);
                    setForm({ ...form, phoneLocalDigits: next });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Viloyat</Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder={loadingRef ? "…" : "Tanlang"}
                  loading={loadingRef}
                  disabled={loadingRef}
                  value={form.regionId || undefined}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      regionId: v ?? "",
                      districtId: "",
                      workplaceId: "",
                    })
                  }
                  options={regionSelectOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Tuman</Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder={loadingDistricts ? "…" : "Tanlang"}
                  loading={loadingDistricts}
                  disabled={!form.regionId || loadingDistricts}
                  value={form.districtId || undefined}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      districtId: v ?? "",
                      workplaceId: "",
                    })
                  }
                  options={districtSelectOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Soha</Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder={loadingRef ? "…" : "Tanlang"}
                  loading={loadingRef}
                  disabled={loadingRef}
                  value={form.spIndustryId || undefined}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      spIndustryId: v ?? "",
                      spPositionId: "",
                      employeeId: "",
                    })
                  }
                  options={industrySelectOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Lavozim</Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder={loadingSpPositions ? "…" : "Tanlang"}
                  loading={loadingSpPositions}
                  disabled={loadingSpPositions}
                  value={form.spPositionId || undefined}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      spPositionId: v ?? "",
                      employeeId: "",
                    })
                  }
                  options={positionSelectOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Ma&apos;sul xodim</Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder={loadingEmployees ? "…" : "Tanlang"}
                  loading={loadingEmployees}
                  disabled={
                    loadingEmployees ||
                    !form.regionId ||
                    !form.districtId ||
                    Number(form.regionId) <= 0 ||
                    Number(form.districtId) <= 0
                  }
                  value={form.employeeId || undefined}
                  onChange={(v) => setForm({ ...form, employeeId: v ?? "" })}
                  options={employeeSelectOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Ish joyi</Typography.Text>
                <Select
                  allowClear
                  className="w-full"
                  placeholder="Tanlang"
                  value={form.workplaceId || undefined}
                  onChange={(v) => setForm({ ...form, workplaceId: v ?? "" })}
                  options={workplaceDialogOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>To‘lov turi</Typography.Text>
                <Select
                  className="w-full"
                  placeholder="Tanlang"
                  value={form.paymentType || undefined}
                  onChange={(v) => setForm({ ...form, paymentType: v ?? "0" })}
                  options={paymentTypeFormOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
            </div>

            {editingId != null && showCourseDatesOnEdit ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Typography.Text>1-kun</Typography.Text>
                  <DatePicker
                    className="w-full"
                    format="DD.MM.YYYY"
                    allowClear
                    placeholder="Tanlang"
                    value={parseFormDateString(form.firstDate)}
                    onChange={(d) =>
                      setForm({ ...form, firstDate: d ? d.format("YYYY-MM-DD") : "" })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>2-kun</Typography.Text>
                  <DatePicker
                    className="w-full"
                    format="DD.MM.YYYY"
                    allowClear
                    placeholder="Tanlang"
                    value={parseFormDateString(form.secondDate)}
                    onChange={(d) =>
                      setForm({ ...form, secondDate: d ? d.format("YYYY-MM-DD") : "" })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>3-kun</Typography.Text>
                  <DatePicker
                    className="w-full"
                    format="DD.MM.YYYY"
                    allowClear
                    placeholder="Tanlang"
                    value={parseFormDateString(form.thirdDate)}
                    onChange={(d) =>
                      setForm({ ...form, thirdDate: d ? d.format("YYYY-MM-DD") : "" })
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Modal>

        <Modal
          title="O‘chirishni tasdiqlaysizmi?"
          open={deleteTarget != null}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onOk={() => void confirmDelete()}
          confirmLoading={deleting}
          okText="O‘chirish"
          okButtonProps={{ danger: true }}
          cancelText="Bekor qilish"
        >
          <p>
            {deleteTarget
              ? `${deleteTarget.firstName} ${deleteTarget.lastName} — yozuv butunlay o‘chiriladi.`
              : ""}
          </p>
        </Modal>
      </Space>
    </Card>
  );
}
