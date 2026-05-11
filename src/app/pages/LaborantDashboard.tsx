import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Activity, CheckCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { analysisStateToBadgeStatus } from "../../utils/analysisStateForBadge";
import { getEnums, type EnumsData } from "../../services/enumsApi";
import { fetchOrderDetailsList, type OrderDetailListItem } from "../../services/orderDetailsListApi";

const analysisCountData = [
  { name: "Qon Tahlili", count: 12, id: "blood" },
  { name: "Siydik Tahlili", count: 8, id: "urine" },
  { name: "COVID-19", count: 6, id: "covid" },
  { name: "Kultura", count: 4, id: "culture" },
  { name: "Rentgen", count: 3, id: "xray" },
];

export default function LaborantDashboard() {
  const [items, setItems] = useState<OrderDetailListItem[]>([]);
  const [enums, setEnums] = useState<EnumsData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { inProgressCount, completedCount } = useMemo(() => {
    let i = 0;
    let c = 0;
    for (const row of items) {
      const b = analysisStateToBadgeStatus(enums, row.analysisStatus);
      if (b === "In Progress") i += 1;
      else if (b === "Completed") c += 1;
    }
    return { inProgressCount: i, completedCount: c };
  }, [items, enums]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Jami tayinlangan" value={items.length} icon={ClipboardList} iconColor="text-blue-600 dark:text-blue-400" index={0} />
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

    </div>
  );
}