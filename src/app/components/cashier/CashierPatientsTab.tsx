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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { toast } from "sonner";
import { formatTableDate } from "../../../utils/tableDateFormat";
import type { ReferenceItem } from "../../../services/referenceDataApi";
import { fetchRegions, fetchDistricts, fetchVillages } from "../../../services/referenceDataApi";
import { fetchWorkplaces, fetchWorkplacesAdmin, type WorkplaceDto } from "../../../services/workplacesApi";
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

const UZ_PHONE_PREFIX = "+998";
const PHONE_LOCAL_DIGITS = 9;

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
  address: string;
  privilege: string;
  comment: string;
  isSendSms: boolean;
};

function emptyForm(): PatientFormState {
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
    surname: p.surname ?? "",
    regionId: String(p.regionId),
    districtId: String(p.districtId),
    villageId: String(p.villageId),
    workplaceId: String(p.workplaceId),
    spIndustryId: p.positionIndustryId != null && p.positionIndustryId > 0 ? String(p.positionIndustryId) : "",
    positionId: p.positionId > 0 ? String(p.positionId) : "",
    birthDay: p.birthDay,
    phoneLocalDigits: parseLocalDigitsFromStored(p.phoneNumber),
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

export default function CashierPatientsTab() {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [districts, setDistricts] = useState<ReferenceItem[]>([]);
  const [villages, setVillages] = useState<ReferenceItem[]>([]);
  const [workplaces, setWorkplaces] = useState<WorkplaceDto[]>([]);
  const [spIndustries, setSpIndustries] = useState<SpIndustryDto[]>([]);
  const [spPositions, setSpPositions] = useState<SpPositionDto[]>([]);
  const [loadingSpPositions, setLoadingSpPositions] = useState(false);
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
    ])
      .then(([r, w, ind]) => {
        if (!cancelled) {
          setRegions(r);
          setWorkplaces(w);
          setSpIndustries(ind);
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
            Barcha maydonlar server talabiga mos yuboriladi.
          </Typography.Paragraph>

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
                placeholder="Tanlang"
                value={form.workplaceId === "" ? undefined : form.workplaceId}
                onChange={(v) => setForm({ ...form, workplaceId: v ?? "0" })}
                options={[
                  { value: "0", label: "Tanlanmagan (0)" },
                  ...(showOrphanWorkplace && form.workplaceId && form.workplaceId !== "0"
                    ? [{ value: form.workplaceId, label: `Ish joyi #${form.workplaceId}` }]
                    : []),
                  ...workplaces.map((w) => ({ value: String(w.id), label: w.name })),
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

            <div className="flex flex-col gap-1">
              <Typography.Text>Imtiyoz (privilege)</Typography.Text>
              <InputNumber
                className="w-full"
                min={0}
                value={Number(form.privilege) || 0}
                onChange={(v) => setForm({ ...form, privilege: String(v ?? 0) })}
              />
            </div>
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
