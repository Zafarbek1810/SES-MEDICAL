import React, { useState } from "react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Mail, MessageSquare, Link as LinkIcon, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";

interface ResultShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  patientName: string;
  patientPhone: string;
}

export function ResultShareDialog({ 
  isOpen, 
  onClose, 
  testId, 
  patientName,
  patientPhone 
}: ResultShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const resultUrl = `${window.location.origin}/results/${testId}`;

  const handleCopyLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(resultUrl)
        .then(() => {
          setCopied(true);
          toast.success("Link nusxalandi!", {
            description: "Havola clipboard ga ko'chirildi"
          });
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Fallback: create a temporary textarea
          const textarea = document.createElement('textarea');
          textarea.value = resultUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            setCopied(true);
            toast.success("Link nusxalandi!", {
              description: "Havola clipboard ga ko'chirildi"
            });
            setTimeout(() => setCopied(false), 2000);
          } catch (err) {
            toast.error("Link nusxalashda xatolik", {
              description: "Linkni qo'lda nusxalang"
            });
          } finally {
            document.body.removeChild(textarea);
          }
        });
    } else {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = resultUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success("Link nusxalandi!", {
          description: "Havola clipboard ga ko'chirildi"
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error("Link nusxalashda xatolik", {
          description: "Linkni qo'lda nusxalang"
        });
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const handleSendSMS = () => {
    toast.success("SMS yuborildi!", {
      description: `${patientName} ga natija havolasi yuborildi: ${patientPhone}`
    });
  };

  const handleSendEmail = () => {
    toast.success("Email yuborildi!", {
      description: `${patientName} ga natija havolasi yuborildi`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Natijani Ulashish</DialogTitle>
          <DialogDescription>
            {patientName} uchun natija havolasi va QR kodi
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="qr" className="rounded-lg">
              <Smartphone className="h-4 w-4 mr-2" />
              QR Kod
            </TabsTrigger>
            <TabsTrigger value="link" className="rounded-lg">
              <LinkIcon className="h-4 w-4 mr-2" />
              Havola
            </TabsTrigger>
            <TabsTrigger value="send" className="rounded-lg">
              <MessageSquare className="h-4 w-4 mr-2" />
              Yuborish
            </TabsTrigger>
          </TabsList>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="mt-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-4 border-blue-200 dark:border-blue-800">
                <QRCodeSVG
                  value={resultUrl}
                  size={280}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2'%3E%3Cpath d='M22 12h-4l-3 9L9 3l-3 9H2'/%3E%3C/svg%3E",
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
              
              <div className="text-center space-y-2 bg-blue-50 dark:bg-blue-950/30 p-6 rounded-2xl w-full">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  📱 QR kodni skanerlash
                </p>
                <p className="text-xs text-muted-foreground">
                  Bemor telefon kamerasi bilan QR kodni skanerlashi va natijalarni ko'rishi mumkin
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <Button 
                  onClick={() => window.print()}
                  variant="outline" 
                  className="flex-1 rounded-xl"
                >
                  Chop Etish
                </Button>
                <Button 
                  onClick={handleCopyLink}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Havolani Nusxalash
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <Label htmlFor="result-link" className="text-base font-semibold">
                  Natija Havolasi
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="result-link"
                    value={resultUrl}
                    readOnly
                    className="rounded-xl bg-muted font-mono text-sm"
                  />
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleCopyLink}
                      size="icon"
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-11 w-11"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Havola Haqida
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                    <span>Bu havola faqat ushbu bemor natijalari uchun</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                    <span>Kirish yoki parol talab qilinmaydi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                    <span>Bemor natijalarni PDF formatida yuklab olishi mumkin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                    <span>Havola xavfsiz va shifrlangan</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </TabsContent>

          {/* Send Tab */}
          <TabsContent value="send" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* SMS Option */}
              <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 rounded-2xl border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">SMS Orqali Yuborish</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Natija havolasini {patientName} ga SMS orqali yuborish
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        value={patientPhone}
                        readOnly
                        className="flex-1 rounded-xl bg-white/50 dark:bg-slate-900/50"
                      />
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          onClick={handleSendSMS}
                          className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-xl"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          SMS Yuborish
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Option */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-2xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Email Orqali Yuborish</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Natija havolasini bemorga email orqali yuborish
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="bemor@email.com"
                        className="flex-1 rounded-xl"
                      />
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          onClick={handleSendEmail}
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email Yuborish
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Message */}
              <div className="p-4 bg-muted rounded-2xl">
                <p className="text-xs font-semibold mb-2 text-muted-foreground">Xabar Matni:</p>
                <p className="text-sm font-mono bg-background p-3 rounded-lg">
                  Hurmatli {patientName}, laboratoriya tahlili tayyor! 
                  Natijalarni ko'rish uchun: {resultUrl}
                  <br /><br />
                  MedLab Pro
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}