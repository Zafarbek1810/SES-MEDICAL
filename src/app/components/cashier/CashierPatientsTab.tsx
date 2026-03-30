import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
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
import { formatTableDate } from "../../../utils/tableDateFormat";
import type { ReferenceItem } from "../../../services/referenceDataApi";
import { fetchRegions, fetchDistricts, fetchVillages } from "../../../services/referenceDataApi";
import { fetchWorkplaces, fetchWorkplacesAdmin, type WorkplaceDto } from "../../../services/workplacesApi";
import { fetchDepartments, type DepartmentDto } from "../../../services/departmentsApi";
import {
  createPatient,
  deletePatient,
  fetchPatient,
  fetchPatients,
  updatePatient,
  type PatientDto,
  type SavePatientBody,
} from "../../../services/patientsApi";

function referenceLabel(item: ReferenceItem): string {
  return item.nameUz?.trim() || item.name?.trim() || item.nameRu?.trim() || `#${item.id}`;
}

/** AdminPanel bilan bir xil — selectlarda lotincha nom (nameLat) */
function referenceNameLatLabel(item: ReferenceItem): string {
  const o = item as Record<string, unknown>;
  const nameLat =
    (typeof o.nameLat === "string" ? o.nameLat : undefined) ??
    (typeof o.name_lat === "string" ? o.name_lat : undefined);
  return nameLat?.trim() || referenceLabel(item);
}

type PatientFormState = {
  firstName: string;
  lastName: string;
  regionId: string;
  districtId: string;
  villageId: string;
  workplaceId: string;
  departmentId: string;
  birthDay: string;
  phoneNumber: string;
  address: string;
  privilege: string;
  comment: string;
  isSendSms: boolean;
};

function emptyForm(): PatientFormState {
  return {
    firstName: "",
    lastName: "",
    regionId: "",
    districtId: "",
    villageId: "",
    workplaceId: "",
    departmentId: "0",
    birthDay: "",
    phoneNumber: "",
    address: "",
    privilege: "0",
    comment: "",
    isSendSms: true,
  };
}

function patientToForm(p: PatientDto): PatientFormState {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    regionId: String(p.regionId),
    districtId: String(p.districtId),
    villageId: String(p.villageId),
    workplaceId: String(p.workplaceId),
    departmentId: String(p.departmentId),
    birthDay: p.birthDay,
    phoneNumber: p.phoneNumber,
    address: p.address,
    privilege: String(p.privilege),
    comment: p.comment,
    isSendSms: p.isSendSms,
  };
}

function formToBody(f: PatientFormState): SavePatientBody | null {
  if (!f.firstName.trim() || !f.lastName.trim()) {
    toast.error("Ism va familiya majburiy");
    return null;
  }
  const regionId = Number(f.regionId);
  const districtId = Number(f.districtId);
  const villageId = Number(f.villageId);
  const workplaceId = Number(f.workplaceId);
  const departmentId = Number(f.departmentId);
  const privilege = Number(f.privilege);
  if (!Number.isFinite(regionId) || regionId <= 0) {
    toast.error("Viloyatni tanlang");
    return null;
  }
  if (!Number.isFinite(districtId) || districtId <= 0) {
    toast.error("Tumanni tanlang");
    return null;
  }
  if (!Number.isFinite(villageId) || villageId < 0) {
    toast.error("Mahalla / qishloq noto‘g‘ri");
    return null;
  }
  if (!Number.isFinite(workplaceId) || workplaceId < 0) {
    toast.error("Ish joyi noto‘g‘ri");
    return null;
  }
  if (!Number.isFinite(departmentId) || departmentId < 0) {
    toast.error("Bo‘lim ID noto‘g‘ri");
    return null;
  }
  if (!f.birthDay.trim()) {
    toast.error("Tug‘ilgan sanani kiriting");
    return null;
  }
  if (!Number.isFinite(privilege) || privilege < 0) {
    toast.error("Imtiyoz qiymati noto‘g‘ri");
    return null;
  }
  return {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    regionId,
    districtId,
    villageId,
    workplaceId,
    departmentId,
    birthDay: f.birthDay.trim(),
    phoneNumber: f.phoneNumber.trim(),
    address: f.address.trim(),
    privilege,
    comment: f.comment.trim(),
    isSendSms: f.isSendSms,
  };
}

export default function CashierPatientsTab() {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [districts, setDistricts] = useState<ReferenceItem[]>([]);
  const [villages, setVillages] = useState<ReferenceItem[]>([]);
  const [workplaces, setWorkplaces] = useState<WorkplaceDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PatientDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const villageSelectIds = useMemo(() => new Set(villages.map((v) => v.id)), [villages]);
  const orphanVillageId = Number(form.villageId);
  const showOrphanVillage =
    Number.isFinite(orphanVillageId) && orphanVillageId > 0 && !villageSelectIds.has(orphanVillageId);

  const workplaceSelectIds = useMemo(() => new Set(workplaces.map((w) => w.id)), [workplaces]);
  const orphanWorkplaceId = Number(form.workplaceId);
  const showOrphanWorkplace =
    Number.isFinite(orphanWorkplaceId) && orphanWorkplaceId > 0 && !workplaceSelectIds.has(orphanWorkplaceId);

  const departmentSelectIds = useMemo(() => new Set(departments.map((d) => d.id)), [departments]);
  const orphanDepartmentId = Number(form.departmentId);
  const showOrphanDepartment =
    Number.isFinite(orphanDepartmentId) &&
    orphanDepartmentId > 0 &&
    !departmentSelectIds.has(orphanDepartmentId);

  useEffect(() => {
    let cancelled = false;
    setLoadingRef(true);
    Promise.all([
      fetchRegions(),
      fetchWorkplacesAdmin().catch(() => fetchWorkplaces()),
      fetchDepartments(),
    ])
      .then(([r, w, d]) => {
        if (!cancelled) {
          setRegions(r);
          setWorkplaces(w);
          setDepartments(d);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Ma’lumotlar yuklanmadi"))
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
    const did = Number(form.districtId);
    if (!Number.isFinite(did) || did <= 0) {
      setVillages([]);
      return;
    }
    let cancelled = false;
    setLoadingVillages(true);
    fetchVillages(did)
      .then((rows) => {
        if (!cancelled) setVillages(rows);
      })
      .catch(() => {
        if (!cancelled) setVillages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVillages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.districtId]);

  const loadPatients = useCallback(async () => {
    setLoadingList(true);
    try {
      const p = await fetchPatients(page, pageSize);
      setPatients(p.items);
      setTotalPages(Math.max(1, p.totalPages));
      setTotalElements(p.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bemorlar yuklanmadi");
      setPatients([]);
    } finally {
      setLoadingList(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const workplaceName = (id: number) => {
    if (id <= 0) return "—";
    const hit = workplaces.find((w) => w.id === id);
    return hit?.name ?? `Ish joyi #${id}`;
  };

  const departmentName = (id: number) => {
    if (id <= 0) return "—";
    return departments.find((d) => d.id === id)?.name ?? `#${id}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (row: PatientDto) => {
    setEditingId(row.id);
    setDialogOpen(true);
    try {
      const full = await fetchPatient(row.id);
      setForm(patientToForm(full));
    } catch {
      setForm(patientToForm(row));
    }
  };

  const handleSave = async () => {
    const body = formToBody(form);
    if (!body) return;
    setSaving(true);
    try {
      if (editingId != null) {
        await updatePatient(editingId, body);
        toast.success("Bemor yangilandi");
      } else {
        await createPatient(body);
        toast.success("Bemor yaratildi");
      }
      setDialogOpen(false);
      setEditingId(null);
      await loadPatients();
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
      await deletePatient(deleteTarget.id);
      toast.success("Bemor o‘chirildi");
      setDeleteTarget(null);
      await loadPatients();
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
            <CardTitle>Bemorlar</CardTitle>
            {/* <CardDescription>POST/GET/PUT/DELETE patients — sahifalangan ro‘yxat.</CardDescription> */}
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 shrink-0" onClick={openCreate} disabled={loadingRef}>
            <Plus className="h-4 w-4 mr-2" />
            Bemor qo‘shish
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">№</TableHead>
                <TableHead>Ism</TableHead>
                <TableHead>Familiya</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Tug‘ilgan sana</TableHead>
                <TableHead>Ish joyi</TableHead>
                <TableHead>Bo‘lim</TableHead>
                <TableHead className="text-right w-[120px]">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Yuklanmoqda…
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Bemorlar yo‘q
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm tabular-nums">{page * pageSize + idx + 1}</TableCell>
                    <TableCell className="text-sm">{p.firstName || "—"}</TableCell>
                    <TableCell className="text-sm">{p.lastName || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{p.phoneNumber || "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">{p.birthDay ? formatTableDate(p.birthDay) : "—"}</TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate" title={workplaceName(p.workplaceId)}>
                      {workplaceName(p.workplaceId)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate" title={departmentName(p.departmentId)}>
                      {departmentName(p.departmentId)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" type="button" onClick={() => void openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Jami: {totalElements} ta</p>
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
                disabled={page <= 0 || loadingList}
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
                disabled={loadingList || page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Keyingi sahifa"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingId(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId != null ? "Bemorni tahrirlash" : "Yangi bemor"}</DialogTitle>
              <DialogDescription>Barcha maydonlar server talabiga mos yuboriladi.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pt-fn">Ism</Label>
                  <Input
                    id="pt-fn"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pt-ln">Familiya</Label>
                  <Input
                    id="pt-ln"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Viloyat</Label>
                  <Select
                    value={form.regionId}
                    onValueChange={(v) => setForm({ ...form, regionId: v, districtId: "", villageId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingRef ? "…" : "Tanlang"} />
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
                    value={form.districtId}
                    onValueChange={(v) => setForm({ ...form, districtId: v, villageId: "" })}
                    disabled={!form.regionId || loadingDistricts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingDistricts ? "…" : "Tanlang"} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {referenceNameLatLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mahalla / qishloq</Label>
                  <Select
                    value={form.villageId}
                    onValueChange={(v) => setForm({ ...form, villageId: v })}
                    disabled={!form.districtId || loadingVillages}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingVillages ? "…" : "Tanlang"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tanlanmagan (0)</SelectItem>
                      {showOrphanVillage && (
                        <SelectItem value={form.villageId}>ID {form.villageId}</SelectItem>
                      )}
                      {villages.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {referenceNameLatLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ish joyi</Label>
                  <Select value={form.workplaceId} onValueChange={(v) => setForm({ ...form, workplaceId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tanlanmagan (0)</SelectItem>
                      {showOrphanWorkplace && (
                        <SelectItem value={form.workplaceId}>Ish joyi #{form.workplaceId}</SelectItem>
                      )}
                      {workplaces.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bo‘lim</Label>
                  <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingRef ? "…" : "Tanlang"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tanlanmagan (0)</SelectItem>
                      {showOrphanDepartment && (
                        <SelectItem value={form.departmentId}>Bo‘lim #{form.departmentId}</SelectItem>
                      )}
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pt-bd">Tug‘ilgan sana</Label>
                  <DatePicker
                    id="pt-bd"
                    className="w-full"
                    size="middle"
                    placeholder="Sanani tanlang"
                    format="YYYY-MM-DD"
                    value={form.birthDay ? dayjs(form.birthDay, "YYYY-MM-DD") : null}
                    style={{padding:'5px 10px'}}
                    onChange={(date) =>
                      setForm((prev) => ({
                        ...prev,
                        birthDay: date ? date.format("YYYY-MM-DD") : "",
                      }))
                    }
                    allowClear
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pt-phone">Telefon</Label>
                <Input
                  id="pt-phone"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pt-addr">Manzil</Label>
                <Input
                  id="pt-addr"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* <div className="space-y-2">
                  <Label htmlFor="pt-priv">Imtiyoz (privilege)</Label>
                  <Input
                    id="pt-priv"
                    type="number"
                    min={0}
                    value={form.privilege}
                    onChange={(e) => setForm({ ...form, privilege: e.target.value })}
                  />
                </div> */}
                <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="pt-sms">SMS yuborish</Label>
                    <p className="text-xs text-muted-foreground">isSendSms</p>
                  </div>
                  <Switch
                    id="pt-sms"
                    checked={form.isSendSms}
                    onCheckedChange={(checked) => setForm({ ...form, isSendSms: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pt-comment">Izoh</Label>
                <Textarea
                  id="pt-comment"
                  rows={3}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                />
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
              <AlertDialogTitle>Bemorni o‘chirish</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `${deleteTarget.firstName} ${deleteTarget.lastName} (#${deleteTarget.id}) o‘chiriladi.`
                  : ""}
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
