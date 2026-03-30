import React, { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Clock, TrendingUp, Search, Filter } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { formatTableDate } from "../../utils/tableDateFormat";

type Analysis = {
  id: string;
  patient: string;
  analysisType: string;
  status: "Pending" | "In Progress" | "Completed";
  technician: string;
  submittedDate: string;
};

const mockAnalyses: Analysis[] = [
  { id: "AN-001", patient: "Jamshid Toshmatov", analysisType: "Qon tahlili", status: "In Progress", technician: "Dr. Malika Rahimova", submittedDate: "2026-03-19" },
  { id: "AN-002", patient: "Nilufar Karimova", analysisType: "Siydik tahlili", status: "In Progress", technician: "Dr. Sardor Umarov", submittedDate: "2026-03-19" },
  { id: "AN-003", patient: "Bobur Rahimov", analysisType: "COVID-19 PCR", status: "In Progress", technician: "Dr. Malika Rahimova", submittedDate: "2026-03-19" },
  { id: "AN-004", patient: "Shoira Umarova", analysisType: "Rentgen", status: "Pending", technician: "Dr. Javlonbek Toshmatov", submittedDate: "2026-03-18" },
  { id: "AN-005", patient: "Rustam Aliyev", analysisType: "Qon kulturasi", status: "Completed", technician: "Dr. Sardor Umarov", submittedDate: "2026-03-18" },
  { id: "AN-006", patient: "Gulnora Saidova", analysisType: "Najas tahlili", status: "In Progress", technician: "Dr. Malika Rahimova", submittedDate: "2026-03-18" },
  { id: "AN-007", patient: "Oybek Normatov", analysisType: "Qon tahlili", status: "Completed", technician: "Dr. Javlonbek Toshmatov", submittedDate: "2026-03-17" },
  { id: "AN-008", patient: "Zarina Mirzaeva", analysisType: "Siydik tahlili", status: "Completed", technician: "Dr. Sardor Umarov", submittedDate: "2026-03-17" },
];

const statusData = [
  { name: "Kutilmoqda", value: 15, color: "#f59e0b", id: "pending" },
  { name: "Jarayonda", value: 28, color: "#3b82f6", id: "inprogress" },
  { name: "Bajarildi", value: 42, color: "#10b981", id: "completed" },
];

const performanceData = [
  { name: "Dr. Malika Rahimova", approved: 32, pending: 5, id: "sarah" },
  { name: "Dr. Sardor Umarov", approved: 28, pending: 3, id: "michael" },
  { name: "Dr. Javlonbek Toshmatov", approved: 24, pending: 7, id: "john" },
];

export default function LabDirectorDashboard() {
  const [analyses, setAnalyses] = useState<Analysis[]>(mockAnalyses);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pendingCount = analyses.filter((a) => a.status === "Pending").length;
  const inProgressCount = analyses.filter((a) => a.status === "In Progress").length;
  const completedCount = analyses.filter((a) => a.status === "Completed").length;
  const totalCount = analyses.length;
  const approvalRate = Math.round((completedCount / totalCount) * 100);

  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch =
      analysis.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.analysisType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || analysis.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (analysis: Analysis) => {
    setSelectedAnalysis(analysis);
    setIsDialogOpen(true);
  };

  const confirmApproval = () => {
    if (selectedAnalysis) {
      setAnalyses(
        analyses.map((a) =>
          a.id === selectedAnalysis.id ? { ...a, status: "Completed" as const } : a
        )
      );
      toast.success(`${selectedAnalysis.id} tahlili tasdiqlandi va “Bajarildi” holatiga o‘tkazildi.`);
      setIsDialogOpen(false);
      setSelectedAnalysis(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Jami tahlillar" value={totalCount} icon={TrendingUp} iconColor="text-blue-600" />
        <StatCard title="Ko‘rib chiqilmoqda" value={inProgressCount} icon={Clock} iconColor="text-orange-600" />
        <StatCard title="Tasdiqlangan" value={completedCount} icon={CheckCircle} iconColor="text-green-600" />
        <StatCard title="Tasdiqlash foizi" value={`${approvalRate}%`} icon={TrendingUp} iconColor="text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tahlil holati taqsimoti</CardTitle>
            <CardDescription>Barcha tahlillar holati bo‘yicha</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laborantlar samaradorligi</CardTitle>
            <CardDescription>Laborant bo‘yicha tasdiqlangan va kutilayotgan tahlillar</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <defs>
                  <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200 dark:stroke-blue-800" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  className="text-slate-700 dark:text-slate-300"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-slate-700 dark:text-slate-300"
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))", 
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar name="Tasdiqlangan" dataKey="approved" fill="url(#approvedGradient)" radius={[8, 8, 0, 0]} />
                <Bar name="Kutilmoqda" dataKey="pending" fill="url(#pendingGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analyses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ko‘rib chiqiladigan tahlillar</CardTitle>
              <CardDescription>Laboratoriya tahlillarini ko‘rib chiqish va tasdiqlash</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Holat bo‘yicha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha holatlar</SelectItem>
                  <SelectItem value="Pending">Kutilmoqda</SelectItem>
                  <SelectItem value="In Progress">Jarayonda</SelectItem>
                  <SelectItem value="Completed">Bajarildi</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tahlillarni qidirish..."
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
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
                <TableHead>Laborant</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalyses.map((analysis, idx) => (
                <TableRow key={analysis.id}>
                  <TableCell className="font-medium tabular-nums">{idx + 1}</TableCell>
                  <TableCell>{analysis.patient}</TableCell>
                  <TableCell>{analysis.analysisType}</TableCell>
                  <TableCell>{analysis.technician}</TableCell>
                  <TableCell>
                    <StatusBadge status={analysis.status} />
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">{formatTableDate(analysis.submittedDate)}</TableCell>
                  <TableCell>
                    {analysis.status === "In Progress" && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(analysis)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Tasdiqlash
                      </Button>
                    )}
                    {analysis.status === "Completed" && (
                      <span className="text-sm text-gray-500">Tasdiqlangan</span>
                    )}
                    {analysis.status === "Pending" && (
                      <span className="text-sm text-gray-500">Topshirilmagan</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tahlilni tasdiqlash</DialogTitle>
            <DialogDescription>
              Ushbu tahlilni tasdiqlaysizmi? Holat “Bajarildi” ga o‘zgaradi.
            </DialogDescription>
          </DialogHeader>
          {selectedAnalysis && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tahlil ID</p>
                  <p className="font-medium">{selectedAnalysis.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bemor</p>
                  <p className="font-medium">{selectedAnalysis.patient}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tahlil turi</p>
                  <p className="font-medium">{selectedAnalysis.analysisType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Laborant</p>
                  <p className="font-medium">{selectedAnalysis.technician}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={confirmApproval}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tasdiqlash
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Bekor qilish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}