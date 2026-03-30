import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ClipboardList, Activity, CheckCircle, Search, Filter, Eye, TrendingUp } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatTableDate } from "../../utils/tableDateFormat";

const analysisCountData = [
  { name: "Qon Tahlili", count: 12, id: "blood" },
  { name: "Siydik Tahlili", count: 8, id: "urine" },
  { name: "COVID-19", count: 6, id: "covid" },
  { name: "Kultura", count: 4, id: "culture" },
  { name: "Rentgen", count: 3, id: "xray" },
];

type Analysis = {
  id: string;
  patient: string;
  analysisType: string;
  status: "Pending" | "In Progress" | "Completed";
  assignedDate: string;
};

const mockAnalyses: Analysis[] = [
  { id: "AN-001", patient: "Jamshid Toshmatov", analysisType: "Qon tahlili", status: "Pending", assignedDate: "2026-03-19" },
  { id: "AN-002", patient: "Nilufar Karimova", analysisType: "Siydik tahlili", status: "In Progress", assignedDate: "2026-03-19" },
  { id: "AN-003", patient: "Bobur Rahimov", analysisType: "COVID-19 PCR", status: "In Progress", assignedDate: "2026-03-19" },
  { id: "AN-004", patient: "Shoira Umarova", analysisType: "Rentgen", status: "Pending", assignedDate: "2026-03-18" },
  { id: "AN-005", patient: "Rustam Aliyev", analysisType: "Qon kulturasi", status: "Completed", assignedDate: "2026-03-18" },
  { id: "AN-006", patient: "Gulnora Saidova", analysisType: "Najas tahlili", status: "In Progress", assignedDate: "2026-03-18" },
  { id: "AN-007", patient: "Oybek Normatov", analysisType: "Qon tahlili", status: "Pending", assignedDate: "2026-03-17" },
  { id: "AN-008", patient: "Zarina Mirzaeva", analysisType: "Siydik tahlili", status: "Completed", assignedDate: "2026-03-17" },
];

export default function LaborantDashboard() {
  const [analyses] = useState<Analysis[]>(mockAnalyses);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const pendingCount = analyses.filter((a) => a.status === "Pending").length;
  const inProgressCount = analyses.filter((a) => a.status === "In Progress").length;
  const completedCount = analyses.filter((a) => a.status === "Completed").length;

  const filteredAnalyses = analyses.filter((analysis) =>
    analysis.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analysis.analysisType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analysis.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewAnalysis = (id: string) => {
    navigate(`/laborant/analysis/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Jami tayinlangan" value={analyses.length} icon={ClipboardList} iconColor="text-blue-600 dark:text-blue-400" index={0} />
        <StatCard title="Jarayonda" value={inProgressCount} icon={Activity} iconColor="text-orange-600 dark:text-orange-400" index={1} />
        <StatCard title="Bajarilgan" value={completedCount} icon={CheckCircle} iconColor="text-green-600 dark:text-green-400" index={2} />
      </div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border hover:shadow-xl transition-shadow duration-300 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle>Tahlil samaradorligi</CardTitle>
            </div>
            <CardDescription>Vaqt o‘tishi bilan tahlil bajarilishini kuzatish</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="monthly" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-4 rounded-xl">
                <TabsTrigger value="daily" className="rounded-lg">Kunlik</TabsTrigger>
                <TabsTrigger value="weekly" className="rounded-lg">Haftalik</TabsTrigger>
                <TabsTrigger value="monthly" className="rounded-lg">Oylik</TabsTrigger>
                <TabsTrigger value="yearly" className="rounded-lg">Yillik</TabsTrigger>
              </TabsList>
              <TabsContent value="monthly" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysisCountData}>
                    <defs>
                      <linearGradient id="analysisGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-purple-200 dark:stroke-purple-800" strokeOpacity={0.5} />
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
                      itemStyle={{ color: "#a855f7" }}
                    />
                    <Bar dataKey="count" fill="url(#analysisGradient)" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="daily">
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Kunlik tahlil ma’lumotlari (vizualizatsiya)
                </div>
              </TabsContent>
              <TabsContent value="weekly">
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Haftalik tahlil ma’lumotlari (vizualizatsiya)
                </div>
              </TabsContent>
              <TabsContent value="yearly">
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Yillik tahlil ma’lumotlari (vizualizatsiya)
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Analysis List Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
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
                  {filteredAnalyses.map((analysis, index) => (
                    <motion.tr
                      key={analysis.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium tabular-nums">{index + 1}</TableCell>
                      <TableCell>{analysis.patient}</TableCell>
                      <TableCell>{analysis.analysisType}</TableCell>
                      <TableCell>
                        <StatusBadge status={analysis.status} />
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">{formatTableDate(analysis.assignedDate)}</TableCell>
                      <TableCell>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAnalysis(analysis.id)}
                            className="hover:bg-primary/10 rounded-lg"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Batafsil
                          </Button>
                        </motion.div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}