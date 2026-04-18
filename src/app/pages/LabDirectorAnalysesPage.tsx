import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Eye, Filter, Search } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import { formatTableDateTime } from "../../utils/tableDateFormat";
import {
  fetchOrderDetailById,
  fetchOrderDetailsList,
  patchOrderDetailAnalysisStatus,
  type AnalysisStateCode,
  type OrderDetailListItem,
} from "../../services/orderDetailsListApi";
import { enumLabel, getEnums, type EnumsData } from "../../services/enumsApi";
import { analysisStateToBadgeStatus } from "../../utils/analysisStateForBadge";

function patientFio(row: OrderDetailListItem): string {
  const fio = [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ").trim();
  return fio || "—";
}

/** Tasdiqlangan / bajarilgan — natija sanasi ustuni uchun */
function isApprovedAnalysis(enums: EnumsData | null, row: OrderDetailListItem): boolean {
  if (row.analysisStatus === 34) return true;
  return analysisStateToBadgeStatus(enums, row.analysisStatus) === "Completed";
}

export default function LabDirectorAnalysesPage() {
  const navigate = useNavigate();
  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [items, setItems] = useState<OrderDetailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [enumData, page] = await Promise.all([getEnums(), fetchOrderDetailsList(0, 200)]);
        if (!cancelled) {
          setEnums(enumData);
          setItems(page.items);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Tahlillar ro‘yxati yuklanmadi");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const query = searchTerm.trim().toLowerCase();

  const filteredAnalyses = useMemo(() => {
    return items.filter((row) => {
      const badgeStatus = analysisStateToBadgeStatus(enums, row.analysisStatus);
      const matchesStatus = statusFilter === "all" || badgeStatus === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;

      const patient = patientFio(row).toLowerCase();
      const analysis = (row.analysisNameUz ?? "").toLowerCase();
      const laboratory = (row.laboratoryNameUz ?? "").toLowerCase();
      const detailId = String(row.id);
      const orderId = String(row.orderId);

      return (
        patient.includes(query) ||
        analysis.includes(query) ||
        laboratory.includes(query) ||
        detailId.includes(query) ||
        orderId.includes(query)
      );
    });
  }, [items, enums, statusFilter, query]);

  const updateAnalysisStatus = async (id: number, analysisStateCode: AnalysisStateCode) => {
    if (updatingIds.includes(id)) return;
    try {
      setUpdatingIds((prev) => [...prev, id]);
      const apiMessage = await patchOrderDetailAnalysisStatus(id, analysisStateCode);
      const refreshed = await fetchOrderDetailById(id);
      setItems((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          if (refreshed) return refreshed;
          return { ...row, analysisStatus: analysisStateCode };
        })
      );
      toast.success(
        apiMessage ||
          (analysisStateCode === 34
            ? `#${id} tahlil tasdiqlandi`
            : `#${id} tahlil rad etildi`)
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Holatni yangilab bo‘lmadi");
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const actionSelectValue = (analysisStatus: number): "none" | "approve" | "reject" => {
    if (analysisStatus === 34) return "approve";
    if (analysisStatus === 44) return "reject";
    return "none";
  };

  const isFinalDecisionStatus = (analysisStatus: number): boolean =>
    analysisStatus === 34 || analysisStatus === 44;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ko‘rib chiqiladigan tahlillar</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Holat bo‘yicha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha holatlar</SelectItem>
                  <SelectItem value="Pending">Kutilmoqda</SelectItem>
                  <SelectItem value="In Progress">Jarayonda</SelectItem>
                  <SelectItem value="Completed">Bajarildi</SelectItem>
                  <SelectItem value="Rejected">Rad etilgan</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Bemor, tahlil, laboratoriya..."
                  className="pl-9 w-72"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" aria-label="Filter">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Bemor</TableHead>
                <TableHead>Tahlil turi</TableHead>
                <TableHead>Laboratoriya</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Buyurtma sanasi</TableHead>
                <TableHead>Natija chiqqan sana</TableHead>
                <TableHead>Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Yuklanmoqda...
                  </TableCell>
                </TableRow>
              ) : filteredAnalyses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Ma’lumot topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnalyses.map((analysis, idx) => {
                  const badgeStatus = analysisStateToBadgeStatus(enums, analysis.analysisStatus);
                  return (
                    <TableRow key={analysis.id}>
                      <TableCell className="font-medium tabular-nums">{idx + 1}</TableCell>
                      <TableCell>{patientFio(analysis)}</TableCell>
                      <TableCell>{analysis.analysisNameUz || "—"}</TableCell>
                      <TableCell>{analysis.laboratoryNameUz || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={badgeStatus}
                          animated={false}
                          label={
                            enums
                              ? enumLabel(enums.analysisStates, analysis.analysisStatus)
                              : String(analysis.analysisStatus)
                          }
                        />
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {formatTableDateTime(analysis.orderCreatedAt)}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {isApprovedAnalysis(enums, analysis) && analysis.resultTime
                          ? formatTableDateTime(analysis.resultTime)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1"
                            onClick={() => navigate(`/lab-director/analysis/${analysis.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                            Batafsil
                          </Button>
                          <Select
                            value={actionSelectValue(analysis.analysisStatus)}
                            onValueChange={(value) => {
                              if (value === "approve") {
                                void updateAnalysisStatus(analysis.id, 34);
                              } else if (value === "reject") {
                                void updateAnalysisStatus(analysis.id, 44);
                              }
                            }}
                            disabled={
                              updatingIds.includes(analysis.id) ||
                              isFinalDecisionStatus(analysis.analysisStatus)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue
                                placeholder={
                                  updatingIds.includes(analysis.id)
                                    ? "Saqlanmoqda..."
                                    : "Amal tanlang"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tanlanmagan</SelectItem>
                              <SelectItem value="approve">Tasdiqlash</SelectItem>
                              <SelectItem value="reject">Rad etish</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
