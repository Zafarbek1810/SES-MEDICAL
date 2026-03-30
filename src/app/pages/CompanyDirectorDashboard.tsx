import { motion } from "motion/react";
import React from "react";
import { TrendingUp, DollarSign, Activity, Users } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const revenueData = [
  { month: "Yan", revenue: 45000, analyses: 320, id: "jan" },
  { month: "Fev", revenue: 52000, analyses: 380, id: "feb" },
  { month: "Mar", revenue: 48000, analyses: 350, id: "mar" },
  { month: "Apr", revenue: 61000, analyses: 420, id: "apr" },
  { month: "May", revenue: 55000, analyses: 390, id: "may" },
  { month: "Iyun", revenue: 67000, analyses: 460, id: "jun" },
  { month: "Iyul", revenue: 72000, analyses: 510, id: "jul" },
  { month: "Avq", revenue: 68000, analyses: 480, id: "aug" },
  { month: "Sen", revenue: 75000, analyses: 530, id: "sep" },
  { month: "Okt", revenue: 82000, analyses: 580, id: "oct" },
  { month: "Noy", revenue: 78000, analyses: 550, id: "nov" },
  { month: "Dek", revenue: 85000, analyses: 600, id: "dec" },
];

const analysisTypeData = [
  { name: "Qon tahlili", count: 1240, revenue: 186000, id: "blood" },
  { name: "Siydik tahlili", count: 980, revenue: 78400, id: "urine" },
  { name: "COVID-19", count: 760, revenue: 190000, id: "covid" },
  { name: "Rentgen", count: 450, revenue: 135000, id: "xray" },
  { name: "Kultura", count: 320, revenue: 57600, id: "culture" },
];

const growthData = [
  { quarter: "2025 I chorak", growth: 12, id: "q1-2025" },
  { quarter: "2025 II chorak", growth: 15, id: "q2-2025" },
  { quarter: "2025 III chorak", growth: 18, id: "q3-2025" },
  { quarter: "2025 IV chorak", growth: 22, id: "q4-2025" },
  { quarter: "2026 I chorak", growth: 25, id: "q1-2026" },
];

export default function CompanyDirectorDashboard() {
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalAnalyses = revenueData.reduce((sum, item) => sum + item.analyses, 0);
  const avgRevenuePerAnalysis = Math.round(totalRevenue / totalAnalyses);
  const currentMonthGrowth = 25;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Jami daromad (yil boshidan)"
          value={`${(totalRevenue / 1000).toFixed(0)} ming so‘m`}
          icon={DollarSign}
          iconColor="text-green-600"
        />
        <StatCard
          title="Jami tahlillar (yil boshidan)"
          value={totalAnalyses.toLocaleString()}
          icon={Activity}
          iconColor="text-blue-600"
        />
        <StatCard
          title="O‘rtacha daromad/tahlil"
          value={`${avgRevenuePerAnalysis.toLocaleString()} so‘m`}
          icon={TrendingUp}
          iconColor="text-purple-600"
        />
        <StatCard
          title="O‘sish sur’ati"
          value={`+${currentMonthGrowth}%`}
          icon={TrendingUp}
          iconColor="text-orange-600"
        />
      </div>

      {/* Main Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daromad va tahlillar tendentsiyasi</CardTitle>
          <CardDescription>Oylik daromad va tahlillar soni</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="revenue">Daromad</TabsTrigger>
              <TabsTrigger value="analyses">Tahlillar</TabsTrigger>
              <TabsTrigger value="combined">Birgalikda</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200 dark:stroke-blue-800" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="month" 
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
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="analyses">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200 dark:stroke-blue-800" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="month" 
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
                  <Bar dataKey="analyses" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="combined">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200 dark:stroke-blue-800" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    className="text-slate-700 dark:text-slate-300"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    className="text-slate-700 dark:text-slate-300"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
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
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981" }}
                    name="Daromad (so‘m)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="analyses"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                    name="Tahlillar"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tahlil turi bo‘yicha samaradorlik</CardTitle>
            <CardDescription>Tahlil turiga ko‘ra daromad</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysisTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200 dark:stroke-blue-800" strokeOpacity={0.5} />
                <XAxis 
                  type="number" 
                  className="text-slate-700 dark:text-slate-300"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  className="text-slate-700 dark:text-slate-300"
                  tick={{ fill: 'currentColor' }}
                  width={100} 
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))", 
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                  }}
                  formatter={(value: number) => `${value.toLocaleString()} so‘m`}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Choraklik o‘sish</CardTitle>
            <CardDescription>Yildan-yilga o‘sish foizi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200 dark:stroke-blue-800" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="quarter" 
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
                  formatter={(value: number) => `${value}%`}
                />
                <Area
                  type="monotone"
                  dataKey="growth"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGrowth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">Eng ko‘p qo‘llanilgan tahlil</p>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">Qon tahlili</p>
            <p className="text-sm text-blue-700 mt-1">Shu yil 1 240 ta tekshiruv</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-900">Eng yuqori daromad</p>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">COVID-19</p>
            <p className="text-sm text-green-700 mt-1">190 000 so‘m jami daromad</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-900">Bemorlar qoniqishi</p>
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">97,5%</p>
            <p className="text-sm text-purple-700 mt-1">2 450 ta sharh asosida</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}