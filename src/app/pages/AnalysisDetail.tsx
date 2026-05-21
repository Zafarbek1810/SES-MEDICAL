import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Save, CheckCircle, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
import {
  fetchSampleGroups,
  createSampleGroup,
  type SampleGroupDto,
} from "../../services/sampleGroupsApi";
import {
  fetchOutdoorEquipmentsByOrderDetail,
  postOutdoorEquipments,
  putOutdoorEquipmentsByOrderDetail,
  type OutdoorEquipmentResultRow,
  type OutdoorEquipmentSavedItem,
} from "../../services/analysisResultOutdoorEquipmentsApi";
import {
  fetchSoilParasitesByOrderDetail,
  postSoilParasites,
  putSoilParasitesByOrderDetail,
  type SoilParasiteResultRow,
  type SoilParasiteSavedItem,
} from "../../services/analysisResultSoilParasitesApi";

/** Suv na'munasida gijja urug'i (sp-water-check) — checkbox emas, qiymat inputlari */
const WATER_CHECK_ANALYSIS_SHORT_NAME = "SNGUA";

/** Ochiq havoda / tashqi uskunalar natijalari */
const OUTDOOR_EQUIPMENT_ANALYSIS_SHORT_NAME = "TMAOS";

/** Tuproq parazitlari natijalari */
const SOIL_PARASITE_ANALYSIS_SHORT_NAME = "TNGUT";

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

function outdoorPostDoneStorageKey(orderDetailId: number): string {
  return `outdoorEquipmentPostDone:${orderDetailId}`;
}

function newOutdoorLocalKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* jim */
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type OutdoorPointRow = {
  localKey: string;
  apiId?: number;
  samplePointName: string;
  result: string;
};

/** Bir namuna guruhi uchun blok: ichida bir nechta nuqta + natija qatorlari */
type OutdoorGroupSection = {
  sectionKey: string;
  sampleGroupId: number;
  rows: OutdoorPointRow[];
};

function emptyOutdoorPointRow(): OutdoorPointRow {
  return { localKey: newOutdoorLocalKey(), samplePointName: "", result: "" };
}

function defaultOutdoorSections(): OutdoorGroupSection[] {
  return [
    {
      sectionKey: newOutdoorLocalKey(),
      sampleGroupId: 0,
      rows: [emptyOutdoorPointRow()],
    },
  ];
}

/** API qatorlarini sampleGroupId bo‘yicha guruhlab, birinchi kelish tartibini saqlaydi */
function groupSavedOutdoorRows(savedRows: OutdoorEquipmentSavedItem[]): OutdoorGroupSection[] {
  const order: number[] = [];
  const byGroup = new Map<number, OutdoorPointRow[]>();
  for (const s of savedRows) {
    const gid = s.sampleGroupId;
    if (!byGroup.has(gid)) {
      order.push(gid);
      byGroup.set(gid, []);
    }
    byGroup.get(gid)!.push({
      localKey: newOutdoorLocalKey(),
      apiId: s.id,
      samplePointName: s.samplePointName ?? "",
      result: s.result ?? "",
    });
  }
  return order.map((sampleGroupId) => ({
    sectionKey: newOutdoorLocalKey(),
    sampleGroupId,
    rows: byGroup.get(sampleGroupId)!,
  }));
}

function flattenOutdoorSectionsToPayload(
  sections: OutdoorGroupSection[],
  orderDetailId: number
): OutdoorEquipmentResultRow[] {
  return sections
    .filter((sec) => sec.sampleGroupId > 0)
    .flatMap((sec) =>
      sec.rows.map((r) => ({
        orderDetailId,
        sampleGroupId: sec.sampleGroupId,
        samplePointName: r.samplePointName.trim(),
        isDetermined: true,
        result: r.result.trim(),
      }))
    );
}

function soilPostDoneStorageKey(orderDetailId: number): string {
  return `soilParasitePostDone:${orderDetailId}`;
}

function newSoilLocalKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* jim */
  }
  return `soil-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type SoilUiRow = {
  localKey: string;
  apiId?: number;
  samplePointName: string;
  quantity: number;
  depth: string;
  result: string;
};

function emptySoilRow(): SoilUiRow {
  return { localKey: newSoilLocalKey(), samplePointName: "", quantity: 0, depth: "", result: "" };
}

function defaultSoilRows(): SoilUiRow[] {
  return [emptySoilRow()];
}

function mapSavedSoilToUi(savedRows: SoilParasiteSavedItem[]): SoilUiRow[] {
  return savedRows.map((s) => ({
    localKey: newSoilLocalKey(),
    apiId: s.id,
    samplePointName: s.samplePointName ?? "",
    quantity: s.quantity ?? 0,
    depth: s.depth ?? "",
    result: s.result ?? "",
  }));
}

function soilRowsToPayload(rows: SoilUiRow[], orderDetailId: number): SoilParasiteResultRow[] {
  return rows.map((r) => ({
    orderDetailId,
    samplePointName: r.samplePointName.trim(),
    quantity: Number.isFinite(r.quantity) ? r.quantity : 0,
    depth: r.depth.trim(),
    result: r.result.trim(),
  }));
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
  const outdoorFirstSaveDoneRef = useRef(false);
  const soilFirstSaveDoneRef = useRef(false);

  const [sampleGroups, setSampleGroups] = useState<SampleGroupDto[]>([]);
  const [loadingOutdoorBlock, setLoadingOutdoorBlock] = useState(false);
  const [outdoorSections, setOutdoorSections] = useState<OutdoorGroupSection[]>(() => defaultOutdoorSections());
  const [sampleGroupDialogOpen, setSampleGroupDialogOpen] = useState(false);
  const [sampleGroupDialogSectionKey, setSampleGroupDialogSectionKey] = useState<string | null>(null);
  const [newSampleGroupName, setNewSampleGroupName] = useState("");
  const [creatingSampleGroup, setCreatingSampleGroup] = useState(false);

  const [loadingSoilBlock, setLoadingSoilBlock] = useState(false);
  const [soilRows, setSoilRows] = useState<SoilUiRow[]>(() => defaultSoilRows());

  const isWaterCheckAnalysis =
    detail?.analysisShortName?.trim().toUpperCase() === WATER_CHECK_ANALYSIS_SHORT_NAME;

  const isOutdoorEquipmentAnalysis =
    detail?.analysisShortName?.trim().toUpperCase() === OUTDOOR_EQUIPMENT_ANALYSIS_SHORT_NAME;

  const isSoilParasiteAnalysis =
    detail?.analysisShortName?.trim().toUpperCase() === SOIL_PARASITE_ANALYSIS_SHORT_NAME;

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
    const short = detail.analysisShortName?.trim().toUpperCase();
    if (
      short === WATER_CHECK_ANALYSIS_SHORT_NAME ||
      short === OUTDOOR_EQUIPMENT_ANALYSIS_SHORT_NAME ||
      short === SOIL_PARASITE_ANALYSIS_SHORT_NAME
    ) {
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
    if (
      !detail ||
      detail.analysisShortName?.trim().toUpperCase() !== OUTDOOR_EQUIPMENT_ANALYSIS_SHORT_NAME ||
      !Number.isFinite(orderDetailId) ||
      orderDetailId <= 0
    ) {
      setSampleGroups([]);
      setOutdoorSections(defaultOutdoorSections());
      setLoadingOutdoorBlock(false);
      return;
    }
    (async () => {
      try {
        setLoadingOutdoorBlock(true);
        const [groups, savedRows] = await Promise.all([
          fetchSampleGroups(),
          fetchOutdoorEquipmentsByOrderDetail(orderDetailId).catch(() => []),
        ]);
        if (cancelled) return;
        setSampleGroups(groups);
        if (savedRows.length > 0) {
          setOutdoorSections(groupSavedOutdoorRows(savedRows));
          outdoorFirstSaveDoneRef.current = true;
          try {
            sessionStorage.setItem(outdoorPostDoneStorageKey(orderDetailId), "1");
          } catch {
            /* jim */
          }
        } else {
          setOutdoorSections(defaultOutdoorSections());
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Ma’lumot yuklanmadi");
          setSampleGroups([]);
          setOutdoorSections(defaultOutdoorSections());
        }
      } finally {
        if (!cancelled) setLoadingOutdoorBlock(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, orderDetailId]);

  useEffect(() => {
    let cancelled = false;
    if (
      !detail ||
      detail.analysisShortName?.trim().toUpperCase() !== SOIL_PARASITE_ANALYSIS_SHORT_NAME ||
      !Number.isFinite(orderDetailId) ||
      orderDetailId <= 0
    ) {
      setSoilRows(defaultSoilRows());
      setLoadingSoilBlock(false);
      return;
    }
    (async () => {
      try {
        setLoadingSoilBlock(true);
        const savedRows = await fetchSoilParasitesByOrderDetail(orderDetailId).catch(() => []);
        if (cancelled) return;
        if (savedRows.length > 0) {
          setSoilRows(mapSavedSoilToUi(savedRows));
          soilFirstSaveDoneRef.current = true;
          try {
            sessionStorage.setItem(soilPostDoneStorageKey(orderDetailId), "1");
          } catch {
            /* jim */
          }
        } else {
          setSoilRows(defaultSoilRows());
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Ma’lumot yuklanmadi");
          setSoilRows(defaultSoilRows());
        }
      } finally {
        if (!cancelled) setLoadingSoilBlock(false);
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

  useEffect(() => {
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0) {
      outdoorFirstSaveDoneRef.current = false;
      return;
    }
    try {
      outdoorFirstSaveDoneRef.current =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(outdoorPostDoneStorageKey(orderDetailId)) === "1";
    } catch {
      outdoorFirstSaveDoneRef.current = false;
    }
  }, [orderDetailId]);

  useEffect(() => {
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0) {
      soilFirstSaveDoneRef.current = false;
      return;
    }
    try {
      soilFirstSaveDoneRef.current =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(soilPostDoneStorageKey(orderDetailId)) === "1";
    } catch {
      soilFirstSaveDoneRef.current = false;
    }
  }, [orderDetailId]);

  /** Mavjud saqlangan natijalar — faqat `/sp-parasites` ro‘yxatida bor `spParasitesId` lar tanlanadi */
  useEffect(() => {
    let cancelled = false;
    const short = detail?.analysisShortName?.trim().toUpperCase();
    if (
      !detail ||
      short === WATER_CHECK_ANALYSIS_SHORT_NAME ||
      short === OUTDOOR_EQUIPMENT_ANALYSIS_SHORT_NAME ||
      short === SOIL_PARASITE_ANALYSIS_SHORT_NAME
    ) {
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

  const updateOutdoorSectionGroup = useCallback((sectionKey: string, sampleGroupId: number) => {
    setOutdoorSections((prev) =>
      prev.map((sec) => (sec.sectionKey === sectionKey ? { ...sec, sampleGroupId } : sec))
    );
  }, []);

  const updateOutdoorPointRow = useCallback(
    (
      sectionKey: string,
      rowKey: string,
      patch: Partial<Pick<OutdoorPointRow, "samplePointName" | "result">>
    ) => {
      setOutdoorSections((prev) =>
        prev.map((sec) =>
          sec.sectionKey !== sectionKey
            ? sec
            : {
                ...sec,
                rows: sec.rows.map((r) => (r.localKey === rowKey ? { ...r, ...patch } : r)),
              }
        )
      );
    },
    []
  );

  const addOutdoorSection = useCallback(() => {
    setOutdoorSections((prev) => [
      ...prev,
      {
        sectionKey: newOutdoorLocalKey(),
        sampleGroupId: 0,
        rows: [emptyOutdoorPointRow()],
      },
    ]);
  }, []);

  const removeOutdoorSection = useCallback((sectionKey: string) => {
    setOutdoorSections((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.sectionKey !== sectionKey);
    });
  }, []);

  const addPointRowToSection = useCallback((sectionKey: string) => {
    setOutdoorSections((prev) =>
      prev.map((sec) =>
        sec.sectionKey !== sectionKey
          ? sec
          : { ...sec, rows: [...sec.rows, emptyOutdoorPointRow()] }
      )
    );
  }, []);

  const removePointRowFromSection = useCallback((sectionKey: string, rowKey: string) => {
    setOutdoorSections((prev) =>
      prev.map((sec) => {
        if (sec.sectionKey !== sectionKey) return sec;
        if (sec.rows.length <= 1) return sec;
        return { ...sec, rows: sec.rows.filter((r) => r.localKey !== rowKey) };
      })
    );
  }, []);

  const handleSaveOutdoorResults = useCallback(async () => {
    if (isReadOnly) return;
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0 || !detail) return;
    const payload = flattenOutdoorSectionsToPayload(outdoorSections, orderDetailId);
    if (payload.length === 0) {
      toast.error("Kamida bitta namuna guruhi tanlang va unga nuqta qatorlarini kiriting");
      return;
    }
    try {
      setSavingResults(true);
      const res = outdoorFirstSaveDoneRef.current
        ? await putOutdoorEquipmentsByOrderDetail(orderDetailId, payload)
        : await postOutdoorEquipments(payload);
      if (res.success === false) {
        const errMsg =
          typeof res.message === "string" && res.message.trim()
            ? res.message.trim()
            : "Saqlash muvaffaqiyatsiz";
        toast.error(errMsg);
        return;
      }
      if (!outdoorFirstSaveDoneRef.current) {
        outdoorFirstSaveDoneRef.current = true;
        try {
          sessionStorage.setItem(outdoorPostDoneStorageKey(orderDetailId), "1");
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
  }, [isReadOnly, orderDetailId, detail, outdoorSections, navigate, listPath]);

  const handleSubmitNewSampleGroup = useCallback(async () => {
    const name = newSampleGroupName.trim();
    if (!name) {
      toast.error("Guruh nomini kiriting");
      return;
    }
    try {
      setCreatingSampleGroup(true);
      const created = await createSampleGroup({ name });
      const list = await fetchSampleGroups();
      setSampleGroups(list);
      const sk = sampleGroupDialogSectionKey;
      if (sk) {
        updateOutdoorSectionGroup(sk, created.id);
      }
      setSampleGroupDialogOpen(false);
      setNewSampleGroupName("");
      setSampleGroupDialogSectionKey(null);
      toast.success("Namuna guruhi qo‘shildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Guruh yaratib bo‘lmadi");
    } finally {
      setCreatingSampleGroup(false);
    }
  }, [newSampleGroupName, sampleGroupDialogSectionKey, updateOutdoorSectionGroup]);

  const updateSoilRow = useCallback(
    (
      localKey: string,
      patch: Partial<Pick<SoilUiRow, "samplePointName" | "quantity" | "depth" | "result">>
    ) => {
      setSoilRows((prev) =>
        prev.map((row) => (row.localKey === localKey ? { ...row, ...patch } : row))
      );
    },
    []
  );

  const handleSaveSoilResults = useCallback(async () => {
    if (isReadOnly) return;
    if (!Number.isFinite(orderDetailId) || orderDetailId <= 0 || !detail) return;
    const payload = soilRowsToPayload(soilRows, orderDetailId);
    if (payload.length === 0) {
      toast.error("Kamida bitta qator kiriting");
      return;
    }
    try {
      setSavingResults(true);
      const res = soilFirstSaveDoneRef.current
        ? await putSoilParasitesByOrderDetail(orderDetailId, payload)
        : await postSoilParasites(payload);
      if (res.success === false) {
        const errMsg =
          typeof res.message === "string" && res.message.trim()
            ? res.message.trim()
            : "Saqlash muvaffaqiyatsiz";
        toast.error(errMsg);
        return;
      }
      if (!soilFirstSaveDoneRef.current) {
        soilFirstSaveDoneRef.current = true;
        try {
          sessionStorage.setItem(soilPostDoneStorageKey(orderDetailId), "1");
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
  }, [isReadOnly, orderDetailId, detail, soilRows, navigate, listPath]);

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
              {isWaterCheckAnalysis
                ? "Suv tekshiruvi parametrlari"
                : isOutdoorEquipmentAnalysis
                  ? "Ochiq havoda uskunalar (namuna nuqtalari)"
                  : isSoilParasiteAnalysis
                    ? "Tuproq parazitlari (namuna nuqtalari)"
                    : "Parazitlar va topilmalar"}
            </CardTitle>
            <CardDescription>
              {isWaterCheckAnalysis
                ? isReadOnly
                  ? "Parametr qiymatlari (faqat ko‘rish)"
                  : "Faqat to‘ldirilgan parametrlar saqlashda yuboriladi"
                : isOutdoorEquipmentAnalysis
                  ? isReadOnly
                    ? "Namuna guruhlari bo‘yicha nuqtalar va natijalar (faqat ko‘rish)"
                    : "Har bir blok bitta namuna guruhi: uning ostida shu guruhga tegishli nuqta va natija qatorlari; kerak bo‘lsa «Guruh qo‘shish»"
                  : isSoilParasiteAnalysis
                    ? isReadOnly
                      ? "Namuna nuqtasi, miqdor, chuqurlik va natija (faqat ko‘rish)"
                      : "Har bir qator — bitta namuna nuqtasi; kerak bo‘lsa «Qator qo‘shish»"
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
              ) : isOutdoorEquipmentAnalysis ? (
                loadingOutdoorBlock ? (
                  <p className="text-sm text-muted-foreground">Ma’lumotlar yuklanmoqda…</p>
                ) : (
                  <div className="space-y-6">
                    {outdoorSections.map((section, sectionIndex) => {
                      const groupLabel =
                        section.sampleGroupId > 0
                          ? sampleGroups.find((g) => g.id === section.sampleGroupId)?.name ?? `Guruh #${section.sampleGroupId}`
                          : "Namuna guruhi tanlanmagan";
                      return (
                        <motion.div
                          key={section.sectionKey}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + Math.min(sectionIndex, 8) * 0.05 }}
                          className="rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-muted/10 dark:from-muted/20 dark:to-muted/5 overflow-hidden shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border bg-muted/50 px-4 py-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Namuna guruhi
                              </p>
                              <p className="font-semibold text-foreground truncate" title={groupLabel}>
                                {groupLabel}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2 min-w-[12rem]">
                                <Select
                                  value={
                                    section.sampleGroupId > 0 ? String(section.sampleGroupId) : undefined
                                  }
                                  onValueChange={(v) =>
                                    updateOutdoorSectionGroup(section.sectionKey, Number(v))
                                  }
                                  disabled={isReadOnly}
                                >
                                  <SelectTrigger className="rounded-lg w-full sm:min-w-[200px] min-h-10 bg-background">
                                    <SelectValue placeholder="Guruhni tanlang" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sampleGroups.map((g) => (
                                      <SelectItem key={g.id} value={String(g.id)}>
                                        {g.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {!isReadOnly && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg shrink-0"
                                    onClick={() => {
                                      setSampleGroupDialogSectionKey(section.sectionKey);
                                      setNewSampleGroupName("");
                                      setSampleGroupDialogOpen(true);
                                    }}
                                  >
                                    Yangi qo‘shish
                                  </Button>
                                )}
                              </div>
                              {!isReadOnly && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-lg text-destructive hover:text-destructive shrink-0 sm:ml-1"
                                  disabled={outdoorSections.length <= 1}
                                  title={
                                    outdoorSections.length <= 1
                                      ? "Kamida bitta guruh bloki bo‘lishi kerak"
                                      : "Guruh blokini o‘chirish"
                                  }
                                  onClick={() => removeOutdoorSection(section.sectionKey)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Shu guruhga tegishli namuna nuqtalari va natijalar
                            </p>
                            {section.rows.map((row, rowIndex) => (
                              <motion.div
                                key={row.localKey}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 * Math.min(rowIndex, 10) }}
                                className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end rounded-xl border border-border/80 bg-background/50 p-3"
                              >
                                <div className="space-y-2">
                                  <Label htmlFor={`outdoor-point-${row.localKey}`} className="text-xs">
                                    Namuna nuqtasi
                                  </Label>
                                  <Input
                                    id={`outdoor-point-${row.localKey}`}
                                    placeholder="Masalan: nuqta A"
                                    value={row.samplePointName}
                                    readOnly={isReadOnly}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                      updateOutdoorPointRow(section.sectionKey, row.localKey, {
                                        samplePointName: e.target.value,
                                      })
                                    }
                                    className="rounded-lg"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`outdoor-result-${row.localKey}`} className="text-xs">
                                    Natija
                                  </Label>
                                  <Input
                                    id={`outdoor-result-${row.localKey}`}
                                    placeholder="Natija matni"
                                    value={row.result}
                                    readOnly={isReadOnly}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                      updateOutdoorPointRow(section.sectionKey, row.localKey, {
                                        result: e.target.value,
                                      })
                                    }
                                    className="rounded-lg"
                                  />
                                </div>
                                {!isReadOnly && (
                                  <div className="flex justify-end md:pb-0.5">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-lg text-destructive hover:text-destructive"
                                      disabled={section.rows.length <= 1}
                                      title={
                                        section.rows.length <= 1
                                          ? "Guruhda kamida bitta qator bo‘lishi kerak"
                                          : "Qatorni o‘chirish"
                                      }
                                      onClick={() =>
                                        removePointRowFromSection(section.sectionKey, row.localKey)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </motion.div>
                            ))}

                            {!isReadOnly && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="rounded-lg gap-1.5 w-full sm:w-auto"
                                onClick={() => addPointRowToSection(section.sectionKey)}
                              >
                                <Plus className="h-4 w-4" />
                                Shu guruhga nuqta qo‘shish
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl gap-2 w-full border-dashed border-2"
                        onClick={addOutdoorSection}
                      >
                        <Plus className="h-4 w-4" />
                        Yangi namuna guruhi (blok) qo‘shish
                      </Button>
                    )}
                  </div>
                )
              ) : isSoilParasiteAnalysis ? (
                loadingSoilBlock ? (
                  <p className="text-sm text-muted-foreground">Ma’lumotlar yuklanmoqda…</p>
                ) : (
                  <div className="space-y-4">
                    {soilRows.map((row, index) => (
                      <motion.div
                        key={row.localKey}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + Math.min(index, 12) * 0.03 }}
                        className="rounded-xl border border-border bg-muted/30 p-4"
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`soil-point-${row.localKey}`} className="text-xs">
                              Namuna nuqtasi
                            </Label>
                            <Input
                              id={`soil-point-${row.localKey}`}
                              placeholder="Masalan: nuqta 1"
                              value={row.samplePointName}
                              readOnly={isReadOnly}
                              disabled={isReadOnly}
                              onChange={(e) =>
                                updateSoilRow(row.localKey, { samplePointName: e.target.value })
                              }
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`soil-qty-${row.localKey}`} className="text-xs">
                              Miqdor
                            </Label>
                            <Input
                              id={`soil-qty-${row.localKey}`}
                              type="number"
                              min={0}
                              step={1}
                              placeholder="0"
                              value={row.quantity === 0 ? "" : String(row.quantity)}
                              readOnly={isReadOnly}
                              disabled={isReadOnly}
                              onChange={(e) => {
                                const v = e.target.value;
                                const n = v === "" ? 0 : Number(v);
                                updateSoilRow(row.localKey, {
                                  quantity: Number.isFinite(n) ? n : 0,
                                });
                              }}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`soil-depth-${row.localKey}`} className="text-xs">
                              Chuqurlik
                            </Label>
                            <Input
                              id={`soil-depth-${row.localKey}`}
                              placeholder="Masalan: 10–20 sm"
                              value={row.depth}
                              readOnly={isReadOnly}
                              disabled={isReadOnly}
                              onChange={(e) => updateSoilRow(row.localKey, { depth: e.target.value })}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`soil-result-${row.localKey}`} className="text-xs">
                              Natija
                            </Label>
                            <Input
                              id={`soil-result-${row.localKey}`}
                              placeholder="Natija matni"
                              value={row.result}
                              readOnly={isReadOnly}
                              disabled={isReadOnly}
                              onChange={(e) => updateSoilRow(row.localKey, { result: e.target.value })}
                              className="rounded-lg"
                            />
                          </div>
                        </div>
                        {!isReadOnly && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-destructive hover:text-destructive gap-1"
                              disabled={soilRows.length <= 1}
                              title={
                                soilRows.length <= 1
                                  ? "Kamida bitta qator bo‘lishi kerak"
                                  : "Qatorni o‘chirish"
                              }
                              onClick={() =>
                                setSoilRows((prev) => prev.filter((r) => r.localKey !== row.localKey))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              O‘chirish
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl gap-2 w-full md:w-auto"
                        onClick={() => setSoilRows((prev) => [...prev, emptySoilRow()])}
                      >
                        <Plus className="h-4 w-4" />
                        Qator qo‘shish
                      </Button>
                    )}
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
                ) : isOutdoorEquipmentAnalysis ? (
                  <>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        type="button"
                        onClick={() => void handleSaveOutdoorResults()}
                        disabled={loadingDetail || !detail || savingResults || loadingOutdoorBlock}
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
                ) : isSoilParasiteAnalysis ? (
                  <>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        type="button"
                        onClick={() => void handleSaveSoilResults()}
                        disabled={loadingDetail || !detail || savingResults || loadingSoilBlock}
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

      <Dialog
        open={sampleGroupDialogOpen}
        onOpenChange={(open) => {
          setSampleGroupDialogOpen(open);
          if (!open) {
            setNewSampleGroupName("");
            setSampleGroupDialogSectionKey(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Yangi namuna guruhi</DialogTitle>
            <DialogDescription>Guruh nomini kiriting va yaratishni bosing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-sample-group-name">Nomi</Label>
            <Input
              id="new-sample-group-name"
              value={newSampleGroupName}
              onChange={(e) => setNewSampleGroupName(e.target.value)}
              placeholder="Masalan: 1-guruh"
              className="rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmitNewSampleGroup();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setSampleGroupDialogOpen(false);
                setNewSampleGroupName("");
                setSampleGroupDialogSectionKey(null);
              }}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={creatingSampleGroup}
              onClick={() => void handleSubmitNewSampleGroup()}
            >
              {creatingSampleGroup ? "Yaratilmoqda…" : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
