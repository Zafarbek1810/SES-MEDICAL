import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Save, CheckCircle, Info } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";

export default function AnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"Pending" | "In Progress" | "Completed">("Pending");
  const [results, setResults] = useState({
    hemoglobin: "",
    wbc: "",
    rbc: "",
    platelets: "",
    notes: "",
  });

  const handleSaveResults = () => {
    setStatus("In Progress");
    toast.success("Natijalar saqlandi!", {
      description: "Holat “Jarayonda” ga o‘zgartirildi."
    });
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/laborant")}
              className="rounded-xl hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <div>
            <motion.h1
              className="text-2xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              Tahlil tafsilotlari
            </motion.h1>
            <p className="text-sm text-muted-foreground">Tahlil ID: {id}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Patient Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Bemor haqida ma’lumot
            </CardTitle>
            <CardDescription>Bemor bo‘yicha asosiy ma’lumotlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: "Bemor ismi", value: "Jamshid Toshmatov" },
                { label: "Bemor ID", value: "PT-12345" },
                { label: "Yosh", value: "45 yosh" },
                { label: "Jins", value: "Erkak" },
                { label: "Tahlil turi", value: "Qon tahlili (CBC)" },
                { label: "Tayinlangan sana", value: "19.03.2026" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="p-4 bg-muted/50 rounded-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                  <p className="font-semibold">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-green-600 dark:text-green-400" />
              Test natijalarini kiriting
            </CardTitle>
            <CardDescription>Tahlil natijalari va topilmalarni kiriting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: "hemoglobin", label: "Gemoglobin (g/dL)", placeholder: "14,5", range: "13,5–17,5 g/dL (erkak)", field: "hemoglobin" },
                  { id: "wbc", label: "Oq qon tanachalari (×10³/µL)", placeholder: "7,5", range: "4,5–11,0 ×10³/µL", field: "wbc" },
                  { id: "rbc", label: "Qizil qon tanachalari (×10⁶/µL)", placeholder: "5,2", range: "4,5–5,9 ×10⁶/µL (erkak)", field: "rbc" },
                  { id: "platelets", label: "Trombotsitlar (×10³/µL)", placeholder: "250", range: "150–400 ×10³/µL", field: "platelets" },
                ].map((input, index) => (
                  <motion.div
                    key={input.id}
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                  >
                    <Label htmlFor={input.id} className="font-semibold">{input.label}</Label>
                    <Input
                      id={input.id}
                      type="number"
                      step="0.1"
                      placeholder={input.placeholder}
                      value={results[input.field as keyof typeof results]}
                      onChange={(e) => setResults({ ...results, [input.field]: e.target.value })}
                      className="rounded-xl h-12 border-border focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Me’yoriy chegara: {input.range}
                    </p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Label htmlFor="notes" className="font-semibold">Qo‘shimcha eslatmalar</Label>
                <Textarea
                  id="notes"
                  placeholder="Qo‘shimcha kuzatish yoki eslatmalarni kiriting..."
                  rows={4}
                  value={results.notes}
                  onChange={(e) => setResults({ ...results, notes: e.target.value })}
                  className="rounded-xl border-border focus:border-primary resize-none"
                />
              </motion.div>

              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button 
                    onClick={handleSaveResults} 
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 rounded-xl h-12"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Natijalarni saqlash
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/laborant")}
                    className="rounded-xl h-12 px-8"
                  >
                    Bekor qilish
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Holat haqida</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Natijalarni saqlaganingizda holat avtomatik ravishda “Jarayonda” bo‘ladi. 
                  Laboratoriya direktori tasdiqlagach, holat “Bajarildi” ga o‘tadi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
