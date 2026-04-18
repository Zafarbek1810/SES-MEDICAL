import React from "react";
import { Clock, TrendingUp, CheckCircle } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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
  const pendingCount = 15;
  const inProgressCount = 28;
  const completedCount = 42;
  const totalCount = pendingCount + inProgressCount + completedCount;
  const approvalRate = Math.round((completedCount / totalCount) * 100);

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
    </div>
  );
}