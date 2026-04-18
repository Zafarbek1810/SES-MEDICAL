import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
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
  Switch,
  InputNumber,
  Divider,
  Checkbox,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { toast } from "sonner";
import { formatTableDate } from "../../../utils/tableDateFormat";
import type { ReferenceItem } from "../../../services/referenceDataApi";
import { fetchRegions, fetchDistricts, fetchVillages } from "../../../services/referenceDataApi";
import {
  fetchWorkplaces,
  fetchWorkplacesAdmin,
  fetchWorkplacesByUserLocationPage,
  type WorkplaceDto,
} from "../../../services/workplacesApi";
import {
  fetchSpIndustries,
  fetchSpPositions,
  type SpIndustryDto,
  type SpPositionDto,
} from "../../../services/spIndustriesPositionsApi";
import {
  createPatient,
  deletePatient,
  fetchPatient,
  fetchPatients,
  updatePatient,
  type PatientDto,
  type SavePatientBody,
} from "../../../services/patientsApi";
import { createSample, type SaveSampleBody } from "../../../services/samplesApi";
import { enumEntryDisplayLabel, getEnums, type EnumsData } from "../../../services/enumsApi";

const UZ_PHONE_PREFIX = "+998";
const PHONE_LOCAL_DIGITS = 9;

/** GET /enums da yo‘q bo‘lsa — fuqaro asosidagi namuna (HUMAN) */
const HUMAN_SAMPLE_OBJECT_TYPE_FALLBACK = 33;

function humanSampleObjectTypeValue(enums: EnumsData | null): number {
  const hit = enums?.sampleObjectType.find((e) => e.name?.trim().toUpperCase() === "HUMAN");
  return hit != null && Number.isFinite(hit.value) ? hit.value : HUMAN_SAMPLE_OBJECT_TYPE_FALLBACK;
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

function patientSexLabel(sex: number | undefined): string {
  if (sex === 1) return "Erkak";
  if (sex === 0) return "Ayol";
  return "—";
}

type PatientFormState = {
  firstName: string;
  lastName: string;
  surname: string;
  regionId: string;
  districtId: string;
  villageId: string;
  workplaceId: string;
  /** UI: GET /sp-industries */
  spIndustryId: string;
  /** GET /sp-positions */
  positionId: string;
  birthDay: string;
  /** +998 dan keyingi aynan 9 ta raqam (prefiks alohida ko‘rsatiladi) */
  phoneLocalDigits: string;
  /** API: 1 — erkak, 0 — ayol; `null` — tanlanmagan */
  sex: 0 | 1 | null;
  address: string;
  privilege: string;
  comment: string;
  isSendSms: boolean;
  /** Faqat yangi bemor: ketma-ket POST /samples — GET /enums `sampleTypes` */
  sampleObjectName: string;
  sampleType: string;
  sampleName: string;
  sampleDescription: string;
  sampleSourceName: string;
  sampleSourceAddress: string;
  sampleCollectedDate: string;
  sampleDateSubmissionLaboratory: string;
  /** Faqat yangi bemor: belgilansa namuna POST qilinadi va maydonlar ko‘rinadi */
  createSampleWithPatient: boolean;
};

function emptyForm(enums: EnumsData | null): PatientFormState {
  return {
    firstName: "",
    lastName: "",
    surname: "",
    regionId: "",
    districtId: "",
    villageId: "",
    workplaceId: "",
    spIndustryId: "",
    positionId: "",
    birthDay: "",
    phoneLocalDigits: "",
    sex: null,
    address: "",
    privilege: "0",
    comment: "",
    isSendSms: true,
    sampleObjectName: "",
    sampleType: enums?.sampleTypes[0] ? String(enums.sampleTypes[0].value) : "",
    sampleName: "",
    sampleDescription: "",
    sampleSourceName: "",
    sampleSourceAddress: "",
    sampleCollectedDate: "",
    sampleDateSubmissionLaboratory: "",
    createSampleWithPatient: false,
  };
}

function patientToForm(p: PatientDto): PatientFormState {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    surname: p.surname ?? "",
    regionId: String(p.regionId),
    districtId: String(p.districtId),
    villageId: String(p.villageId),
    workplaceId: String(p.workplaceId),
    spIndustryId: p.positionIndustryId != null && p.positionIndustryId > 0 ? String(p.positionIndustryId) : "",
    positionId: p.positionId > 0 ? String(p.positionId) : "",
    birthDay: p.birthDay,
    phoneLocalDigits: parseLocalDigitsFromStored(p.phoneNumber),
    sex: p.sex === 0 || p.sex === 1 ? p.sex : null,
    address: p.address,
    privilege: String(p.privilege),
    comment: p.comment,
    isSendSms: p.isSendSms,
    sampleObjectName: "",
    sampleType: "",
    sampleName: "",
    sampleDescription: "",
    sampleSourceName: "",
    sampleSourceAddress: "",
    sampleCollectedDate: "",
    sampleDateSubmissionLaboratory: "",
    createSampleWithPatient: false,
  };
}

function formToBody(f: PatientFormState): SavePatientBody | null {
  if (!f.firstName.trim() || !f.lastName.trim()) {
    toast.error("Ism va familiya majburiy");
    return null;
  }
  if (f.sex !== 0 && f.sex !== 1) {
    toast.error("Jinsni tanlang");
    return null;
  }
  const regionId = Number(f.regionId);
  const districtId = Number(f.districtId);
  const villageId = Number(f.villageId);
  const workplaceId = Number(f.workplaceId);
  const positionId = Number(f.positionId);
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
  if (!Number.isFinite(positionId) || positionId <= 0) {
    toast.error("Lavozimni tanlang");
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
  const phoneDigits = f.phoneLocalDigits.replace(/\D/g, "");
  if (phoneDigits.length !== PHONE_LOCAL_DIGITS) {
    toast.error(`Telefon: +998 dan keyin aynan ${PHONE_LOCAL_DIGITS} ta raqam kiriting`);
    return null;
  }
  return {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    surname: f.surname.trim(),
    sex: f.sex,
    regionId,
    districtId,
    villageId,
    workplaceId,
    positionId,
    birthDay: f.birthDay.trim(),
    phoneNumber: `${UZ_PHONE_PREFIX}${phoneDigits}`,
    address: f.address.trim(),
    privilege,
    comment: f.comment.trim(),
    isSendSms: f.isSendSms,
  };
}

/** Yangi bemor yaratilgandan keyin: viloyat/tuman bemor bilan umumiy */
function sampleFormToBody(f: PatientFormState, patientId: number, enums: EnumsData | null): SaveSampleBody | null {
  const sampleType = Number(f.sampleType);
  const regionId = Number(f.regionId);
  const districtId = Number(f.districtId);

  if (!f.sampleObjectName.trim()) {
    toast.error("Namuna: obyekt nomini kiriting");
    return null;
  }
  if (!Number.isFinite(sampleType)) {
    toast.error("Namuna turini tanlang");
    return null;
  }
  if (!f.sampleName.trim()) {
    toast.error("Namuna nomini kiriting");
    return null;
  }
  if (!Number.isFinite(regionId) || regionId <= 0) {
    toast.error("Namuna uchun viloyat: yuqoridagi bemor maydonidan tanlang");
    return null;
  }
  if (!Number.isFinite(districtId) || districtId <= 0) {
    toast.error("Namuna uchun tuman: yuqoridagi bemor maydonidan tanlang");
    return null;
  }
  if (!f.sampleCollectedDate.trim()) {
    toast.error("Namuna: olingan sana va vaqtni tanlang");
    return null;
  }
  if (!f.sampleDateSubmissionLaboratory.trim()) {
    toast.error("Namuna: laboratoriyaga taqdim etilgan sana va vaqtni tanlang");
    return null;
  }

  return {
    objectName: f.sampleObjectName.trim(),
    sampleObjectType: humanSampleObjectTypeValue(enums),
    patientId,
    sampleType,
    name: f.sampleName.trim(),
    description: f.sampleDescription.trim(),
    sourceName: f.sampleSourceName.trim(),
    sourceAddress: f.sampleSourceAddress.trim(),
    regionId,
    districtId,
    collectedDate: f.sampleCollectedDate.trim(),
    dateSubmissionLaboratory: f.sampleDateSubmissionLaboratory.trim(),
  };
}

export default function CashierPatientsTab() {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [districts, setDistricts] = useState<ReferenceItem[]>([]);
  const [villages, setVillages] = useState<ReferenceItem[]>([]);
  /** Jadvalda ish joyi nomini ko‘rsatish (admin ro‘yxat) */
  const [workplaces, setWorkplaces] = useState<WorkplaceDto[]>([]);
  /** Dialog: GET /workplaces/by-user-location (birinchi sahifa, 100 ta) */
  const [dialogWorkplaces, setDialogWorkplaces] = useState<WorkplaceDto[]>([]);
  const [loadingDialogWorkplaces, setLoadingDialogWorkplaces] = useState(false);
  const [spIndustries, setSpIndustries] = useState<SpIndustryDto[]>([]);
  const [spPositions, setSpPositions] = useState<SpPositionDto[]>([]);
  const [loadingSpPositions, setLoadingSpPositions] = useState(false);
  const [loadingRef, setLoadingRef] = useState(true);
  const [enums, setEnums] = useState<EnumsData | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PatientFormState>(() => emptyForm(null));
  const [saving, setSaving] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PatientDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const villageSelectIds = useMemo(() => new Set(villages.map((v) => v.id)), [villages]);
  const orphanVillageId = Number(form.villageId);
  const showOrphanVillage =
    Number.isFinite(orphanVillageId) && orphanVillageId > 0 && !villageSelectIds.has(orphanVillageId);

  const dialogWorkplaceSelectIds = useMemo(() => new Set(dialogWorkplaces.map((w) => w.id)), [dialogWorkplaces]);
  const orphanWorkplaceId = Number(form.workplaceId);
  const showOrphanWorkplace =
    Number.isFinite(orphanWorkplaceId) && orphanWorkplaceId > 0 && !dialogWorkplaceSelectIds.has(orphanWorkplaceId);

  const positionSelectIds = useMemo(() => new Set(spPositions.map((p) => p.id)), [spPositions]);
  const orphanPositionId = Number(form.positionId);
  const showOrphanPosition =
    Number.isFinite(orphanPositionId) &&
    orphanPositionId > 0 &&
    !positionSelectIds.has(orphanPositionId);

  useEffect(() => {
    let cancelled = false;
    setLoadingRef(true);
    Promise.all([
      fetchRegions(),
      fetchWorkplacesAdmin().catch(() => fetchWorkplaces()),
      fetchSpIndustries().catch(() => []),
      getEnums().catch(() => null),
    ])
      .then(([r, w, ind, en]) => {
        if (!cancelled) {
          setRegions(r);
          setWorkplaces(w);
          setSpIndustries(ind);
          if (en) setEnums(en);
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
    if (!dialogOpen) return;
    let cancelled = false;
    setLoadingDialogWorkplaces(true);
    fetchWorkplacesByUserLocationPage(0, 100)
      .then((rows) => {
        if (!cancelled) setDialogWorkplaces(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Ish joylari yuklanmadi");
          setDialogWorkplaces([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDialogWorkplaces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen]);

  const loadPatients = useCallback(async () => {
    setLoadingList(true);
    try {
      const p = await fetchPatients(page, pageSize);
      setPatients(p.items);
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

  const positionSelectOptions = useMemo(() => {
    const rows = spPositions.map((p) => ({ value: String(p.id), label: p.name }));
    const pid = form.positionId;
    if (showOrphanPosition && pid && !rows.some((r) => r.value === pid)) {
      return [{ value: pid, label: `Lavozim #${pid}` }, ...rows];
    }
    return rows;
  }, [spPositions, showOrphanPosition, form.positionId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(enums));
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
    let samplePreview: SaveSampleBody | null = null;
    if (editingId == null && form.createSampleWithPatient) {
      samplePreview = sampleFormToBody(form, 0, enums);
      if (!samplePreview) return;
    }
    setSaving(true);
    try {
      if (editingId != null) {
        await updatePatient(editingId, body);
        toast.success("Bemor yangilandi");
      } else {
        const created = await createPatient(body);
        if (samplePreview) {
          try {
            await createSample({ ...samplePreview, patientId: created.id });
          } catch (sampleErr) {
            const msg = sampleErr instanceof Error ? sampleErr.message : "Namuna yaratilmadi";
            toast.error(`Bemor yaratildi (#${created.id}), lekin namuna: ${msg}`);
            setDialogOpen(false);
            setEditingId(null);
            await loadPatients();
            return;
          }
          toast.success("Bemor va namuna yaratildi");
        } else {
          toast.success("Bemor yaratildi");
        }
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

  const industrySelectOptions = useMemo(
    () => spIndustries.map((ind) => ({ value: String(ind.id), label: ind.name })),
    [spIndustries],
  );

  const tableColumns: ColumnsType<PatientDto> = useMemo(
    () => [
      {
        title: "№",
        width: 72,
        render: (_row, _record, index) => page * pageSize + index + 1,
      },
      { title: "Ism", ellipsis: true, render: (row) => row.firstName || "—" },
      { title: "Familiya", ellipsis: true, render: (row) => row.lastName || "—" },
      { title: "Otasining ismi", ellipsis: true, render: (row) => row.surname || "—" },
      {
        title: "Jins",
        width: 96,
        render: (row) => patientSexLabel(row.sex),
      },
      { title: "Telefon", render: (row) => row.phoneNumber || "—" },
      {
        title: "Tug‘ilgan sana",
        render: (row) => (row.birthDay ? formatTableDate(row.birthDay) : "—"),
      },
      {
        title: "Ish joyi",
        ellipsis: true,
        render: (row) => workplaceName(row.workplaceId),
      },
      {
        title: "Lavozim",
        ellipsis: true,
        render: (row) =>
          row.positionName?.trim()
            ? row.positionName
            : row.positionId > 0
              ? `Lavozim #${row.positionId}`
              : "—",
      },
      {
        title: "Amallar",
        key: "actions",
        align: "right",
        width: 120,
        render: (row) => (
          <Space size="small">
            <Button type="text" size="small" icon={<Edit className="h-4 w-4" />} onClick={() => void openEdit(row)} />
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setDeleteTarget(row)}
            />
          </Space>
        ),
      },
    ],
    [page, pageSize, workplaces],
  );

  return (
    <Card
      title="Bemorlar"
      extra={
        <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={loadingRef}>
          Bemor qo‘shish
        </Button>
      }
    >
      <Space direction="vertical" size="large" className="w-full">
        <Table<PatientDto>
          rowKey="id"
          loading={loadingList}
          columns={tableColumns}
          dataSource={patients}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Bemorlar yo‘q" }}
        />

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

        <Modal
          title={editingId != null ? "Bemorni tahrirlash" : "Yangi bemor"}
          open={dialogOpen}
          onCancel={() => {
            setDialogOpen(false);
            setEditingId(null);
          }}
          width={780}
          styles={{ body: { maxHeight: "min(90vh, 820px)", overflowY: "auto" } }}
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
          <Typography.Paragraph type="secondary" className="!mb-2">
            {editingId != null
              ? "Bemor ma’lumotlari server talabiga mos yuboriladi."
              : "Bemor saqlanadi. Namuna kerak bo‘lsa, pastdagi belgini yoqing — viloyat va tuman ikkala yozuv uchun umumiy bo‘ladi."}
          </Typography.Paragraph>

          <Typography.Title level={5} className="!mb-3 !mt-1">
            Bemor
          </Typography.Title>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Typography.Text>Ism</Typography.Text>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text>Familiya</Typography.Text>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text>Otasining ismi</Typography.Text>
              <Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text>Jins</Typography.Text>
              <Select<number | null>
                className="w-full"
                placeholder="Tanlang"
                value={form.sex ?? undefined}
                onChange={(v) =>
                  setForm({ ...form, sex: v === undefined || v === null ? null : (v === 1 ? 1 : 0) })
                }
                options={[
                  { value: 1, label: "Erkak" },
                  { value: 0, label: "Ayol" },
                ]}
                allowClear
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
                    villageId: "",
                  })
                }
                options={regions.map((r) => ({ value: String(r.id), label: referenceNameLatLabel(r) }))}
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
                    villageId: "",
                  })
                }
                options={districts.map((d) => ({ value: String(d.id), label: referenceNameLatLabel(d) }))}
                showSearch
                optionFilterProp="label"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text>Mahalla / qishloq</Typography.Text>
              <Select
                allowClear
                className="w-full"
                placeholder={loadingVillages ? "…" : "Tanlang"}
                loading={loadingVillages}
                disabled={!form.districtId || loadingVillages}
                value={form.villageId === "" ? undefined : form.villageId}
                onChange={(v) => setForm({ ...form, villageId: v ?? "0" })}
                options={[
                  { value: "0", label: "Tanlanmagan (0)" },
                  ...(showOrphanVillage && form.villageId && form.villageId !== "0"
                    ? [{ value: form.villageId, label: `ID ${form.villageId}` }]
                    : []),
                  ...villages.map((v) => ({ value: String(v.id), label: referenceNameLatLabel(v) })),
                ]}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text>Ish joyi</Typography.Text>
              <Select
                allowClear
                className="w-full"
                placeholder={loadingDialogWorkplaces ? "Yuklanmoqda…" : "Tanlang"}
                loading={loadingDialogWorkplaces}
                disabled={loadingDialogWorkplaces}
                value={form.workplaceId === "" ? undefined : form.workplaceId}
                onChange={(v) => setForm({ ...form, workplaceId: v ?? "0" })}
                options={[
                  { value: "0", label: "Tanlanmagan (0)" },
                  ...(showOrphanWorkplace && form.workplaceId && form.workplaceId !== "0"
                    ? [{ value: form.workplaceId, label: `Ish joyi #${form.workplaceId}` }]
                    : []),
                  ...dialogWorkplaces.map((w) => ({ value: String(w.id), label: w.name })),
                ]}
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
                    positionId: "",
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
                disabled={!form.spIndustryId || loadingSpPositions}
                value={form.positionId || undefined}
                onChange={(v) => setForm({ ...form, positionId: v ?? "" })}
                options={positionSelectOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text>Tug‘ilgan sana</Typography.Text>
              <DatePicker
                className="w-full"
                placeholder="Sanani tanlang"
                format="YYYY-MM-DD"
                value={form.birthDay ? dayjs(form.birthDay, "YYYY-MM-DD") : null}
                onChange={(d) => setForm({ ...form, birthDay: d ? d.format("YYYY-MM-DD") : "" })}
                allowClear
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
              <Typography.Text>Manzil</Typography.Text>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            {/* <div className="flex flex-col gap-1">
              <Typography.Text>Imtiyoz (privilege)</Typography.Text>
              <InputNumber
                className="w-full"
                min={0}
                value={Number(form.privilege) || 0}
                onChange={(v) => setForm({ ...form, privilege: String(v ?? 0) })}
              />
            </div> */}
            <div className="flex flex-col justify-center gap-1 sm:col-span-2">
              <Space align="center">
                <Switch checked={form.isSendSms} onChange={(c) => setForm({ ...form, isSendSms: c })} />
                <Typography.Text>SMS yuborish (isSendSms)</Typography.Text>
              </Space>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <Typography.Text>Izoh</Typography.Text>
              <Input.TextArea
                rows={3}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>
          </div>

          {editingId == null ? (
            <>
              <Divider className="!my-6" />
              <Checkbox
                checked={form.createSampleWithPatient}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    createSampleWithPatient: checked,
                    ...(checked && !prev.sampleType && enums?.sampleTypes[0]
                      ? { sampleType: String(enums.sampleTypes[0].value) }
                      : {}),
                  }));
                }}
              >
                Na'muna qo'shish
              </Checkbox>

              {form.createSampleWithPatient ? (
                <>
                  <Typography.Title level={5} className="!mb-1 !mt-4">
                    Namuna
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" className="!mb-4 !text-sm">
                    Quyidagi maydonlar faqat namunaga tegishli. Viloyat va tuman tanlovi yuqoridagi bemor bo‘limidagi
                    «Viloyat» / «Tuman» maydonlari bilan bir xil qiymatda yuboriladi (sampleObjectType: fuqaro / HUMAN).
                  </Typography.Paragraph>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Typography.Text>Obyekt nomi</Typography.Text>
                  <Input
                    value={form.sampleObjectName}
                    onChange={(e) => setForm({ ...form, sampleObjectName: e.target.value })}
                    placeholder="Namuna obyekti nomi"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>Namuna turi</Typography.Text>
                  <Select
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
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Typography.Text>Namuna nomi</Typography.Text>
                  <Input
                    value={form.sampleName}
                    onChange={(e) => setForm({ ...form, sampleName: e.target.value })}
                    placeholder="Namuna nomi"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>Olingan sana va vaqt</Typography.Text>
                  <DatePicker
                    className="w-full"
                    showTime={{ format: "HH:mm" }}
                    placeholder="Sana va vaqtni tanlang"
                    format="YYYY-MM-DD HH:mm:ss.SSS"
                    value={form.sampleCollectedDate ? dayjs(form.sampleCollectedDate) : null}
                    onChange={(date) =>
                      setForm((prev) => ({
                        ...prev,
                        sampleCollectedDate: date ? date.toISOString() : "",
                      }))
                    }
                    allowClear
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>Laboratoriyaga taqdim etilgan sana va vaqt</Typography.Text>
                  <DatePicker
                    className="w-full"
                    showTime={{ format: "HH:mm" }}
                    placeholder="Sana va vaqtni tanlang"
                    format="YYYY-MM-DD HH:mm:ss.SSS"
                    value={form.sampleDateSubmissionLaboratory ? dayjs(form.sampleDateSubmissionLaboratory) : null}
                    onChange={(date) =>
                      setForm((prev) => ({
                        ...prev,
                        sampleDateSubmissionLaboratory: date ? date.toISOString() : "",
                      }))
                    }
                    allowClear
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>Namuna olingan joy</Typography.Text>
                  <Input
                    value={form.sampleSourceName}
                    onChange={(e) => setForm({ ...form, sampleSourceName: e.target.value })}
                    placeholder="Joy"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography.Text>Namuna olingan manzil</Typography.Text>
                  <Input
                    value={form.sampleSourceAddress}
                    onChange={(e) => setForm({ ...form, sampleSourceAddress: e.target.value })}
                    placeholder="Manzil"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Typography.Text>Namuna tavsifi</Typography.Text>
                  <Input.TextArea
                    rows={2}
                    value={form.sampleDescription}
                    onChange={(e) => setForm({ ...form, sampleDescription: e.target.value })}
                    placeholder="Ixtiyoriy"
                  />
                </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </Modal>

        <Modal
          title="Bemorni o‘chirish"
          open={deleteTarget != null}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onOk={() => void confirmDelete()}
          confirmLoading={deleting}
          okText="O‘chirish"
          okButtonProps={{ danger: true }}
          cancelText="Bekor"
        >
          <p>
            {deleteTarget
              ? `${[deleteTarget.firstName, deleteTarget.lastName, deleteTarget.surname].filter(Boolean).join(" ")} (#${deleteTarget.id}) o‘chiriladi.`
              : ""}
          </p>
        </Modal>
      </Space>
    </Card>
  );
}
