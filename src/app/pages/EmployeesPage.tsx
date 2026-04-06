import React, { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, ListFilter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import type { ReferenceItem } from "../../services/referenceDataApi";
import { fetchRegions, fetchDistricts } from "../../services/referenceDataApi";
import { fetchDepartments, type DepartmentDto } from "../../services/departmentsApi";
import {
  EmployeeDto,
  CreateOrUpdateEmployeeBody,
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../services/employeesApi";

const emptyForm: CreateOrUpdateEmployeeBody = {
  firstName: "",
  lastName: "",
  surname: "",
  spSesDepartmentId: 0,
  regionId: 0,
  districtId: 0,
};

function referenceLabel(item: ReferenceItem): string {
  return item.nameUz?.trim() || item.name?.trim() || item.nameRu?.trim() || `#${item.id}`;
}

/** Dialogdagi viloyat/tuman — lotincha nom (nameLat), bo‘lmasa oddiy label */
function referenceNameLatLabel(item: ReferenceItem): string {
  const o = item as Record<string, unknown>;
  const nameLat =
    (typeof o.nameLat === "string" ? o.nameLat : undefined) ??
    (typeof o.name_lat === "string" ? o.name_lat : undefined);
  return nameLat?.trim() || referenceLabel(item);
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeDto | null>(null);
  const [form, setForm] = useState<CreateOrUpdateEmployeeBody>(emptyForm);
  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [districts, setDistricts] = useState<ReferenceItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  /** Ro‘yxat filtrlari (GET /employees/admin) */
  const [filterSpDepartmentId, setFilterSpDepartmentId] = useState(0);
  const [filterRegionId, setFilterRegionId] = useState(0);
  const [filterDistrictId, setFilterDistrictId] = useState(0);
  const [filterDistricts, setFilterDistricts] = useState<ReferenceItem[]>([]);
  const [loadingFilterDistricts, setLoadingFilterDistricts] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetchEmployees(page, size, {
        ...(filterSpDepartmentId > 0 ? { spDepartmentId: filterSpDepartmentId } : {}),
        ...(filterRegionId > 0 ? { regionId: filterRegionId } : {}),
        ...(filterDistrictId > 0 ? { districtId: filterDistrictId } : {}),
      });
      setEmployees(res.items);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xodimlar ro‘yxatini yuklab bo‘lmadi");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterSpDepartmentId, filterRegionId, filterDistrictId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRegions(true);
    Promise.all([fetchRegions(), fetchDepartments()])
      .then(([r, d]) => {
        if (cancelled) return;
        setRegions(r);
        setDepartments(d);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Ma’lumotlarni yuklab bo‘lmadi");
          setRegions([]);
          setDepartments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRegions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const rid = form.regionId;
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
    if (!Number.isFinite(filterRegionId) || filterRegionId <= 0) {
      setFilterDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingFilterDistricts(true);
    fetchDistricts(filterRegionId)
      .then((rows) => {
        if (!cancelled) setFilterDistricts(rows);
      })
      .catch(() => {
        if (!cancelled) setFilterDistricts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFilterDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterRegionId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: EmployeeDto) => {
    setEditing(row);
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      surname: row.surname,
      spSesDepartmentId: row.spSesDepartmentId,
      regionId: row.regionId,
      districtId: row.districtId,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Ism va familiya majburiy");
      return;
    }
    if (!form.spSesDepartmentId || !form.regionId || !form.districtId) {
      toast.error("Bo‘lim, viloyat va tuman ID larini kiriting");
      return;
    }
    try {
      if (editing) {
        await updateEmployee(editing.id, form);
        toast.success("Xodim yangilandi");
      } else {
        await createEmployee(form);
        toast.success("Xodim qo‘shildi");
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await loadEmployees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
    }
  };

  const handleDelete = async (row: EmployeeDto) => {
    if (!window.confirm(`"${row.firstName} ${row.lastName}" xodimini o‘chirishni tasdiqlaysizmi?`)) {
      return;
    }
    try {
      await deleteEmployee(row.id);
      toast.success("Xodim o‘chirildi");
      await loadEmployees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O‘chirishda xatolik");
    }
  };

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const full = `${e.firstName} ${e.lastName} ${e.surname}`.toLowerCase();
    return full.includes(q);
  });

  const activeFilterCount = [
    filterSpDepartmentId > 0,
    filterRegionId > 0,
    filterDistrictId > 0,
    search.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Xodimlar</h1>
          <p className="text-sm text-gray-600">
            Employee API laridan foydalanib xodimlarni boshqarish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={filterPanelOpen || activeFilterCount > 0 ? "secondary" : "outline"}
            className="relative"
            onClick={() => setFilterPanelOpen((o) => !o)}
            aria-expanded={filterPanelOpen}
          >
            <ListFilter className="h-4 w-4 mr-2" />
            Filtr
            {activeFilterCount > 0 ? (
              <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Yangi xodim
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Xodimlar ro‘yxati</CardTitle>
            <CardDescription className="mt-1">
              «Filtr» ni oching: bo‘lim, viloyat, tuman va ism/familiya bo‘yicha qidiruv bir joyda.
            </CardDescription>
          </div>
        </CardHeader>
        {filterPanelOpen ? (
          <div className="border-b px-6 pb-6 pt-0 -mt-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground mb-3">Filtrlash</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bo‘lim</Label>
                  <Select
                    value={filterSpDepartmentId ? String(filterSpDepartmentId) : "0"}
                    onValueChange={(v) => {
                      setPage(0);
                      setFilterSpDepartmentId(Number(v) || 0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hammasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Hammasi</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Viloyat</Label>
                  <Select
                    value={filterRegionId ? String(filterRegionId) : "0"}
                    onValueChange={(v) => {
                      setPage(0);
                      setFilterRegionId(Number(v) || 0);
                      setFilterDistrictId(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hammasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Hammasi</SelectItem>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {referenceLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tuman</Label>
                  <Select
                    value={filterDistrictId ? String(filterDistrictId) : "0"}
                    onValueChange={(v) => {
                      setPage(0);
                      setFilterDistrictId(Number(v) || 0);
                    }}
                    disabled={!filterRegionId || loadingFilterDistricts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingFilterDistricts ? "Yuklanmoqda…" : "Hammasi"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Hammasi</SelectItem>
                      {filterDistricts.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {referenceLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ism, familiya</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Ism familiya bo‘yicha qidirish"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPage(0);
                    setFilterSpDepartmentId(0);
                    setFilterRegionId(0);
                    setFilterDistrictId(0);
                    setSearch("");
                  }}
                >
                  Filtrlarni tozalash
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterPanelOpen(false)}
                >
                  Yopish
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Ism</TableHead>
                  <TableHead>Familiya</TableHead>
                  <TableHead>Sharif</TableHead>
                  <TableHead>Bo‘lim</TableHead>
                  <TableHead>Viloyat</TableHead>
                  <TableHead>Tuman</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      Xodimlar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.firstName}</TableCell>
                      <TableCell>{row.lastName}</TableCell>
                      <TableCell>{row.surname}</TableCell>
                      <TableCell>
                        {row.spSesDepartmentName?.trim() || `ID ${row.spSesDepartmentId}`}
                      </TableCell>
                      <TableCell>{row.regionNameUz?.trim() || row.regionId}</TableCell>
                      <TableCell>{row.districtNameUz?.trim() || row.districtId}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="outline" onClick={() => openEdit(row)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-red-600 border-red-200"
                          onClick={() => handleDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Jami: {totalElements} · Sahifa: {page + 1} / {totalPages}
            </p>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Oldingi
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Keyingi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Xodimni tahrirlash" : "Yangi xodim qo‘shish"}</DialogTitle>
            <DialogDescription>Swagger dagi /employees API lariga mos forma</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ism</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Familiya</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">Sharif</Label>
              <Input
                id="surname"
                value={form.surname}
                onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bo‘lim</Label>
                <Select
                  value={form.spSesDepartmentId ? String(form.spSesDepartmentId) : ""}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, spSesDepartmentId: Number(v) || 0 }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRegions ? "Yuklanmoqda…" : "Tanlang"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tanlanmagan (0)</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Viloyat</Label>
                <Select
                  value={form.regionId ? String(form.regionId) : ""}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      regionId: Number(v) || 0,
                      districtId: 0,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRegions ? "Yuklanmoqda…" : "Tanlang"} />
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
                  value={form.districtId ? String(form.districtId) : ""}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, districtId: Number(v) || 0 }))
                  }
                  disabled={!form.regionId || loadingDistricts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDistricts ? "Yuklanmoqda…" : "Tanlang"} />
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
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button onClick={handleSubmit}>
                {editing ? "Saqlash" : "Qo‘shish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

