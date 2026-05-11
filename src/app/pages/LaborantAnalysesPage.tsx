import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, Filter, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { formatTableDateTime } from "../../utils/tableDateFormat";
import { analysisStateToBadgeStatus } from "../../utils/analysisStateForBadge";
import { enumLabel, getEnums, type EnumsData } from "../../services/enumsApi";
import { fetchOrderDetailsList, type OrderDetailListItem } from "../../services/orderDetailsListApi";

function patientFio(row: OrderDetailListItem): string {
  const a = [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ").trim();
  return a || "—";
}

export default function LaborantAnalysesPage() {
  const [items, setItems] = useState<OrderDetailListItem[]>([]);
  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [e, page] = await Promise.all([getEnums(), fetchOrderDetailsList(0, 200)]);
        if (!cancelled) {
          setEnums(e);
          setItems(page.items);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Ro‘yxat yuklanmadi");
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

  const q = searchTerm.trim().toLowerCase();
  const filteredAnalyses = useMemo(() => {
    if (!q) return items;
    return items.filter((row) => {
      const patient = patientFio(row).toLowerCase();
      const analysis = (row.analysisNameUz ?? "").toLowerCase();
      const oid = String(row.orderId);
      const rid = String(row.id);
      return patient.includes(q) || analysis.includes(q) || oid.includes(q) || rid.includes(q);
    });
  }, [items, q]);

  const handleViewAnalysis = (orderDetailId: number) => {
    navigate(`/laborant/analysis/${orderDetailId}?mode=view`);
  };

  const handleEditAnalysis = (orderDetailId: number) => {
    navigate(`/laborant/analysis/${orderDetailId}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="border-border rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tayinlangan tahlillar</CardTitle>
              <CardDescription>Laboratoriya tahlillarini ko‘rish va boshqarish</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tahlillarni qidirish..."
                  className="pl-9 w-64 rounded-xl border-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <Filter className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">№</TableHead>
                  <TableHead className="font-semibold">Bemor</TableHead>
                  <TableHead className="font-semibold">Tahlil turi</TableHead>
                  <TableHead className="font-semibold">Holat</TableHead>
                  <TableHead className="font-semibold">Tayinlangan sana</TableHead>
                  <TableHead className="font-semibold">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Yuklanmoqda…
                    </TableCell>
                  </TableRow>
                ) : filteredAnalyses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Ma’lumot yo‘q
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnalyses.map((row, index) => {
                    const badgeStatus = analysisStateToBadgeStatus(enums, row.analysisStatus);
                    return (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium tabular-nums">{index + 1}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={patientFio(row)}>
                          {patientFio(row)}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate" title={row.analysisNameUz}>
                          {row.analysisNameUz}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={badgeStatus}
                            animated={false}
                            label={enums ? enumLabel(enums.analysisStates, row.analysisStatus) : String(row.analysisStatus)}
                          />
                        </TableCell>
                        <TableCell className="tabular-nums whitespace-nowrap text-sm">
                          {formatTableDateTime(row.orderCreatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => handleViewAnalysis(row.id)}
                                className="hover:bg-primary/10 rounded-lg"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Batafsil
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                disabled={row.analysisStatus === 34}
                                title={row.analysisStatus === 34 ? "Tasdiqlangan tahlilni tahrirlab bo‘lmaydi" : undefined}
                                onClick={() => handleEditAnalysis(row.id)}
                                className="hover:bg-muted rounded-lg"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Tahrirlash
                              </Button>
                            </motion.div>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
