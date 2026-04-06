import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DatePicker,
  Modal,
  Input,
  Select as AntSelect,
  Button as AntButton,
  Typography,
  Space,
} from "antd";
import dayjs from "dayjs";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
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
import { formatTableDateTime } from "../../../utils/tableDateFormat";
import type { ReferenceItem } from "../../../services/referenceDataApi";
import { fetchDistricts, fetchRegions } from "../../../services/referenceDataApi";
import { enumLabel, enumEntryDisplayLabel, getEnums, type EnumsData } from "../../../services/enumsApi";
import {
  createSample,
  deleteSample,
  fetchSample,
  fetchSamples,
  updateSample,
  type SampleDto,
  type SaveSampleBody,
} from "../../../services/samplesApi";

function referenceLabel(item: ReferenceItem): string {
  return item.nameUz?.trim() || item.name?.trim() || item.nameRu?.trim() || `#${item.id}`;
}

function referenceNameLatLabel(item: ReferenceItem): string {
  const o = item as Record<string, unknown>;
  const nameLat =
    (typeof o.nameLat === "string" ? o.nameLat : undefined) ??
    (typeof o.name_lat === "string" ? o.name_lat : undefined);
  return nameLat?.trim() || referenceLabel(item);
}

type SampleFormState = {
  sampleType: string;
  name: string;
  description: string;
  sourceName: string;
  sourceAddress: string;
  regionId: string;
  districtId: string;
  collectedDate: string;
  dateSubmissionLaboratory: string;
};

function emptyForm(enums: EnumsData | null): SampleFormState {
  return {
    sampleType: enums?.sampleTypes[0] ? String(enums.sampleTypes[0].value) : "",
    name: "",
    description: "",
    sourceName: "",
    sourceAddress: "",
    regionId: "",
    districtId: "",
    collectedDate: "",
    dateSubmissionLaboratory: "",
  };
}

function sampleToForm(s: SampleDto): SampleFormState {
  return {
    sampleType: String(s.sampleType),
    name: s.name,
    description: s.description,
    sourceName: s.sourceName,
    sourceAddress: s.sourceAddress,
    regionId: String(s.regionId),
    districtId: String(s.districtId),
    collectedDate: s.collectedDate,
    dateSubmissionLaboratory: s.dateSubmissionLaboratory ?? "",
  };
}

function formToBody(f: SampleFormState): SaveSampleBody | null {
  const sampleType = Number(f.sampleType);
  const regionId = Number(f.regionId);
  const districtId = Number(f.districtId);

  if (!Number.isFinite(sampleType)) {
    toast.error("Namuna turini tanlang");
    return null;
  }
  if (!f.name.trim()) {
    toast.error("Namuna nomini kiriting");
    return null;
  }
  if (!Number.isFinite(regionId) || regionId <= 0) {
    toast.error("Viloyatni tanlang");
    return null;
  }
  if (!Number.isFinite(districtId) || districtId <= 0) {
    toast.error("Tumanni tanlang");
    return null;
  }
  if (!f.collectedDate.trim()) {
    toast.error("Olingan sana va vaqtni tanlang");
    return null;
  }
  if (!f.dateSubmissionLaboratory.trim()) {
    toast.error("Laboratoriyaga taqdim etilgan sana va vaqtni tanlang");
    return null;
  }

  return {
    sampleType,
    name: f.name.trim(),
    description: f.description.trim(),
    sourceName: f.sourceName.trim(),
    sourceAddress: f.sourceAddress.trim(),
    regionId,
    districtId,
    collectedDate: f.collectedDate.trim(),
    dateSubmissionLaboratory: f.dateSubmissionLaboratory.trim(),
  };
}

export default function CashierSamplesTab() {
  const [samples, setSamples] = useState<SampleDto[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [districts, setDistricts] = useState<ReferenceItem[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SampleFormState>(emptyForm(null));
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SampleDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Jadval: joriy sahifadagi namunalar uchun barcha kerakli tuman nomlari (viloyat bo‘yicha GET /districts) */
  const [tableDistrictNames, setTableDistrictNames] = useState<Map<number, string>>(() => new Map());

  const regionNameById = useMemo(() => {
    const m = new Map<number, string>();
    regions.forEach((r) => m.set(r.id, referenceNameLatLabel(r)));
    return m;
  }, [regions]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRef(true);
    Promise.all([getEnums(), fetchRegions()])
      .then(([e, r]) => {
        if (!cancelled) {
          setEnums(e);
          setRegions(r);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Spravochniklar yuklanmadi"))
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

  const loadSamples = useCallback(async () => {
    setLoadingList(true);
    try {
      const p = await fetchSamples(page, pageSize);
      setSamples(p.items);
      setTotalPages(Math.max(1, p.totalPages));
      setTotalElements(p.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Namunalar yuklanmadi");
      setSamples([]);
    } finally {
      setLoadingList(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void loadSamples();
  }, [loadSamples]);

  useEffect(() => {
    const regionIds = [...new Set(samples.map((s) => s.regionId).filter((id) => id > 0))];
    if (regionIds.length === 0) {
      setTableDistrictNames(new Map());
      return;
    }
    let cancelled = false;
    Promise.all(regionIds.map((rid) => fetchDistricts(rid)))
      .then((lists) => {
        if (cancelled) return;
        const m = new Map<number, string>();
        for (const list of lists) {
          for (const d of list) {
            m.set(d.id, referenceNameLatLabel(d));
          }
        }
        setTableDistrictNames(m);
      })
      .catch(() => {
        if (!cancelled) setTableDistrictNames(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [samples]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(enums));
    setDialogOpen(true);
  };

  const openEdit = async (row: SampleDto) => {
    setEditingId(row.id);
    setDialogOpen(true);
    try {
      const full = await fetchSample(row.id);
      setForm(sampleToForm(full));
    } catch {
      setForm(sampleToForm(row));
    }
  };

  const handleSave = async () => {
    const body = formToBody(form);
    if (!body) return;
    setSaving(true);
    try {
      if (editingId != null) {
        await updateSample(editingId, body);
        toast.success("Namuna yangilandi");
      } else {
        await createSample(body);
        toast.success("Namuna yaratildi");
      }
      setDialogOpen(false);
      setEditingId(null);
      await loadSamples();
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
      await deleteSample(deleteTarget.id);
      toast.success("Namuna o‘chirildi");
      setDeleteTarget(null);
      await loadSamples();
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
            <CardTitle>Namunalarni boshqarish</CardTitle>
            {/* <CardDescription>POST/GET/PUT/DELETE samples — sahifalangan ro‘yxat.</CardDescription> */}
          </div>
          <AntButton type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={loadingRef} className="shrink-0">
            Namuna qo‘shish
          </AntButton>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">№</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead>Manba</TableHead>
                <TableHead>Viloyat/Tuman</TableHead>
                <TableHead>Olingan sana</TableHead>
                <TableHead>Laboratoriyaga taqdim</TableHead>
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
              ) : samples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Namunalar yo‘q
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((s, idx) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm tabular-nums">{page * pageSize + idx + 1}</TableCell>
                    <TableCell className="text-sm">
                      {enums ? enumLabel(enums.sampleTypes, s.sampleType) : s.sampleType}
                    </TableCell>
                    <TableCell className="text-sm">{s.name || "—"}</TableCell>
                    <TableCell className="text-sm">{s.sourceName || "—"}</TableCell>
                    <TableCell
                      className="text-sm max-w-[min(280px,40vw)]"
                      title={`${regionNameById.get(s.regionId) ?? `Viloyat #${s.regionId}`} / ${tableDistrictNames.get(s.districtId) ?? `Tuman #${s.districtId}`}`}
                    >
                      <span className="line-clamp-2">
                        {regionNameById.get(s.regionId) ?? `Viloyat #${s.regionId}`} /{" "}
                        {tableDistrictNames.get(s.districtId) ?? `Tuman #${s.districtId}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">{s.collectedDate ? formatTableDateTime(s.collectedDate) : "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      {s.dateSubmissionLaboratory ? formatTableDateTime(s.dateSubmissionLaboratory) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" type="button" onClick={() => void openEdit(s)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setDeleteTarget(s)}>
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

        <Modal
          title={editingId != null ? "Namunani tahrirlash" : "Yangi namuna"}
          open={dialogOpen}
          onCancel={() => {
            setDialogOpen(false);
            setEditingId(null);
          }}
          width={720}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Typography.Text>Namuna turi</Typography.Text>
                <AntSelect
                  className="w-full"
                  placeholder={loadingRef ? "…" : "Tanlang"}
                  loading={loadingRef}
                  disabled={loadingRef}
                  value={form.sampleType || undefined}
                  onChange={(v) => setForm({ ...form, sampleType: v ?? "" })}
                  options={(enums?.sampleTypes ?? []).map((e) => ({
                    value: String(e.value),
                    label: enumEntryDisplayLabel(e),
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Nomi</Typography.Text>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nomi"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Olingan sana va vaqt</Typography.Text>
                <DatePicker
                  className="w-full"
                  showTime={{ format: "HH:mm" }}
                  placeholder="Sana va vaqtni tanlang"
                  format="YYYY-MM-DD HH:mm:ss.SSS"
                  value={form.collectedDate ? dayjs(form.collectedDate) : null}
                  onChange={(date) =>
                    setForm((prev) => ({
                      ...prev,
                      collectedDate: date ? date.toISOString() : "",
                    }))
                  }
                  allowClear
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Laboratoriyaga taqdim etilgan sana va vaqti</Typography.Text>
                <DatePicker
                  className="w-full"
                  showTime={{ format: "HH:mm" }}
                  placeholder="Sana va vaqtni tanlang"
                  format="YYYY-MM-DD HH:mm:ss.SSS"
                  value={form.dateSubmissionLaboratory ? dayjs(form.dateSubmissionLaboratory) : null}
                  onChange={(date) =>
                    setForm((prev) => ({
                      ...prev,
                      dateSubmissionLaboratory: date ? date.toISOString() : "",
                    }))
                  }
                  allowClear
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Typography.Text>Viloyat</Typography.Text>
                <AntSelect
                  className="w-full"
                  placeholder={loadingRef ? "…" : "Tanlang"}
                  loading={loadingRef}
                  disabled={loadingRef}
                  value={form.regionId || undefined}
                  onChange={(v) => setForm({ ...form, regionId: v ?? "", districtId: "" })}
                  options={regions.map((r) => ({
                    value: String(r.id),
                    label: referenceNameLatLabel(r),
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Tuman</Typography.Text>
                <AntSelect
                  className="w-full"
                  placeholder={loadingDistricts ? "…" : "Tanlang"}
                  loading={loadingDistricts}
                  disabled={!form.regionId || loadingDistricts}
                  value={form.districtId || undefined}
                  onChange={(v) => setForm({ ...form, districtId: v ?? "" })}
                  options={districts.map((d) => ({
                    value: String(d.id),
                    label: referenceNameLatLabel(d),
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Typography.Text>Namuna olingan joy</Typography.Text>
                <Input
                  value={form.sourceName}
                  onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
                  placeholder="Joy"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography.Text>Namuna olingan manzil</Typography.Text>
                <Input
                  value={form.sourceAddress}
                  onChange={(e) => setForm({ ...form, sourceAddress: e.target.value })}
                  placeholder="Manzil"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text>Tavsif</Typography.Text>
              <Input.TextArea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tavsif"
              />
            </div>
          </div>
        </Modal>

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Namunani o‘chirish</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `${deleteTarget.name || deleteTarget.sourceName || "Namuna"} o‘chiriladi.`
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
