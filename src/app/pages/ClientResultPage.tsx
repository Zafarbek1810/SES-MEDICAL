import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { motion } from "motion/react";
import { 
  Activity, 
  Download, 
  CheckCircle, 
  Calendar, 
  User, 
  Phone, 
  MapPin,
  FileText,
  Clock,
  Building2,
  Sparkles
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTableDate, formatTableDateTime } from "../../utils/tableDateFormat";

type TestResult = {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  status: "normal" | "high" | "low";
};

type ClientResult = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string;
  age: number;
  gender: "Erkak" | "Ayol";
  analysisType: string;
  analysisDate: string;
  completedDate: string;
  laboratoryName: string;
  technicianName: string;
  directorName: string;
  testResults: TestResult[];
  notes: string;
};

// Mock data
const mockResults: Record<string, ClientResult> = {
  "ORD-003": {
    id: "ORD-003",
    patientName: "Alisher Karimov",
    patientPhone: "+998 90 123 45 67",
    patientAddress: "Toshkent sh., Yunusobod tumani",
    age: 35,
    gender: "Erkak",
    analysisType: "Umumiy Qon Tahlili",
    analysisDate: "2024-03-15",
    completedDate: "2024-03-16",
    laboratoryName: "MedLab Pro - Markaziy Laboratoriya",
    technicianName: "Dr. Sardor Umarov",
    directorName: "Prof. Dilshod Rahimov",
    testResults: [
      { testName: "Gemoglobin", value: "14.5", unit: "g/dL", normalRange: "13.5-17.5", status: "normal" },
      { testName: "Eritrotsitlar", value: "4.8", unit: "×10⁶/μL", normalRange: "4.5-5.5", status: "normal" },
      { testName: "Leykotsitlar", value: "7.2", unit: "×10³/μL", normalRange: "4.5-11.0", status: "normal" },
      { testName: "Trombotsitlar", value: "250", unit: "×10³/μL", normalRange: "150-400", status: "normal" },
      { testName: "ESR", value: "12", unit: "mm/soat", normalRange: "0-15", status: "normal" },
      { testName: "Gematokrit", value: "42", unit: "%", normalRange: "40-50", status: "normal" },
    ],
    notes: "Barcha ko'rsatkichlar normal chegarada. Keyingi tekshiruv 6 oydan keyin tavsiya etiladi."
  },
  "TEST-2024-001": {
    id: "TEST-2024-001",
    patientName: "Alisher Karimov",
    patientPhone: "+998 90 123 45 67",
    patientAddress: "Toshkent sh., Yunusobod tumani",
    age: 35,
    gender: "Erkak",
    analysisType: "Umumiy Qon Tahlili",
    analysisDate: "2024-03-15",
    completedDate: "2024-03-16",
    laboratoryName: "MedLab Pro - Markaziy Laboratoriya",
    technicianName: "Dr. Sardor Umarov",
    directorName: "Prof. Dilshod Rahimov",
    testResults: [
      { testName: "Gemoglobin", value: "14.5", unit: "g/dL", normalRange: "13.5-17.5", status: "normal" },
      { testName: "Eritrotsitlar", value: "4.8", unit: "×10⁶/μL", normalRange: "4.5-5.5", status: "normal" },
      { testName: "Leykotsitlar", value: "7.2", unit: "×10³/μL", normalRange: "4.5-11.0", status: "normal" },
      { testName: "Trombotsitlar", value: "250", unit: "×10³/μL", normalRange: "150-400", status: "normal" },
      { testName: "ESR", value: "12", unit: "mm/soat", normalRange: "0-15", status: "normal" },
      { testName: "Gematokrit", value: "42", unit: "%", normalRange: "40-50", status: "normal" },
    ],
    notes: "Barcha ko'rsatkichlar normal chegarada. Keyingi tekshiruv 6 oydan keyin tavsiya etiladi."
  }
};

export default function ClientResultPage() {
  const { testId } = useParams<{ testId: string }>();
  const [result, setResult] = useState<ClientResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      if (testId && mockResults[testId]) {
        setResult(mockResults[testId]);
      }
      setLoading(false);
    }, 1000);
  }, [testId]);

  const downloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    
    // Header with logo placeholder
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("MedLab Pro", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("Sanitariya va Epidemiologiya Laboratoriyasi", 105, 25, { align: "center" });
    doc.setFontSize(10);
    doc.text(result.laboratoryName, 105, 33, { align: "center" });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Title
    doc.setFontSize(18);
    doc.text("LABORATORIYA NATIJASI", 105, 55, { align: "center" });
    
    // Patient Information
    doc.setFontSize(12);
    doc.text("BEMOR MA'LUMOTLARI", 20, 70);
    doc.setFontSize(10);
    doc.text(`Bemor: ${result.patientName}`, 20, 80);
    doc.text(`Yosh: ${result.age}`, 20, 87);
    doc.text(`Jins: ${result.gender}`, 20, 94);
    doc.text(`Telefon: ${result.patientPhone}`, 20, 101);
    doc.text(`Manzil: ${result.patientAddress}`, 20, 108);
    
    // Test Information
    doc.text(`Tahlil ID: ${result.id}`, 120, 80);
    doc.text(`Tahlil Turi: ${result.analysisType}`, 120, 87);
    doc.text(`Olingan Sana: ${result.analysisDate}`, 120, 94);
    doc.text(`Yakunlangan: ${result.completedDate}`, 120, 101);
    
    // Test Results Table
    autoTable(doc, {
      startY: 120,
      head: [['Test Nomi', "Natija", "Birlik", "Normal Chegara", "Holat"]],
      body: result.testResults.map(test => [
        test.testName,
        test.value,
        test.unit,
        test.normalRange,
        test.status === "normal" ? "Me’yorida" : test.status === "high" ? "Yuqori" : "Past"
      ]),
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    });
    
    // Notes
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    doc.setFontSize(12);
    doc.text("ESLATMALAR:", 20, finalY + 15);
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(result.notes, 170);
    doc.text(splitNotes, 20, finalY + 23);
    
    // Signatures
    const signatureY = finalY + 50;
    doc.setFontSize(10);
    doc.text(`Laborant: ${result.technicianName}`, 20, signatureY);
    doc.text(`Direktor: ${result.directorName}`, 120, signatureY);
    
    doc.text("_________________", 20, signatureY + 10);
    doc.text("_________________", 120, signatureY + 10);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Ushbu natija faqat shifokor maslahati bilan talqin qilinishi kerak.", 105, 280, { align: "center" });
    doc.text(`Chop etilgan: ${formatTableDateTime(new Date())}`, 105, 287, { align: "center" });
    
    // Save PDF
    doc.save(`Tahlil-${result.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="inline-flex items-center justify-center h-20 w-20 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-full mb-4 shadow-2xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Activity className="h-10 w-10 text-white" />
          </motion.div>
          <p className="text-lg text-muted-foreground">Natijalar yuklanmoqda...</p>
        </motion.div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl rounded-3xl">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Natija Topilmadi</CardTitle>
            <CardDescription>
              Kiritilgan ID bo'yicha natija topilmadi. Iltimos, ID raqamini tekshiring yoki laboratoriya bilan bog'laning.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center justify-center h-20 w-20 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl mb-4 shadow-2xl"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Activity className="h-10 w-10 text-white" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent">
            MedLab Pro
          </h1>
          <p className="text-muted-foreground">Laboratoriya Tahlil Natijasi</p>
        </motion.div>

        {/* Success Badge */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 px-6 py-2 text-base font-semibold shadow-lg">
            <CheckCircle className="h-5 w-5 mr-2" />
            Tahlil Bajarildi
          </Badge>
        </motion.div>

        {/* Main Content */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Patient Info Card */}
          <Card className="shadow-2xl border-border/50 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{result.patientName}</h2>
                  <p className="text-blue-100">Tahlil ID: {result.id}</p>
                </div>
                <motion.div
                  className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                >
                  <User className="h-8 w-8" />
                </motion.div>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Yosh / Jins</p>
                      <p className="font-semibold">{result.age} yosh / {result.gender}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <p className="font-semibold">{result.patientPhone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Manzil</p>
                      <p className="font-semibold">{result.patientAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tahlil Turi</p>
                      <p className="font-semibold">{result.analysisType}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Olingan Sana</p>
                      <p className="font-semibold tabular-nums">{formatTableDate(result.analysisDate)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Yakunlangan Sana</p>
                      <p className="font-semibold tabular-nums">{formatTableDateTime(result.completedDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Results Card */}
          <Card className="shadow-2xl border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 border-b">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Tahlil Natijalari</CardTitle>
                  <CardDescription>Barcha ko'rsatkichlar va ularning qiymatlari</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {result.testResults.map((test, index) => (
                  <motion.div
                    key={index}
                    className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-border hover:shadow-lg transition-all"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{test.testName}</h4>
                        <p className="text-sm text-muted-foreground">Normal chegara: {test.normalRange} {test.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                          {test.value}
                        </p>
                        <p className="text-sm text-muted-foreground">{test.unit}</p>
                      </div>
                      <div className="ml-6">
                        <Badge 
                          className={`${
                            test.status === "normal" 
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700" 
                              : test.status === "high"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700"
                              : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700"
                          } px-4 py-1 font-semibold`}
                        >
                          {test.status === "normal" ? "Me’yorida" : test.status === "high" ? "Yuqori" : "Past"}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {result.notes && (
            <Card className="shadow-2xl border-border/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Laborant Eslatmalari
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-muted-foreground leading-relaxed">{result.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Laboratory Info */}
          <Card className="shadow-2xl border-border/50 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Laboratoriya</p>
                  <p className="font-bold text-lg">{result.laboratoryName}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Laborant</p>
                  <p className="font-semibold">{result.technicianName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Laboratoriya Direktori</p>
                  <p className="font-semibold">{result.directorName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Button */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={downloadPDF}
                className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 shadow-2xl shadow-blue-500/30 dark:shadow-blue-500/20 rounded-2xl px-8 py-6 text-lg h-auto"
              >
                <Download className="h-6 w-6 mr-3" />
                PDF Sifatida Yuklab Olish
              </Button>
            </motion.div>
          </motion.div>

          {/* Footer Warning */}
          <motion.div
            className="text-center text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-6 rounded-2xl border border-amber-200 dark:border-amber-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="font-semibold mb-2">⚕️ Muhim Eslatma</p>
            <p>
              Ushbu natijalar faqat ma'lumot berish maqsadida taqdim etilgan. 
              Natijalarni to'liq talqin qilish va tavsiyalar olish uchun shifokoringiz bilan maslahatlashing.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}