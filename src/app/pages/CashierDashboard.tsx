import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Users, FileText, DollarSign, Clock, Plus, Search, Filter, TrendingUp, QrCode, Send, CalendarDays, CalendarRange, CalendarClock, Landmark, CreditCard, ArrowLeftRight } from "lucide-react";
import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ResultShareDialog } from "../components/ResultShareDialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";
import { formatTableDate } from "../../utils/tableDateFormat";
import {
  fetchOrderIncomeStatistics,
  fetchOrderMonthlyIncome,
  fetchOrderWeeklyIncome,
  type OrderIncomePoint,
  type OrderIncomeStatistics,
  type OrderIncomeStatisticsFilters,
} from "../../services/ordersApi";
import {
  fetchLaboratoriesIncomeStatistics,
  type LaboratoryIncomePoint,
} from "../../services/laboratoriesApi";

const { RangePicker } = DatePicker;

const ordersData = [
  { name: "Qon Tahlili", count: 45, id: "blood" },
  { name: "Siydik Tahlili", count: 32, id: "urine" },
  { name: "COVID-19", count: 28, id: "covid" },
  { name: "Rentgen", count: 15, id: "xray" },
  { name: "Kultura", count: 12, id: "culture" },
];

type Order = {
  id: string;
  patientName: string;
  analysisType: string;
  status: "Pending" | "In Progress" | "Completed";
  date: string;
  amount: number;
};

const mockOrders: Order[] = [
  { id: "ORD-001", patientName: "Jamshid Toshmatov", analysisType: "Qon tahlili", status: "Pending", date: "2026-03-19", amount: 1500 },
  { id: "ORD-002", patientName: "Nilufar Karimova", analysisType: "Siydik tahlili", status: "In Progress", date: "2026-03-19", amount: 800 },
  { id: "ORD-003", patientName: "Bobur Rahimov", analysisType: "COVID-19 PCR", status: "Completed", date: "2026-03-19", amount: 2500 },
  { id: "ORD-004", patientName: "Shoira Umarova", analysisType: "Rentgen", status: "Pending", date: "2026-03-18", amount: 3000 },
  { id: "ORD-005", patientName: "Rustam Aliyev", analysisType: "Qon kulturasi", status: "In Progress", date: "2026-03-18", amount: 1800 },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316"];

export default function CashierDashboard() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [incomeStats, setIncomeStats] = useState<OrderIncomeStatistics | null>(null);
  const [weeklyIncomeData, setWeeklyIncomeData] = useState<OrderIncomePoint[]>([]);
  const [monthlyIncomeData, setMonthlyIncomeData] = useState<OrderIncomePoint[]>([]);
  const [laboratoryIncomeData, setLaboratoryIncomeData] = useState<LaboratoryIncomePoint[]>([]);
  const [incomeDate, setIncomeDate] = useState<string>("");
  const [incomeFromDate, setIncomeFromDate] = useState<string>("");
  const [incomeToDate, setIncomeToDate] = useState<string>("");

  const [patientData, setPatientData] = useState({
    fullName: "",
    phone: "",
    idNumber: "",
    address: "",
  });

  const [orderData, setOrderData] = useState({
    patientName: "",
    analysisTypes: [] as string[],
  });

  const handleCreatePatient = () => {
    toast.success("Bemor ro‘yxatdan o‘tkazildi!", {
      description: `${patientData.fullName} tizimga qo‘shildi.`
    });
    setPatientData({ fullName: "", phone: "", idNumber: "", address: "" });
    setIsPatientDialogOpen(false);
  };

  const handleCreateOrder = () => {
    const newOrder: Order = {
      id: `ORD-${String(orders.length + 1).padStart(3, "0")}`,
      patientName: orderData.patientName,
      analysisType: orderData.analysisTypes.join(", "),
      status: "Pending",
      date: new Date().toISOString().split("T")[0],
      amount: Math.floor(Math.random() * 3000) + 500,
    };
    setOrders([newOrder, ...orders]);
    toast.success("Buyurtma yaratildi!", {
      description: `${newOrder.id} buyurtmasi yaratildi va kutilmoqda.`
    });
    setOrderData({ patientName: "", analysisTypes: [] });
    setIsOrderDialogOpen(false);
  };

  const filteredOrders = orders.filter((order) =>
    order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.analysisType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    let cancelled = false;
    const filters: OrderIncomeStatisticsFilters = {
      ...(incomeDate ? { date: incomeDate } : {}),
      ...(incomeFromDate ? { fromDate: incomeFromDate } : {}),
      ...(incomeToDate ? { toDate: incomeToDate } : {}),
    };
    void Promise.all([
      fetchOrderIncomeStatistics(filters),
      fetchOrderWeeklyIncome(filters),
      fetchOrderMonthlyIncome(filters),
      fetchLaboratoriesIncomeStatistics(filters),
    ])
      .then(([stats, weekly, monthly, laboratory]) => {
        if (!cancelled) {
          setIncomeStats(stats);
          setWeeklyIncomeData(weekly);
          setMonthlyIncomeData(monthly);
          setLaboratoryIncomeData(laboratory);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setIncomeStats(null);
          setWeeklyIncomeData([]);
          setMonthlyIncomeData([]);
          setLaboratoryIncomeData([]);
          toast.error(e instanceof Error ? e.message : "Daromad statistikasi yuklanmadi");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [incomeDate, incomeFromDate, incomeToDate]);

  const money = (v: number | null | undefined): string => `${Number(v ?? 0).toLocaleString("uz-UZ")} so'm`;

  const statCards = useMemo(
    () => [
      {
        title: "Kunlik daromad",
        value: money(incomeStats?.dailyAmount),
        icon: CalendarDays,
        iconColor: "text-sky-600 dark:text-sky-400",
      },
      {
        title: "Haftalik daromad",
        value: money(incomeStats?.weeklyAmount),
        icon: CalendarRange,
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Oylik daromad",
        value: money(incomeStats?.monthlyAmount),
        icon: CalendarClock,
        iconColor: "text-violet-600 dark:text-violet-400",
      },
      {
        title: "Yillik daromad",
        value: money(incomeStats?.yearlyAmount),
        icon: TrendingUp,
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Jami daromad",
        value: money(incomeStats?.totalAmount),
        icon: DollarSign,
        iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
      },
      {
        title: "Naqd to'lov",
        value: money(incomeStats?.cashAmount),
        icon: Landmark,
        iconColor: "text-amber-600 dark:text-amber-400",
      },
      {
        title: "Karta to'lovi",
        value: money(incomeStats?.cardAmount),
        icon: CreditCard,
        iconColor: "text-cyan-600 dark:text-cyan-400",
      },
      {
        title: "O'tkazma to'lovi",
        value: money(incomeStats?.transferAmount),
        icon: ArrowLeftRight,
        iconColor: "text-rose-600 dark:text-rose-400",
      },
    ],
    [incomeStats]
  );

  const handleIncomeDateChange = (value: Dayjs | null) => {
    if (value) {
      setIncomeDate(value.format("YYYY-MM-DD"));
      setIncomeFromDate("");
      setIncomeToDate("");
      return;
    }
    setIncomeDate("");
  };

  const handleIncomeRangeChange = (values: [Dayjs | null, Dayjs | null] | null) => {
    if (values && values[0] && values[1]) {
      setIncomeFromDate(values[0].format("YYYY-MM-DD"));
      setIncomeToDate(values[1].format("YYYY-MM-DD"));
      setIncomeDate("");
      return;
    }
    setIncomeFromDate("");
    setIncomeToDate("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <DatePicker
          value={incomeDate ? dayjs(incomeDate, "YYYY-MM-DD") : null}
          onChange={handleIncomeDateChange}
          format="DD-MM-YYYY"
          allowClear
          placeholder="Sana (date)"
          className="w-full md:w-[180px]"
        />
        <RangePicker
          value={
            incomeFromDate && incomeToDate
              ? [dayjs(incomeFromDate, "YYYY-MM-DD"), dayjs(incomeToDate, "YYYY-MM-DD")]
              : null
          }
          onChange={(vals) => handleIncomeRangeChange((vals as [Dayjs | null, Dayjs | null] | null) ?? null)}
          format="DD-MM-YYYY"
          allowClear
          className="w-full md:w-[320px]"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} iconColor={card.iconColor} index={idx} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-border hover:shadow-xl transition-shadow duration-300 rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>Haftalik daromad (ustunli)</CardTitle>
              </div>
              <CardDescription>Joriy hafta uchun daromad statistikasi</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyIncomeData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-green-200 dark:stroke-green-800" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="name"
                    className="text-slate-700 dark:text-slate-300"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
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
                    itemStyle={{ color: "#10b981" }}
                  />
                  <Bar
                    dataKey="income"
                    fill="url(#barGradient)"
                    radius={[12, 12, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border hover:shadow-xl transition-shadow duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle>Tahlil holati taqsimoti</CardTitle>
              <CardDescription>Barcha tahlillar holati bo‘yicha</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={laboratoryIncomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {laboratoryIncomeData.map((entry, index) => (
                      <Cell key={entry.id} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border hover:shadow-xl transition-shadow duration-300 rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <CardTitle>Oylik daromad</CardTitle>
              </div>
              <CardDescription>Joriy oy uchun daromad statistikasi</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyIncomeData}>
                  <defs>
                    <linearGradient id="cashierMonthlyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cashierMonthlyAreaGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      

      {/* Result Share Dialog */}
      {selectedOrder && (
        <ResultShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setSelectedOrder(null);
          }}
          testId={selectedOrder.id}
          patientName={selectedOrder.patientName}
          patientPhone="+998 90 123 45 67"
        />
      )}
    </div>
  );
}