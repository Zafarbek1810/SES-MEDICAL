import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Plus, Search, Filter, Edit, Trash2, TestTube, Building2, Banknote, ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { Modal, Input as AntInput, Select as AntSelect, Button as AntdButton, Typography, Space } from "antd";
import type { LaboratoryDto } from "../../services/laboratoriesApi";
import {
  createLaboratory,
  deleteLaboratory as deleteLaboratoryApi,
  fetchLaboratories,
  updateLaboratory,
} from "../../services/laboratoriesApi";
import type { AnalysisDto } from "../../services/analysesApi";
import {
  createAnalysis,
  deleteAnalysis as deleteAnalysisApi,
  fetchAnalyses,
  updateAnalysis,
} from "../../services/analysesApi";
import type { AnalysisPriceDto } from "../../services/analysisPricesApi";
import {
  createAnalysisPrice,
  deleteAnalysisPrice as deleteAnalysisPriceApi,
  fetchAnalysisPrices,
  updateAnalysisPrice,
} from "../../services/analysisPricesApi";
import { normalizeRoleKey } from "../../services/auth";
import type { ReferenceItem } from "../../services/referenceDataApi";
import { fetchDistricts, fetchRegions, fetchRoles, roleReferenceLabel } from "../../services/referenceDataApi";
import type { UserDto } from "../../services/usersApi";
import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser as deleteUserApi,
  fetchUser,
  fetchUsers,
  formatUserFullName,
  updateUser,
} from "../../services/usersApi";
import type { WorkplaceDto } from "../../services/workplacesApi";
import {
  createWorkplace,
  deleteWorkplace as deleteWorkplaceApi,
  fetchWorkplacesAdmin,
  updateWorkplace,
} from "../../services/workplacesApi";
import type { CourseDto } from "../../services/coursesApi";
import { createCourse, fetchCourses, updateCourse } from "../../services/coursesApi";
import type { CoursePriceDto } from "../../services/coursePricesApi";
import { createCoursePrice, fetchCoursePrices, updateCoursePrice } from "../../services/coursePricesApi";

type DeleteTarget =
  | { type: "lab"; id: number; name: string }
  | { type: "analysis"; id: number; name: string }
  | { type: "analysisPrice"; id: number; label: string }
  | { type: "user"; id: number; name: string }
  | { type: "workplace"; id: number; name: string };

type UserToggleTarget = {
  id: number;
  name: string;
  activate: boolean;
};

function referenceLabel(item: ReferenceItem): string {
  return item.nameUz?.trim() || item.name?.trim() || item.nameRu?.trim() || `#${item.id}`;
}

function referenceLatLabel(item: ReferenceItem): string {
  const o = item as Record<string, unknown>;
  const lat =
    (typeof o.regionNameLat === "string" ? o.regionNameLat : undefined) ??
    (typeof o.districtNameLat === "string" ? o.districtNameLat : undefined) ??
    (typeof o.nameLat === "string" ? o.nameLat : undefined) ??
    (typeof o.name_lat === "string" ? o.name_lat : undefined);
  return lat?.trim() || referenceLabel(item);
}

function referenceNameLatLabel(item: ReferenceItem): string {
  const o = item as Record<string, unknown>;
  const nameLat =
    (typeof o.nameLat === "string" ? o.nameLat : undefined) ??
    (typeof o.name_lat === "string" ? o.name_lat : undefined);
  return nameLat?.trim() || referenceLabel(item);
}

const emptyUserForm = () => ({
  username: "",
  firstName: "",
  lastName: "",
  surname: "",
  password: "",
  phoneNumber: "",
  roleId: "",
  regionId: "",
  districtId: "",
  laboratoryId: "",
});

export default function AdminPanel() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPage, setUserPage] = useState(0);
  const [userPageSize, setUserPageSize] = useState(10);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalElements, setUserTotalElements] = useState(0);
  const [roles, setRoles] = useState<ReferenceItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [userDistricts, setUserDistricts] = useState<ReferenceItem[]>([]);
  const [loadingUserDistricts, setLoadingUserDistricts] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm());
  const [laboratories, setLaboratories] = useState<LaboratoryDto[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisDto[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [analysisPrices, setAnalysisPrices] = useState<AnalysisPriceDto[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursePrices, setCoursePrices] = useState<CoursePriceDto[]>([]);
  const [loadingCoursePrices, setLoadingCoursePrices] = useState(false);
  const [coursePricePage, setCoursePricePage] = useState(0);
  const [coursePriceSize, setCoursePriceSize] = useState(10);
  const [coursePriceTotalPages, setCoursePriceTotalPages] = useState(1);
  const [coursePriceTotalElements, setCoursePriceTotalElements] = useState(0);
  const [coursePriceFilterRegionId, setCoursePriceFilterRegionId] = useState("");
  const [coursePriceFilterDistrictId, setCoursePriceFilterDistrictId] = useState("");
  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [districts, setDistricts] = useState<ReferenceItem[]>([]);
  const [loadingRefGeo, setLoadingRefGeo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [isLabDialogOpen, setIsLabDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isWorkplaceDialogOpen, setIsWorkplaceDialogOpen] = useState(false);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isCoursePriceDialogOpen, setIsCoursePriceDialogOpen] = useState(false);

  const [workplaces, setWorkplaces] = useState<WorkplaceDto[]>([]);
  const [loadingWorkplaces, setLoadingWorkplaces] = useState(false);
  const [workplaceForm, setWorkplaceForm] = useState({ name: "", regionId: "", districtId: "" });
  const [editingWorkplace, setEditingWorkplace] = useState<WorkplaceDto | null>(null);
  const [workplaceDistricts, setWorkplaceDistricts] = useState<ReferenceItem[]>([]);
  const [loadingWorkplaceDistricts, setLoadingWorkplaceDistricts] = useState(false);
  const [workplaceDistrictLabels, setWorkplaceDistrictLabels] = useState<Record<number, string>>({});

  const [editingLab, setEditingLab] = useState<LaboratoryDto | null>(null);
  const [editingAnalysis, setEditingAnalysis] = useState<AnalysisDto | null>(null);
  const [editingPrice, setEditingPrice] = useState<AnalysisPriceDto | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseDto | null>(null);
  const [editingCoursePrice, setEditingCoursePrice] = useState<CoursePriceDto | null>(null);

  const [labForm, setLabForm] = useState({ nameUz: "", nameRu: "" });
  const [analysisForm, setAnalysisForm] = useState({
    nameUz: "",
    nameRu: "",
    laboratoryId: "",
  });
  const [priceForm, setPriceForm] = useState({
    analysisId: "",
    price: "",
    regionId: "",
    districtId: "",
  });
  const [courseForm, setCourseForm] = useState({ name: "", isActive: true });
  const [coursePriceForm, setCoursePriceForm] = useState({
    courseId: "",
    price: "",
    regionId: "",
    districtId: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [userToggleTarget, setUserToggleTarget] = useState<UserToggleTarget | null>(null);

  const labNameById = useMemo(() => {
    const m = new Map<number, string>();
    laboratories.forEach((l) => m.set(l.id, l.nameUz));
    return m;
  }, [laboratories]);

  const analysisNameById = useMemo(() => {
    const m = new Map<number, string>();
    analyses.forEach((a) => m.set(a.id, a.nameUz));
    return m;
  }, [analyses]);

  const regionNameById = useMemo(() => {
    const m = new Map<number, string>();
    regions.forEach((r) => m.set(r.id, referenceLabel(r)));
    return m;
  }, [regions]);

  const regionLatNameById = useMemo(() => {
    const m = new Map<number, string>();
    regions.forEach((r) => m.set(r.id, referenceLatLabel(r)));
    return m;
  }, [regions]);

  const roleNameById = useMemo(() => {
    const m = new Map<number, string>();
    roles.forEach((r) => m.set(r.id, roleReferenceLabel(r)));
    return m;
  }, [roles]);

  const isLaboratoryRoleId = useCallback((roleIdNum: number) => {
    const r = roles.find((x) => x.id === roleIdNum);
    if (!r?.name) return false;
    const k = normalizeRoleKey(String(r.name));
    return k === "LABORATORY_ASSISTANT" || k === "LABORATORY_DIRECTOR";
  }, [roles]);

  const isLaboratoryRoleSelected = useMemo(() => {
    const rid = Number(userForm.roleId);
    return Number.isFinite(rid) && rid > 0 && isLaboratoryRoleId(rid);
  }, [userForm.roleId, isLaboratoryRoleId]);

  const laboratoriesSorted = useMemo(
    () => [...laboratories].sort((a, b) => (a.nameUz || "").localeCompare(b.nameUz || "", "uz")),
    [laboratories],
  );

  const [districtLabelsById, setDistrictLabelsById] = useState<Record<number, string>>({});
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const loadLaboratories = async () => {
    setLoadingLabs(true);
    try {
      const list = await fetchLaboratories();
      setLaboratories(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Laboratoriyalar yuklanmadi");
      setLaboratories([]);
    } finally {
      setLoadingLabs(false);
    }
  };

  const loadAnalyses = async () => {
    setLoadingAnalyses(true);
    try {
      const list = await fetchAnalyses();
      setAnalyses(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tahlillar yuklanmadi");
      setAnalyses([]);
    } finally {
      setLoadingAnalyses(false);
    }
  };

  const loadAnalysisPrices = async () => {
    setLoadingPrices(true);
    try {
      const list = await fetchAnalysisPrices();
      setAnalysisPrices(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Narxlarni yuklab bo‘lmadi");
      setAnalysisPrices([]);
    } finally {
      setLoadingPrices(false);
    }
  };

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const list = await fetchCourses();
      setCourses(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kurslar yuklanmadi");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadCoursePrices = async (pageArg?: number, sizeArg?: number) => {
    setLoadingCoursePrices(true);
    try {
      const page = pageArg ?? coursePricePage;
      const size = sizeArg ?? coursePriceSize;
      const filters: { regionId?: number; districtId?: number } = {};
      const rid = Number(coursePriceFilterRegionId);
      const did = Number(coursePriceFilterDistrictId);
      if (Number.isFinite(rid) && rid > 0) {
        filters.regionId = rid;
      }
      if (Number.isFinite(did) && did > 0) {
        filters.districtId = did;
      }
      const res = await fetchCoursePrices(page, size, filters);
      setCoursePrices(res.items);
      setCoursePricePage(res.page);
      setCoursePriceSize(res.size);
      setCoursePriceTotalPages(Math.max(1, res.totalPages));
      setCoursePriceTotalElements(res.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kurs narxlarini yuklab bo‘lmadi");
      setCoursePrices([]);
    } finally {
      setLoadingCoursePrices(false);
    }
  };

  const loadWorkplaces = async () => {
    setLoadingWorkplaces(true);
    try {
      const list = await fetchWorkplacesAdmin();
      setWorkplaces(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ish joylari yuklanmadi");
      setWorkplaces([]);
    } finally {
      setLoadingWorkplaces(false);
    }
  };

  const loadReferenceGeo = async () => {
    setLoadingRefGeo(true);
    try {
      const r = await fetchRegions();
      setRegions(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Viloyatlar yuklanmadi");
      setRegions([]);
    } finally {
      setLoadingRefGeo(false);
    }
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const list = await fetchRoles();
      setRoles(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rollar yuklanmadi");
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const p = await fetchUsers(userPage, userPageSize);
      setUsers(p.items);
      setUserTotalPages(Math.max(1, p.totalPages));
      setUserTotalElements(p.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Foydalanuvchilar yuklanmadi");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadLaboratories();
    void loadAnalyses();
    void loadAnalysisPrices();
    void loadReferenceGeo();
    void loadRoles();
    void loadWorkplaces();
    void loadCourses();
    void loadCoursePrices(0, coursePriceSize);
  }, []);

  useEffect(() => {
    void loadCoursePrices(coursePricePage, coursePriceSize);
  }, [coursePricePage, coursePriceSize, coursePriceFilterRegionId, coursePriceFilterDistrictId]);

  useEffect(() => {
    void loadUsers();
  }, [userPage, userPageSize]);

  /** Foydalanuvchi yaratish: viloyat → tumanlar */
  useEffect(() => {
    const rid = Number(userForm.regionId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setUserDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingUserDistricts(true);
    void fetchDistricts(rid)
      .then((list) => {
        if (!cancelled) setUserDistricts(list);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Tumanlar yuklanmadi");
          setUserDistricts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUserDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userForm.regionId]);

  /** Narx formasi: tanlangan viloyat bo‘yicha GET /districts?regionId=… */
  useEffect(() => {
    const rid = Number(priceForm.regionId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    void fetchDistricts(rid)
      .then((list) => {
        if (!cancelled) setDistricts(list);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Tumanlar yuklanmadi");
          setDistricts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [priceForm.regionId]);

  /** Kurs narxi formasi: tanlangan viloyat bo‘yicha GET /districts?regionId=… */
  const [coursePriceDistricts, setCoursePriceDistricts] = useState<ReferenceItem[]>([]);
  const [loadingCoursePriceDistricts, setLoadingCoursePriceDistricts] = useState(false);
  const [coursePriceFilterDistricts, setCoursePriceFilterDistricts] = useState<ReferenceItem[]>([]);
  const [loadingCoursePriceFilterDistricts, setLoadingCoursePriceFilterDistricts] = useState(false);
  useEffect(() => {
    const rid = Number(coursePriceForm.regionId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setCoursePriceDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingCoursePriceDistricts(true);
    void fetchDistricts(rid)
      .then((list) => {
        if (!cancelled) setCoursePriceDistricts(list);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Tumanlar yuklanmadi");
          setCoursePriceDistricts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCoursePriceDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coursePriceForm.regionId]);

  /** Kurs narxlari filteri: viloyat → tumanlar */
  useEffect(() => {
    const rid = Number(coursePriceFilterRegionId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setCoursePriceFilterDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingCoursePriceFilterDistricts(true);
    void fetchDistricts(rid)
      .then((list) => {
        if (!cancelled) setCoursePriceFilterDistricts(list);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Tumanlar yuklanmadi");
          setCoursePriceFilterDistricts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCoursePriceFilterDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coursePriceFilterRegionId]);

  /** Ish joyi formasi: viloyat → tumanlar */
  useEffect(() => {
    const rid = Number(workplaceForm.regionId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setWorkplaceDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingWorkplaceDistricts(true);
    void fetchDistricts(rid)
      .then((list) => {
        if (!cancelled) setWorkplaceDistricts(list);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Tumanlar yuklanmadi");
          setWorkplaceDistricts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkplaceDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workplaceForm.regionId]);

  /** Ish joylari jadvalida tuman nomlari */
  useEffect(() => {
    const regionIds = [...new Set(workplaces.map((w) => w.regionId))];
    if (regionIds.length === 0) {
      setWorkplaceDistrictLabels({});
      return;
    }
    let cancelled = false;
    void Promise.all(regionIds.map((rid) => fetchDistricts(rid)))
      .then((lists) => {
        if (cancelled) return;
        const next: Record<number, string> = {};
        for (const list of lists) {
          for (const d of list) {
            next[d.id] = referenceLatLabel(d);
          }
        }
        setWorkplaceDistrictLabels(next);
      })
      .catch(() => {
        if (!cancelled) setWorkplaceDistrictLabels({});
      });
    return () => {
      cancelled = true;
    };
  }, [workplaces]);

  /** Jadval va tasdiq matni: ro‘yxatdagi viloyatlar bo‘yicha tuman nomlari */
  useEffect(() => {
    const regionIds = [...new Set(analysisPrices.map((p) => p.regionId))];
    if (regionIds.length === 0) {
      setDistrictLabelsById({});
      return;
    }
    let cancelled = false;
    void Promise.all(regionIds.map((rid) => fetchDistricts(rid)))
      .then((lists) => {
        if (cancelled) return;
        const next: Record<number, string> = {};
        for (const list of lists) {
          for (const d of list) {
            next[d.id] = referenceLabel(d);
          }
        }
        setDistrictLabelsById(next);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Tuman nomlari yuklanmadi");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [analysisPrices]);

  const openLabCreate = () => {
    setEditingLab(null);
    setLabForm({ nameUz: "", nameRu: "" });
    setIsLabDialogOpen(true);
  };

  const openLabEdit = (lab: LaboratoryDto) => {
    setEditingLab(lab);
    setLabForm({ nameUz: lab.nameUz, nameRu: lab.nameRu });
    setIsLabDialogOpen(true);
  };

  const handleSaveLab = async () => {
    if (!labForm.nameUz.trim() || !labForm.nameRu.trim()) {
      toast.error("O‘zbek va rus nomlarini kiriting");
      return;
    }
    try {
      if (editingLab) {
        await updateLaboratory(editingLab.id, {
          nameUz: labForm.nameUz.trim(),
          nameRu: labForm.nameRu.trim(),
        });
        toast.success("Laboratoriya yangilandi");
      } else {
        await createLaboratory({
          nameUz: labForm.nameUz.trim(),
          nameRu: labForm.nameRu.trim(),
        });
        toast.success("Laboratoriya qo‘shildi");
      }
      setIsLabDialogOpen(false);
      setEditingLab(null);
      await loadLaboratories();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const requestDeleteLab = (lab: LaboratoryDto) => {
    setDeleteTarget({ type: "lab", id: lab.id, name: lab.nameUz });
  };

  const requestDeleteAnalysis = (row: AnalysisDto) => {
    setDeleteTarget({ type: "analysis", id: row.id, name: row.nameUz });
  };

  const requestDeletePrice = (row: AnalysisPriceDto) => {
    const name = analysisNameById.get(row.analysisId) ?? `Tahlil #${row.analysisId}`;
    setDeleteTarget({
      type: "analysisPrice",
      id: row.id,
      label: `${name} — ${regionNameById.get(row.regionId) ?? row.regionId} / ${districtLabelsById[row.districtId] ?? row.districtId}`,
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const t = deleteTarget;
    try {
      if (t.type === "lab") {
        await deleteLaboratoryApi(t.id);
        toast.success("Laboratoriya o‘chirildi");
        await loadLaboratories();
        await loadAnalyses();
      } else if (t.type === "analysis") {
        await deleteAnalysisApi(t.id);
        toast.success("Tahlil turi o‘chirildi");
        await loadAnalyses();
        await loadAnalysisPrices();
      } else if (t.type === "analysisPrice") {
        await deleteAnalysisPriceApi(t.id);
        toast.success("Narx yozuvi o‘chirildi");
        await loadAnalysisPrices();
      } else if (t.type === "user") {
        await deleteUserApi(t.id);
        toast.success("Foydalanuvchi o‘chirildi");
        await loadUsers();
      } else {
        await deleteWorkplaceApi(t.id);
        toast.success("Ish joyi o‘chirildi");
        await loadWorkplaces();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O‘chirib bo‘lmadi");
    } finally {
      setDeleteTarget(null);
    }
  };

  const openAnalysisCreate = () => {
    setEditingAnalysis(null);
    setAnalysisForm({ nameUz: "", nameRu: "", laboratoryId: "" });
    setIsAnalysisDialogOpen(true);
  };

  const openAnalysisEdit = (row: AnalysisDto) => {
    setEditingAnalysis(row);
    setAnalysisForm({
      nameUz: row.nameUz,
      nameRu: row.nameRu,
      laboratoryId: String(row.laboratoryId),
    });
    setIsAnalysisDialogOpen(true);
  };

  const handleSaveAnalysis = async () => {
    if (!analysisForm.nameUz.trim() || !analysisForm.nameRu.trim()) {
      toast.error("O‘zbek va rus nomlarini kiriting");
      return;
    }
    const labId = Number(analysisForm.laboratoryId);
    if (!Number.isFinite(labId) || labId <= 0) {
      toast.error("Laboratoriyani tanlang");
      return;
    }
    try {
      if (editingAnalysis) {
        await updateAnalysis(editingAnalysis.id, {
          nameUz: analysisForm.nameUz.trim(),
          nameRu: analysisForm.nameRu.trim(),
          laboratoryId: labId,
        });
        toast.success("Tahlil turi yangilandi");
      } else {
        await createAnalysis({
          nameUz: analysisForm.nameUz.trim(),
          nameRu: analysisForm.nameRu.trim(),
          laboratoryId: labId,
        });
        toast.success("Tahlil turi qo‘shildi");
      }
      setIsAnalysisDialogOpen(false);
      setEditingAnalysis(null);
      await loadAnalyses();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const openPriceCreate = () => {
    setEditingPrice(null);
    setPriceForm({ analysisId: "", price: "", regionId: "", districtId: "" });
    setIsPriceDialogOpen(true);
  };

  const openPriceEdit = (row: AnalysisPriceDto) => {
    setEditingPrice(row);
    setPriceForm({
      analysisId: String(row.analysisId),
      price: String(row.price),
      regionId: String(row.regionId),
      districtId: String(row.districtId),
    });
    setIsPriceDialogOpen(true);
  };

  const handleSavePrice = async () => {
    const aid = Number(priceForm.analysisId);
    const priceNum = Number(priceForm.price);
    const rid = Number(priceForm.regionId);
    const did = Number(priceForm.districtId);
    if (!Number.isFinite(aid) || aid <= 0) {
      toast.error("Tahlil turini tanlang");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Narxni to‘g‘ri kiriting");
      return;
    }
    if (!Number.isFinite(rid) || rid <= 0) {
      toast.error("Viloyatni tanlang");
      return;
    }
    if (!Number.isFinite(did) || did <= 0) {
      toast.error("Tumanni tanlang");
      return;
    }
    try {
      if (editingPrice) {
        await updateAnalysisPrice(editingPrice.id, {
          analysisId: aid,
          price: priceNum,
          regionId: rid,
          districtId: did,
        });
        toast.success("Narx yangilandi");
      } else {
        await createAnalysisPrice({
          analysisId: aid,
          price: priceNum,
          regionId: rid,
          districtId: did,
        });
        toast.success("Narx qo‘shildi");
      }
      setIsPriceDialogOpen(false);
      setEditingPrice(null);
      await loadAnalysisPrices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const openCourseCreate = () => {
    setEditingCourse(null);
    setCourseForm({ name: "", isActive: true });
    setIsCourseDialogOpen(true);
  };

  const openCourseEdit = (row: CourseDto) => {
    setEditingCourse(row);
    setCourseForm({ name: row.name, isActive: row.isActive });
    setIsCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name.trim()) {
      toast.error("Kurs nomini kiriting");
      return;
    }
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, {
          name: courseForm.name.trim(),
          isActive: courseForm.isActive,
        });
        toast.success("Kurs yangilandi");
      } else {
        await createCourse({
          name: courseForm.name.trim(),
          isActive: courseForm.isActive,
        });
        toast.success("Kurs qo‘shildi");
      }
      setIsCourseDialogOpen(false);
      setEditingCourse(null);
      setCourseForm({ name: "", isActive: true });
      await loadCourses();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const openCoursePriceCreate = () => {
    setEditingCoursePrice(null);
    setCoursePriceForm({
      courseId: "",
      price: "",
      regionId: "",
      districtId: "",
    });
    setIsCoursePriceDialogOpen(true);
  };

  const openCoursePriceEdit = (row: CoursePriceDto) => {
    setEditingCoursePrice(row);
    setCoursePriceForm({
      courseId: String(row.courseId),
      price: String(row.price),
      regionId: String(row.regionId),
      districtId: String(row.districtId),
    });
    setIsCoursePriceDialogOpen(true);
  };

  const handleSaveCoursePrice = async () => {
    const cid = Number(coursePriceForm.courseId);
    const priceNum = Number(coursePriceForm.price);
    const rid = Number(coursePriceForm.regionId);
    const did = Number(coursePriceForm.districtId);
    if (!Number.isFinite(cid) || cid <= 0) {
      toast.error("Kursni tanlang");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Narxni to‘g‘ri kiriting");
      return;
    }
    if (!Number.isFinite(rid) || rid <= 0) {
      toast.error("Viloyatni tanlang");
      return;
    }
    if (!Number.isFinite(did) || did <= 0) {
      toast.error("Tumanni tanlang");
      return;
    }
    try {
      if (editingCoursePrice) {
        await updateCoursePrice(editingCoursePrice.id, {
          courseId: cid,
          price: priceNum,
          regionId: rid,
          districtId: did,
        });
        toast.success("Kurs narxi yangilandi");
      } else {
        await createCoursePrice({
          courseId: cid,
          price: priceNum,
          regionId: rid,
          districtId: did,
        });
        toast.success("Kurs narxi qo‘shildi");
      }
      setIsCoursePriceDialogOpen(false);
      setEditingCoursePrice(null);
      setCoursePriceForm({
        courseId: "",
        price: "",
        regionId: "",
        districtId: "",
      });
      await loadCoursePrices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const openUserCreate = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm());
    setIsUserDialogOpen(true);
  };

  const openUserEdit = (row: UserDto) => {
    setEditingUser(row);
    setUserForm({
      username: row.username,
      firstName: row.firstName,
      lastName: row.lastName,
      surname: row.surname,
      password: "",
      phoneNumber: row.phoneNumber,
      roleId: String(row.roleId),
      regionId: "",
      districtId: "",
      laboratoryId: row.laboratoryId != null && row.laboratoryId > 0 ? String(row.laboratoryId) : "",
    });
    setIsUserDialogOpen(true);
    void fetchUser(row.id)
      .then((u) => {
        setEditingUser(u);
        setUserForm({
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          surname: u.surname,
          password: "",
          phoneNumber: u.phoneNumber,
          roleId: String(u.roleId),
          regionId: "",
          districtId: "",
          laboratoryId: u.laboratoryId != null && u.laboratoryId > 0 ? String(u.laboratoryId) : "",
        });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Ma’lumot yuklanmadi"));
  };

  const handleSaveUser = async () => {
    const roleId = Number(userForm.roleId);
    if (!userForm.username.trim()) {
      toast.error("Login (username) kiriting");
      return;
    }
    if (!Number.isFinite(roleId) || roleId <= 0) {
      toast.error("Rolni tanlang");
      return;
    }
    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.id,
          username: userForm.username.trim(),
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          surname: userForm.surname.trim(),
          phoneNumber: userForm.phoneNumber.trim(),
          roleId,
          password: userForm.password.trim() || undefined,
        });
        toast.success("Foydalanuvchi yangilandi");
      } else {
        if (!userForm.password.trim()) {
          toast.error("Parol kiriting");
          return;
        }
        const regionId = Number(userForm.regionId);
        const districtId = Number(userForm.districtId);
        if (!Number.isFinite(regionId) || regionId <= 0) {
          toast.error("Viloyatni tanlang");
          return;
        }
        if (!Number.isFinite(districtId) || districtId <= 0) {
          toast.error("Tumanni tanlang");
          return;
        }
        if (isLaboratoryRoleId(roleId)) {
          const lid = Number(userForm.laboratoryId);
          if (!Number.isFinite(lid) || lid <= 0) {
            toast.error("Laboratoriyani tanlang");
            return;
          }
        }
        await createUser({
          username: userForm.username.trim(),
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          surname: userForm.surname.trim(),
          password: userForm.password,
          phoneNumber: userForm.phoneNumber.trim(),
          roleId,
          regionId,
          districtId,
          ...(isLaboratoryRoleId(roleId)
            ? { laboratoryId: Number(userForm.laboratoryId) }
            : {}),
        });
        toast.success("Foydalanuvchi yaratildi");
      }
      setIsUserDialogOpen(false);
      setEditingUser(null);
      setUserForm(emptyUserForm());
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const requestDeleteUser = (row: UserDto) => {
    setDeleteTarget({ type: "user", id: row.id, name: formatUserFullName(row) || row.username });
  };

  const requestToggleUserActive = (row: UserDto) => {
    setUserToggleTarget({
      id: row.id,
      name: formatUserFullName(row) || row.username,
      activate: row.active === false,
    });
  };

  const confirmToggleUserActive = async () => {
    if (!userToggleTarget) return;
    try {
      if (userToggleTarget.activate) {
        await activateUser(userToggleTarget.id);
        toast.success("Foydalanuvchi faollashtirildi");
      } else {
        await deactivateUser(userToggleTarget.id);
        toast.success("Foydalanuvchi deaktivatsiya qilindi");
      }
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Holatni o‘zgartirib bo‘lmadi");
    } finally {
      setUserToggleTarget(null);
    }
  };

  const openWorkplaceCreate = () => {
    setEditingWorkplace(null);
    setWorkplaceForm({ name: "", regionId: "", districtId: "" });
    setIsWorkplaceDialogOpen(true);
  };

  const openWorkplaceEdit = (row: WorkplaceDto) => {
    setEditingWorkplace(row);
    setWorkplaceForm({
      name: row.name,
      regionId: String(row.regionId),
      districtId: String(row.districtId),
    });
    setIsWorkplaceDialogOpen(true);
  };

  const handleSaveWorkplace = async () => {
    if (!workplaceForm.name.trim()) {
      toast.error("Nomni kiriting");
      return;
    }
    const rid = Number(workplaceForm.regionId);
    const did = Number(workplaceForm.districtId);
    if (!Number.isFinite(rid) || rid <= 0) {
      toast.error("Viloyatni tanlang");
      return;
    }
    if (!Number.isFinite(did) || did <= 0) {
      toast.error("Tumanni tanlang");
      return;
    }
    const body = { name: workplaceForm.name.trim(), regionId: rid, districtId: did };
    try {
      if (editingWorkplace) {
        await updateWorkplace(editingWorkplace.id, body);
        toast.success("Ish joyi yangilandi");
      } else {
        await createWorkplace(body);
        toast.success("Ish joyi qo‘shildi");
      }
      setIsWorkplaceDialogOpen(false);
      setEditingWorkplace(null);
      setWorkplaceForm({ name: "", regionId: "", districtId: "" });
      await loadWorkplaces();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const requestDeleteWorkplace = (row: WorkplaceDto) => {
    setDeleteTarget({ type: "workplace", id: row.id, name: row.name });
  };

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    const full = formatUserFullName(user).toLowerCase();
    return (
      user.username.toLowerCase().includes(q) ||
      full.includes(q) ||
      user.phoneNumber.toLowerCase().includes(q) ||
      (roleNameById.get(user.roleId) ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tizim boshqaruvi</h1>
          <p className="text-sm text-gray-600">Foydalanuvchilar, tahlil turlari va tizim sozlamalarini boshqarish</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Foydalanuvchilar
          </TabsTrigger>
          <TabsTrigger value="analyses">
            <TestTube className="h-4 w-4 mr-2" />
            Tahlil turlari
          </TabsTrigger>
          <TabsTrigger value="analyses-prices">
            <Banknote className="h-4 w-4 mr-2" />
            Tahlil narxlari
          </TabsTrigger>
          <TabsTrigger value="labs">
            <Building2 className="h-4 w-4 mr-2" />
            Laboratoriyalar
          </TabsTrigger>
          <TabsTrigger value="courses">
            <Banknote className="h-4 w-4 mr-2" />
            Kurslar
          </TabsTrigger>
          <TabsTrigger value="course-prices">
            <Banknote className="h-4 w-4 mr-2" />
            Kurs narxlari
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Briefcase className="h-4 w-4 mr-2" />
            Ish joylarini yaratish
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Foydalanuvchilarni boshqarish</CardTitle>
                  <CardDescription>Tizim foydalanuvchilarini yaratish, tahrirlash va boshqarish</CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={openUserCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Foydalanuvchi yaratish
                  </Button>
                  <Modal
                    open={isUserDialogOpen}
                    title={editingUser ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
                    onCancel={() => {
                      setIsUserDialogOpen(false);
                      setEditingUser(null);
                      setUserForm(emptyUserForm());
                    }}
                    footer={null}
                    width={560}
                    destroyOnClose
                    styles={{ body: { maxHeight: "min(90vh, 550px)", overflowY: "auto" } }}
                  >
                    <Typography.Paragraph type="secondary" className="!mb-4 !mt-0">
                      {editingUser ? "Ma’lumotlarni yangilang" : "Tizimga yangi foydalanuvchi qo‘shish"}
                    </Typography.Paragraph>
                    <Space direction="vertical" size="middle" className="w-full">
                      <div className="w-full">
                        <Typography.Text className="text-sm font-medium">Login (username)</Typography.Text>
                        <AntInput
                          className="mt-1"
                          autoComplete="username"
                          placeholder="Masalan: ivanov"
                          value={userForm.username}
                          disabled={Boolean(editingUser)}
                          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        />
                      </div>
                      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Typography.Text className="text-sm font-medium">Ism</Typography.Text>
                          <AntInput
                            className="mt-1"
                            value={userForm.firstName}
                            onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Typography.Text className="text-sm font-medium">Familiya</Typography.Text>
                          <AntInput
                            className="mt-1"
                            value={userForm.lastName}
                            onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="w-full">
                        <Typography.Text className="text-sm font-medium">Otasining ismi</Typography.Text>
                        <AntInput
                          className="mt-1"
                          value={userForm.surname}
                          onChange={(e) => setUserForm({ ...userForm, surname: e.target.value })}
                        />
                      </div>
                      <div className="w-full">
                        <Typography.Text className="text-sm font-medium">Telefon</Typography.Text>
                        <AntInput
                          className="mt-1"
                          type="tel"
                          placeholder="+998..."
                          value={userForm.phoneNumber}
                          onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                        />
                      </div>
                      <div className="w-full">
                        <Typography.Text className="text-sm font-medium">Rol</Typography.Text>
                        <AntSelect
                          className="mt-1 w-full"
                          placeholder={loadingRoles ? "Yuklanmoqda..." : "Rolni tanlang"}
                          value={userForm.roleId || undefined}
                          onChange={(v) =>
                            setUserForm({ ...userForm, roleId: v != null ? String(v) : "", laboratoryId: "" })
                          }
                          disabled={loadingRoles}
                          loading={loadingRoles}
                          options={roles.map((r) => ({
                            value: String(r.id),
                            label: roleReferenceLabel(r),
                          }))}
                          showSearch
                          optionFilterProp="label"
                          allowClear
                        />
                        {roles.length === 0 && !loadingRoles && (
                          <Typography.Text type="secondary" className="text-xs">
                            Rollar ro‘yxati bo‘sh (GET /roles).
                          </Typography.Text>
                        )}
                      </div>
                      {!editingUser && isLaboratoryRoleSelected && (
                        <div className="w-full">
                          <Typography.Text className="text-sm font-medium">Laboratoriya</Typography.Text>
                          <AntSelect
                            className="mt-1 w-full"
                            placeholder={loadingLabs ? "Yuklanmoqda..." : "Laboratoriyani tanlang"}
                            value={userForm.laboratoryId || undefined}
                            onChange={(v) =>
                              setUserForm({ ...userForm, laboratoryId: v != null ? String(v) : "" })
                            }
                            disabled={loadingLabs}
                            loading={loadingLabs}
                            options={laboratoriesSorted.map((lab) => ({
                              value: String(lab.id),
                              label: lab.nameUz?.trim() || `Laboratoriya #${lab.id}`,
                            }))}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                          />
                          {laboratoriesSorted.length === 0 && !loadingLabs && (
                            <Typography.Text type="secondary" className="text-xs">
                              Laboratoriyalar ro‘yxati bo‘sh.
                            </Typography.Text>
                          )}
                        </div>
                      )}
                      {!editingUser && (
                        <>
                          <div className="w-full">
                            <Typography.Text className="text-sm font-medium">Viloyat</Typography.Text>
                            <AntSelect
                              className="mt-1 w-full"
                              placeholder={loadingRefGeo ? "Yuklanmoqda..." : "Viloyatni tanlang"}
                              value={userForm.regionId || undefined}
                              onChange={(v) =>
                                setUserForm({
                                  ...userForm,
                                  regionId: v != null ? String(v) : "",
                                  districtId: "",
                                })
                              }
                              disabled={loadingRefGeo}
                              loading={loadingRefGeo}
                              options={regions.map((r) => ({
                                value: String(r.id),
                                label: referenceLatLabel(r),
                              }))}
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            />
                          </div>
                          <div className="w-full">
                            <Typography.Text className="text-sm font-medium">Tuman</Typography.Text>
                            <AntSelect
                              className="mt-1 w-full"
                              placeholder={
                                !userForm.regionId
                                  ? "Avval viloyatni tanlang"
                                  : loadingUserDistricts
                                    ? "Yuklanmoqda..."
                                    : "Tumanni tanlang"
                              }
                              value={userForm.districtId || undefined}
                              onChange={(v) =>
                                setUserForm({ ...userForm, districtId: v != null ? String(v) : "" })
                              }
                              disabled={loadingUserDistricts || !userForm.regionId}
                              loading={loadingUserDistricts}
                              options={userDistricts.map((d) => ({
                                value: String(d.id),
                                label: referenceLatLabel(d),
                              }))}
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            />
                          </div>
                        </>
                      )}
                      <div className="w-full">
                        <Typography.Text className="text-sm font-medium">
                          {editingUser ? "Yangi parol (ixtiyoriy)" : "Parol"}
                        </Typography.Text>
                        <AntInput.Password
                          className="mt-1"
                          autoComplete="new-password"
                          placeholder={
                            editingUser ? "Bo‘sh qoldiring, agar o‘zgartirmasangiz" : "Parolni kiriting"
                          }
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        />
                      </div>
                      <AntdButton type="primary" block onClick={() => void handleSaveUser()}>
                        {editingUser ? "Saqlash" : "Foydalanuvchi yaratish"}
                      </AntdButton>
                    </Space>
                  </Modal>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Foydalanuvchilarni qidirish..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>F.I.Sh.</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Foydalanuvchilar yo‘q
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, idx) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium tabular-nums">{userPage * userPageSize + idx + 1}</TableCell>
                        <TableCell>{formatUserFullName(user)}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.phoneNumber || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{roleNameById.get(user.roleId) ?? `ID ${user.roleId}`}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.active === false
                                ? "bg-gray-100 text-gray-700"
                                : "bg-green-100 text-green-700"
                            }
                          >
                            {user.active === false ? "Nofaol" : "Faol"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openUserEdit(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => requestToggleUserActive(user)}
                            >
                              {user.active === false ? "Faollashtirish" : "Deaktivatsiya"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => requestDeleteUser(user)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Jami: {userTotalElements} ta</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={String(userPageSize)}
                    onValueChange={(v) => {
                      setUserPageSize(Number(v));
                      setUserPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
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
                      disabled={userPage <= 0 || loadingUsers}
                      onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                      aria-label="Oldingi sahifa"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm tabular-nums px-2">
                      {userPage + 1} / {userTotalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={loadingUsers || userPage >= userTotalPages - 1}
                      onClick={() => setUserPage((p) => p + 1)}
                      aria-label="Keyingi sahifa"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Types Tab — API */}
        <TabsContent value="analyses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tahlil turlarini boshqarish</CardTitle>
                  <CardDescription>Serverdagi tahlil turlari (nom va laboratoriya)</CardDescription>
                </div>
                <Dialog
                  open={isAnalysisDialogOpen}
                  onOpenChange={(open) => {
                    setIsAnalysisDialogOpen(open);
                    if (!open) setEditingAnalysis(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAnalysisCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tahlil turi qo‘shish
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingAnalysis ? "Tahlil turini tahrirlash" : "Tahlil turi qo‘shish"}</DialogTitle>
                      <DialogDescription>
                        {editingAnalysis ? "Ma’lumotlarni yangilang" : "Yangi tahlil turini yaratish"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="analysisNameUz">Nomi (o‘zbekcha)</Label>
                        <Input
                          id="analysisNameUz"
                          placeholder="Masalan: Umumiy qon tahlili"
                          value={analysisForm.nameUz}
                          onChange={(e) => setAnalysisForm({ ...analysisForm, nameUz: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="analysisNameRu">Nomi (ruscha)</Label>
                        <Input
                          id="analysisNameRu"
                          placeholder="Общий анализ крови"
                          value={analysisForm.nameRu}
                          onChange={(e) => setAnalysisForm({ ...analysisForm, nameRu: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Laboratoriya</Label>
                        <Select
                          value={analysisForm.laboratoryId}
                          onValueChange={(v) => setAnalysisForm({ ...analysisForm, laboratoryId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Laboratoriyani tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            {laboratories.map((lab) => (
                              <SelectItem key={lab.id} value={String(lab.id)}>
                                {lab.nameUz}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {laboratories.length === 0 && (
                          <p className="text-xs text-muted-foreground">Avval «Laboratoriyalar» bo‘limida laboratoriya qo‘shing.</p>
                        )}
                      </div>
                      <Button onClick={() => void handleSaveAnalysis()} className="w-full bg-blue-600 hover:bg-blue-700">
                        {editingAnalysis ? "Saqlash" : "Tahlil turini qo‘shish"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Nomi (UZ)</TableHead>
                    <TableHead>Nomi (RU)</TableHead>
                    <TableHead>Laboratoriya</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAnalyses ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : analyses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Tahlil turlari yo‘q
                      </TableCell>
                    </TableRow>
                  ) : (
                    analyses.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{row.nameUz}</TableCell>
                        <TableCell>{row.nameRu}</TableCell>
                        <TableCell>{labNameById.get(row.laboratoryId) ?? `ID ${row.laboratoryId}`}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openAnalysisEdit(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => requestDeleteAnalysis(row)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tahlil narxlari — API */}
        <TabsContent value="analyses-prices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tahlil narxlari</CardTitle>
                  <CardDescription>Tahlil turi, viloyat va tuman bo‘yicha narxlar</CardDescription>
                </div>
                <Dialog
                  open={isPriceDialogOpen}
                  onOpenChange={(open) => {
                    setIsPriceDialogOpen(open);
                    if (!open) setEditingPrice(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={openPriceCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Narx qo‘shish
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingPrice ? "Narxni tahrirlash" : "Narx qo‘shish"}</DialogTitle>
                      <DialogDescription>
                        {editingPrice ? "Qiymatlarni yangilang" : "Tahlil, narx va hududni tanlang"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tahlil turi</Label>
                        <Select
                          value={priceForm.analysisId}
                          onValueChange={(v) => setPriceForm({ ...priceForm, analysisId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tahlilni tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            {analyses.map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {a.nameUz}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {analyses.length === 0 && (
                          <p className="text-xs text-muted-foreground">Avval «Tahlil turlari» bo‘limida tahlil qo‘shing.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priceAmount">Narx (so‘m)</Label>
                        <Input
                          id="priceAmount"
                          type="number"
                          min={0}
                          step={1}
                          placeholder="Masalan: 50000"
                          value={priceForm.price}
                          onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Viloyat</Label>
                        <Select
                          value={priceForm.regionId}
                          onValueChange={(v) => setPriceForm({ ...priceForm, regionId: v, districtId: "" })}
                          disabled={loadingRefGeo}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingRefGeo ? "Yuklanmoqda..." : "Viloyatni tanlang"} />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {referenceLabel(r)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tuman</Label>
                        <Select
                          value={priceForm.districtId}
                          onValueChange={(v) => setPriceForm({ ...priceForm, districtId: v })}
                          disabled={loadingDistricts || !priceForm.regionId}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !priceForm.regionId
                                  ? "Avval viloyatni tanlang"
                                  : loadingDistricts
                                    ? "Yuklanmoqda..."
                                    : "Tumanni tanlang"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map((d) => (
                              <SelectItem key={d.id} value={String(d.id)}>
                                {referenceLabel(d)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {priceForm.regionId && districts.length === 0 && !loadingDistricts && (
                          <p className="text-xs text-muted-foreground">
                            Bu viloyat uchun tumanlar topilmadi yoki ro‘yxat bo‘sh.
                          </p>
                        )}
                      </div>
                      <Button onClick={() => void handleSavePrice()} className="w-full bg-blue-600 hover:bg-blue-700">
                        {editingPrice ? "Saqlash" : "Narx qo‘shish"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Tahlil</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Viloyat</TableHead>
                    <TableHead>Tuman</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPrices ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : analysisPrices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Narx yozuvlari yo‘q
                      </TableCell>
                    </TableRow>
                  ) : (
                    analysisPrices.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{analysisNameById.get(row.analysisId) ?? `ID ${row.analysisId}`}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("uz-UZ").format(row.price)} so‘m
                        </TableCell>
                        <TableCell>{regionNameById.get(row.regionId) ?? row.regionId}</TableCell>
                        <TableCell>{districtLabelsById[row.districtId] ?? row.districtId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openPriceEdit(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => requestDeletePrice(row)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kurslar — API */}
        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kurslar</CardTitle>
                  <CardDescription>Tizimdagi barcha kurslar ro‘yxati</CardDescription>
                </div>
                <Dialog
                  open={isCourseDialogOpen}
                  onOpenChange={(open) => {
                    setIsCourseDialogOpen(open);
                    if (!open) {
                      setEditingCourse(null);
                      setCourseForm({ name: "", isActive: true });
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCourseCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Kurs qo‘shish
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingCourse ? "Kursni tahrirlash" : "Yangi kurs"}</DialogTitle>
                      <DialogDescription>
                        {editingCourse ? "Ma’lumotlarni yangilang" : "Kurs nomi va holatini kiriting"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="courseName">Kurs nomi</Label>
                        <Input
                          id="courseName"
                          value={courseForm.name}
                          onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Holati</Label>
                        <Select
                          value={courseForm.isActive ? "active" : "inactive"}
                          onValueChange={(v) =>
                            setCourseForm({ ...courseForm, isActive: v === "active" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Holatni tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Faol</SelectItem>
                            <SelectItem value="inactive">Nofaol</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => void handleSaveCourse()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {editingCourse ? "Saqlash" : "Kursni qo‘shish"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCourses ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : courses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Kurslar yo‘q
                      </TableCell>
                    </TableRow>
                  ) : (
                    courses.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }
                          >
                            {row.isActive ? "Faol" : "Nofaol"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openCourseEdit(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kurs narxlari — API */}
        <TabsContent value="course-prices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kurs narxlari</CardTitle>
                  <CardDescription>Kurs, viloyat va tuman bo‘yicha narxlar</CardDescription>
                </div>
                <Dialog
                  open={isCoursePriceDialogOpen}
                  onOpenChange={(open) => {
                    setIsCoursePriceDialogOpen(open);
                    if (!open) {
                      setEditingCoursePrice(null);
                      setCoursePriceForm({
                        courseId: "",
                        price: "",
                        regionId: "",
                        districtId: "",
                      });
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCoursePriceCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Narx qo‘shish
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCoursePrice ? "Kurs narxini tahrirlash" : "Kurs narxi qo‘shish"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCoursePrice
                          ? "Qiymatlarni yangilang"
                          : "Kurs, narx va hududni tanlang"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Kurs</Label>
                        <Select
                          value={coursePriceForm.courseId}
                          onValueChange={(v) =>
                            setCoursePriceForm({ ...coursePriceForm, courseId: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Kursni tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {courses.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Avval «Kurslar» bo‘limida kurs qo‘shing.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coursePriceAmount">Narx (so‘m)</Label>
                        <Input
                          id="coursePriceAmount"
                          type="number"
                          min={0}
                          step={1}
                          placeholder="Masalan: 500000"
                          value={coursePriceForm.price}
                          onChange={(e) =>
                            setCoursePriceForm({ ...coursePriceForm, price: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Viloyat</Label>
                        <Select
                          value={coursePriceForm.regionId}
                          onValueChange={(v) =>
                            setCoursePriceForm({
                              ...coursePriceForm,
                              regionId: v,
                              districtId: "",
                            })
                          }
                          disabled={loadingRefGeo}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={loadingRefGeo ? "Yuklanmoqda..." : "Viloyatni tanlang"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {referenceLabel(r)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tuman</Label>
                        <Select
                          value={coursePriceForm.districtId}
                          onValueChange={(v) =>
                            setCoursePriceForm({ ...coursePriceForm, districtId: v })
                          }
                          disabled={loadingCoursePriceDistricts || !coursePriceForm.regionId}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !coursePriceForm.regionId
                                  ? "Avval viloyatni tanlang"
                                  : loadingCoursePriceDistricts
                                    ? "Yuklanmoqda..."
                                    : "Tumanni tanlang"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {coursePriceDistricts.map((d) => (
                              <SelectItem key={d.id} value={String(d.id)}>
                                {referenceLabel(d)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {coursePriceForm.regionId &&
                          coursePriceDistricts.length === 0 &&
                          !loadingCoursePriceDistricts && (
                            <p className="text-xs text-muted-foreground">
                              Bu viloyat uchun tumanlar topilmadi yoki ro‘yxat bo‘sh.
                            </p>
                          )}
                      </div>
                      <Button
                        onClick={() => void handleSaveCoursePrice()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {editingCoursePrice ? "Saqlash" : "Narx qo‘shish"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-start">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="space-y-1">
                    <Label>Viloyat bo‘yicha filter</Label>
                    <Select
                      value={coursePriceFilterRegionId}
                      onValueChange={(v) => {
                        setCoursePriceFilterRegionId(v === "__all" ? "" : v);
                        setCoursePriceFilterDistrictId("");
                        setCoursePricePage(0);
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Barchasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Barchasi</SelectItem>
                        {regions.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {referenceLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tuman bo‘yicha filter</Label>
                    <Select
                      value={coursePriceFilterDistrictId}
                      onValueChange={(v) => {
                        setCoursePriceFilterDistrictId(v === "__all" ? "" : v);
                        setCoursePricePage(0);
                      }}
                      disabled={loadingCoursePriceFilterDistricts || !coursePriceFilterRegionId}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue
                          placeholder={
                            !coursePriceFilterRegionId
                              ? "Avval viloyatni tanlang"
                              : loadingCoursePriceFilterDistricts
                                ? "Yuklanmoqda..."
                                : "Barchasi"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Barchasi</SelectItem>
                        {coursePriceFilterDistricts.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {referenceLabel(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Kurs</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Viloyat</TableHead>
                    <TableHead>Tuman</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCoursePrices ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : coursePrices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Kurs narxlari yo‘q
                      </TableCell>
                    </TableRow>
                  ) : (
                    coursePrices.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium tabular-nums">
                          {coursePricePage * coursePriceSize + idx + 1}
                        </TableCell>
                        <TableCell>{row.courseName ?? `ID ${row.courseId}`}</TableCell>
                        <TableCell>{new Intl.NumberFormat("uz-UZ").format(row.price)} so‘m</TableCell>
                        <TableCell>{row.regionNameUz ?? row.regionId}</TableCell>
                        <TableCell>{row.districtNameUz ?? row.districtId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openCoursePriceEdit(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Select
                    value={String(coursePriceSize)}
                    onValueChange={(v) => {
                      setCoursePriceSize(Number(v));
                      setCoursePricePage(0);
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
                  <p className="text-sm text-muted-foreground">Jami: {coursePriceTotalElements} ta</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={coursePricePage <= 0 || loadingCoursePrices}
                    onClick={() => setCoursePricePage((p) => Math.max(0, p - 1))}
                    aria-label="Oldingi sahifa"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm tabular-nums px-2">
                    {coursePricePage + 1} / {coursePriceTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={loadingCoursePrices || coursePricePage >= coursePriceTotalPages - 1}
                    onClick={() => setCoursePricePage((p) => p + 1)}
                    aria-label="Keyingi sahifa"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Laboratories Tab — API */}
        <TabsContent value="labs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Laboratoriyalarni boshqarish</CardTitle>
                  <CardDescription>Serverdagi laboratoriyalar (o‘zbek va rus nomlari)</CardDescription>
                </div>
                <Dialog
                  open={isLabDialogOpen}
                  onOpenChange={(open) => {
                    setIsLabDialogOpen(open);
                    if (!open) setEditingLab(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={openLabCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Laboratoriya qo‘shish
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingLab ? "Laboratoriyani tahrirlash" : "Laboratoriya qo‘shish"}</DialogTitle>
                      <DialogDescription>
                        {editingLab ? "Nomlarni yangilang" : "Yangi laboratoriya yozuvi"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="labNameUz">Nomi (o‘zbekcha)</Label>
                        <Input
                          id="labNameUz"
                          placeholder="Masalan: Markaziy laboratoriya"
                          value={labForm.nameUz}
                          onChange={(e) => setLabForm({ ...labForm, nameUz: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="labNameRu">Nomi (ruscha)</Label>
                        <Input
                          id="labNameRu"
                          placeholder="Центральная лаборатория"
                          value={labForm.nameRu}
                          onChange={(e) => setLabForm({ ...labForm, nameRu: e.target.value })}
                        />
                      </div>
                      <Button onClick={() => void handleSaveLab()} className="w-full bg-blue-600 hover:bg-blue-700">
                        {editingLab ? "Saqlash" : "Laboratoriya qo‘shish"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Nomi (UZ)</TableHead>
                    <TableHead>Nomi (RU)</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLabs ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : laboratories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Laboratoriyalar yo‘q
                      </TableCell>
                    </TableRow>
                  ) : (
                    laboratories.map((lab, idx) => (
                      <TableRow key={lab.id}>
                        <TableCell className="font-medium tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{lab.nameUz}</TableCell>
                        <TableCell>{lab.nameRu}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openLabEdit(lab)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => requestDeleteLab(lab)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ish joylari — API */}
        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ish joylari</CardTitle>
                  <CardDescription>Nom, viloyat va tuman bo‘yicha ish joylari</CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={openWorkplaceCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ish joyi qo‘shish
                  </Button>
                  <Dialog
                    open={isWorkplaceDialogOpen}
                    onOpenChange={(open) => {
                      setIsWorkplaceDialogOpen(open);
                      if (!open) {
                        setEditingWorkplace(null);
                        setWorkplaceForm({ name: "", regionId: "", districtId: "" });
                      }
                    }}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingWorkplace ? "Ish joyini tahrirlash" : "Yangi ish joyi"}</DialogTitle>
                        <DialogDescription>
                          {editingWorkplace ? "Ma’lumotlarni yangilang" : "Nom va hududni kiriting"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="wpName">Ish joyi nomi</Label>
                          <Input
                            id="wpName"
                            placeholder="Masalan: Markaziy filial"
                            value={workplaceForm.name}
                            onChange={(e) => setWorkplaceForm({ ...workplaceForm, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Viloyat</Label>
                          <Select
                            value={workplaceForm.regionId}
                            onValueChange={(v) => setWorkplaceForm({ ...workplaceForm, regionId: v, districtId: "" })}
                            disabled={loadingRefGeo}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingRefGeo ? "Yuklanmoqda..." : "Viloyatni tanlang"} />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  {referenceNameLatLabel(r)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tuman</Label>
                          <Select
                            value={workplaceForm.districtId}
                            onValueChange={(v) => setWorkplaceForm({ ...workplaceForm, districtId: v })}
                            disabled={loadingWorkplaceDistricts || !workplaceForm.regionId}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !workplaceForm.regionId
                                    ? "Avval viloyatni tanlang"
                                    : loadingWorkplaceDistricts
                                      ? "Yuklanmoqda..."
                                      : "Tumanni tanlang"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {workplaceDistricts.map((d) => (
                                <SelectItem key={d.id} value={String(d.id)}>
                                  {referenceNameLatLabel(d)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={() => void handleSaveWorkplace()} className="w-full bg-blue-600 hover:bg-blue-700">
                          {editingWorkplace ? "Saqlash" : "Qo‘shish"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Viloyat</TableHead>
                    <TableHead>Tuman</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingWorkplaces ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : workplaces.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Ish joylari yo‘q
                      </TableCell>
                    </TableRow>
                  ) : (
                    workplaces.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{regionLatNameById.get(row.regionId) ?? row.regionId}</TableCell>
                        <TableCell>{workplaceDistrictLabels[row.districtId] ?? row.districtId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openWorkplaceEdit(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => requestDeleteWorkplace(row)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={userToggleTarget !== null} onOpenChange={(open) => !open && setUserToggleTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToggleTarget?.activate ? "Faollashtirishni tasdiqlaysizmi?" : "Deaktivatsiyani tasdiqlaysizmi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">«{userToggleTarget?.name}»</span>{" "}
              foydalanuvchisini {userToggleTarget?.activate ? "faol" : "nofaol"} holatga o‘tkazmoqchimisiz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
              onClick={(e) => {
                e.preventDefault();
                void confirmToggleUserActive();
              }}
            >
              Ha, tasdiqlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>O‘chirishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "lab" ? (
                <>
                  <span className="font-medium text-foreground">«{deleteTarget.name}»</span> laboratoriyasi butunlay
                  o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
                </>
              ) : deleteTarget?.type === "analysis" ? (
                <>
                  <span className="font-medium text-foreground">«{deleteTarget.name}»</span> tahlil turi butunlay
                  o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
                </>
              ) : deleteTarget?.type === "analysisPrice" ? (
                <>
                  Quyidagi narx yozuvi o‘chiriladi:{" "}
                  <span className="font-medium text-foreground">{deleteTarget.label}</span>. Bu amalni qaytarib bo‘lmaydi.
                </>
              ) : deleteTarget?.type === "user" ? (
                <>
                  <span className="font-medium text-foreground">«{deleteTarget.name}»</span> foydalanuvchisi butunlay
                  o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
                </>
              ) : deleteTarget?.type === "workplace" ? (
                <>
                  <span className="font-medium text-foreground">«{deleteTarget.name}»</span> ish joyi butunlay
                  o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Ha, o‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
