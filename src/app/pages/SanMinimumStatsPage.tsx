import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Select } from "antd";
import dayjs from "dayjs";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  fetchSanMinimumMonthlyRegistrations,
  fetchSanMinimumRegistrationStatistics,
  fetchSanMinimumStatistics,
  type SanMinimumMonthlyRegistrations,
  type SanMinimumPeriodStatistics,
  type SanMinimumRegistrationStatistics,
  type SanMinimumStatisticsParams,
} from "../../services/sanMinimumsApi";

const emptyRegStats = (): SanMinimumRegistrationStatistics => ({
  weeklyCount: 0,
  monthlyCount: 0,
  yearlyCount: 0,
  totalCount: 0,
});

const emptyPeriodStats = (): SanMinimumPeriodStatistics => ({
  oneDayCount: 0,
  twoDayCount: 0,
  threeDayCount: 0,
  completedCount: 0,
});

const MONTH_NAMES_UZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
] as const;

function buildStatisticsParams(yearStr: string, monthStr: string): SanMinimumStatisticsParams | undefined {
  const y = yearStr.trim() ? Number(yearStr) : undefined;
  const m = monthStr.trim() ? Number(monthStr) : undefined;
  const out: SanMinimumStatisticsParams = {};
  if (y !== undefined && Number.isFinite(y)) {
    const yi = Math.trunc(y);
    if (yi >= 1900 && yi <= 2100) out.year = yi;
  }
  if (m !== undefined && Number.isFinite(m)) {
    const mi = Math.trunc(m);
    if (mi >= 1 && mi <= 12) out.month = mi;
  }
  if (out.year === undefined && out.month === undefined) return undefined;
  return out;
}

/**
 * SAN_MINIMUM roli: ro‘yxatga olish + davr bo‘yicha kun/tugallash statistikasi.
 */
export default function SanMinimumStatsPage() {
  const [loadingReg, setLoadingReg] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [stats, setStats] = useState<SanMinimumRegistrationStatistics>(emptyRegStats);
  const [periodStats, setPeriodStats] = useState<SanMinimumPeriodStatistics>(emptyPeriodStats);
  const [monthlyReg, setMonthlyReg] = useState<SanMinimumMonthlyRegistrations | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  const [filterYear, setFilterYear] = useState(() => String(dayjs().year()));
  const [filterMonth, setFilterMonth] = useState(() => String(dayjs().month() + 1));

  const monthOptions = useMemo(
    () => MONTH_NAMES_UZ.map((label, i) => ({ value: String(i + 1), label: `${label}` })),
    [],
  );

  const yearOptions = useMemo(() => {
    const cy = dayjs().year();
    const out: { value: string; label: string }[] = [];
    for (let y = cy + 1; y >= cy - 15; y -= 1) {
      out.push({ value: String(y), label: String(y) });
    }
    return out;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingReg(true);
    void (async () => {
      try {
        const data = await fetchSanMinimumRegistrationStatistics();
        if (!cancelled) setStats(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Statistika yuklanmadi");
        if (!cancelled) setStats(emptyRegStats());
      } finally {
        if (!cancelled) setLoadingReg(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPeriod(true);
    const params = buildStatisticsParams(filterYear, filterMonth);
    void (async () => {
      try {
        const data = await fetchSanMinimumStatistics(params);
        if (!cancelled) setPeriodStats(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Davr statistikasi yuklanmadi");
        if (!cancelled) setPeriodStats(emptyPeriodStats());
      } finally {
        if (!cancelled) setLoadingPeriod(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterYear, filterMonth]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMonthly(true);
    const y = filterYear.trim() ? Number(filterYear) : dayjs().year();
    const yi = Math.trunc(Number.isFinite(y) ? y : dayjs().year());
    void (async () => {
      try {
        const data = await fetchSanMinimumMonthlyRegistrations(yi);
        if (!cancelled) setMonthlyReg(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Oylik diagramma yuklanmadi");
        if (!cancelled) setMonthlyReg(null);
      } finally {
        if (!cancelled) setLoadingMonthly(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterYear]);

  const monthlyChartData = useMemo(() => {
    const rows = monthlyReg?.monthlyRegistrations ?? [];
    return rows.map((p) => ({
      name: MONTH_NAMES_UZ[p.month - 1] ?? `${p.month}`,
      count: p.count,
    }));
  }, [monthlyReg]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Statistika</h1>
          <p className="text-sm text-muted-foreground">Ro‘yxatga olishlar va kunlar bo‘yicha ko‘rsatkichlar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex min-w-[100px] flex-col gap-1">
            <span className="text-xs text-muted-foreground">Yil</span>
            <Select
              allowClear
              className="w-full min-w-[120px]"
              placeholder="Yil"
              value={filterYear || undefined}
              onChange={(v) => setFilterYear(v ?? "")}
              options={yearOptions}
              showSearch
              optionFilterProp="label"
            />
          </div>
          <div className="flex min-w-[140px] flex-col gap-1">
            <span className="text-xs text-muted-foreground">Oy</span>
            <Select
              allowClear
              className="w-full min-w-[160px]"
              placeholder="Oy"
              value={filterMonth || undefined}
              onChange={(v) => setFilterMonth(v ?? "")}
              options={monthOptions}
              showSearch
              optionFilterProp="label"
            />
          </div>
        </div>
      </div>

      {loadingReg ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Jami ro‘yxatga olishlar"
            value={stats.totalCount}
            icon={Users}
            iconColor="text-violet-600 dark:text-violet-400"
            index={0}
          />
          <StatCard
            title="Haftalik"
            value={stats.weeklyCount}
            icon={CalendarRange}
            iconColor="text-sky-600 dark:text-sky-400"
            index={1}
          />
          <StatCard
            title="Oylik"
            value={stats.monthlyCount}
            icon={CalendarDays}
            iconColor="text-emerald-600 dark:text-emerald-400"
            index={2}
          />
          <StatCard
            title="Yillik"
            value={stats.yearlyCount}
            icon={Calendar}
            iconColor="text-amber-600 dark:text-amber-400"
            index={3}
          />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Tanlangan oy va yil bo‘yicha</h2>
        {loadingPeriod ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="1-kun"
              value={periodStats.oneDayCount}
              icon={CalendarRange}
              iconColor="text-indigo-600 dark:text-indigo-400"
              index={0}
            />
            <StatCard
              title="2-kun"
              value={periodStats.twoDayCount}
              icon={Calendar}
              iconColor="text-rose-600 dark:text-rose-400"
              index={1}
            />
            <StatCard
              title="3-kun"
              value={periodStats.threeDayCount}
              icon={CalendarDays}
              iconColor="text-teal-600 dark:text-teal-400"
              index={2}
            />
            <StatCard
              title="Kurs tugallangan"
              value={periodStats.completedCount}
              icon={CheckCircle2}
              iconColor="text-green-600 dark:text-green-400"
              index={3}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-border hover:shadow-xl transition-shadow duration-300 rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <CardTitle>Oylik ro‘yxatga olishlar</CardTitle>
              </div>
              <CardDescription>
                {monthlyReg != null
                  ? `${monthlyReg.year} yil bo‘yicha jami ${monthlyReg.totalCount} ta ro‘yxatga olish`
                  : "Yil bo‘yicha oylar kesimida sonlar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMonthly ? (
                <p className="text-sm text-muted-foreground py-12 text-center">Yuklanmoqda…</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyChartData}>
                    <defs>
                      <linearGradient id="sanMinMonthlyRegGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-violet-200 dark:stroke-violet-900" strokeOpacity={0.5} />
                    <XAxis dataKey="name" className="text-slate-700 dark:text-slate-300" tick={{ fill: "currentColor", fontSize: 11 }} />
                    <YAxis className="text-slate-700 dark:text-slate-300" tick={{ fill: "currentColor" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#sanMinMonthlyRegGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <p>
            Batafsil ro‘yxat va filtrlash uchun sidebar orqali <strong>San minimum</strong> (yoki{" "}
            <strong>Ro‘yxat</strong>) bandiga o‘ting.
          </p>
        </div>
      </div>
    </div>
  );
}
