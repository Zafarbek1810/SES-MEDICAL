import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Lock, User, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  getPathForRole,
  getStoredUser,
  isAuthenticated,
  loginApi,
} from "../../services/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(getPathForRole(getStoredUser()?.role), { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Foydalanuvchi nomi va parolni kiriting");
      return;
    }
    setIsLoading(true);
    try {
      const data = await loginApi({ username: username.trim(), password });
      toast.success("Muvaffaqiyatli kirildi");
      navigate(getPathForRole(data.role), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kirishda xatolik";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const statsData = [
    { icon: Activity, value: "500+", label: "Kunlik tekshiruvlar", color: "from-blue-500 to-cyan-500" },
    { icon: Sparkles, value: "99.9%", label: "Aniqlik", color: "from-purple-500 to-pink-500" },
    { icon: Shield, value: "24/7", label: "Qo'llab-quvvatlash", color: "from-green-500 to-teal-500" },
  ];

  // Floating particles animation
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 5,
  }));

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 transition-colors duration-300 relative overflow-hidden">
      {/* Animated floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-blue-400/30 dark:bg-cyan-400/20 rounded-full"
            style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-20 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 50, 0],
              y: [0, 30, 0],
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
              x: [0, -50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
              x: [-100, 100, -100],
              y: [-50, 50, -50],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Logo and Title */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          >
            <motion.div
              className="inline-flex items-center justify-center h-20 w-20 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl mb-4 shadow-2xl shadow-blue-500/30 dark:shadow-blue-500/20 relative overflow-hidden"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95, rotate: -5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 2,
                }}
              />
              <Activity className="h-10 w-10 text-white relative z-10" strokeWidth={2.5} />
            </motion.div>
            <motion.h1 
              className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
            >
              MedLab Pro
            </motion.h1>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Sanitariya va Epidemiologiya Laboratoriyasi
            </motion.p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring", stiffness: 100 }}
          >
            <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/80 rounded-3xl overflow-hidden relative">
              {/* Card glow effect */}
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-3xl opacity-0"
                animate={{
                  opacity: [0, 0.1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              <div className="relative z-10">
                <CardHeader className="space-y-1 pb-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <CardTitle className="text-2xl">Xush Kelibsiz</CardTitle>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <CardDescription>Laboratoriya paneliga kirish uchun tizimga kiring</CardDescription>
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-5">
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Label htmlFor="username" className="text-sm font-semibold">Foydalanuvchi nomi</Label>
                      <motion.div 
                        className="relative group"
                        whileFocus={{ scale: 1.01 }}
                      >
                        <motion.div
                          animate={{
                            color: username ? "rgb(59, 130, 246)" : "rgb(148, 163, 184)",
                          }}
                        >
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
                        </motion.div>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Foydalanuvchi nomini kiriting"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10 h-12 rounded-xl border-border focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-blue-500/10"
                        />
                      </motion.div>
                    </motion.div>

                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <Label htmlFor="password" className="text-sm font-semibold">Parol</Label>
                      <motion.div 
                        className="relative group"
                        whileFocus={{ scale: 1.01 }}
                      >
                        <motion.div
                          animate={{
                            color: password ? "rgb(59, 130, 246)" : "rgb(148, 163, 184)",
                          }}
                        >
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
                        </motion.div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Parolni kiriting"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 h-12 rounded-xl border-border focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-blue-500/10"
                        />
                      </motion.div>
                    </motion.div>

                    <motion.div 
                      className="flex items-center justify-between"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <Label
                          htmlFor="remember"
                          className="text-sm font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Meni eslab qol
                        </Label>
                      </div>
                      <motion.a 
                        href="#" 
                        className="text-sm text-primary hover:underline font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Parolni unutdingizmi?
                      </motion.a>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                    >
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 rounded-xl font-semibold text-base relative overflow-hidden group"
                      >
                        {/* Button shimmer effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{
                            x: isLoading ? ["-100%", "100%"] : "-100%",
                          }}
                          transition={{
                            duration: 1,
                            repeat: isLoading ? Infinity : 0,
                            ease: "linear",
                          }}
                        />
                        <span className="relative z-10 flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            {isLoading ? (
                              <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center"
                              >
                                <motion.div
                                  className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                />
                                Yuklanmoqda...
                              </motion.div>
                            ) : (
                              <motion.div
                                key="login"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center"
                              >
                                Kirish
                                <motion.div
                                  animate={{ x: [0, 5, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  <ArrowRight className="ml-2 h-5 w-5" />
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </span>
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
              </div>
            </Card>
          </motion.div>

          <motion.p
            className="text-xs text-center text-muted-foreground mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            © 2026 MedLab Pro. Barcha huquqlar himoyalangan.
          </motion.p>
        </motion.div>
      </div>

      {/* Right Side - Medical Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 items-center justify-center p-8 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)",
              backgroundSize: "48px 48px",
            }}
            animate={{
              backgroundPosition: ["0px 0px", "48px 48px"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          {/* Additional animated circles */}
          <motion.div
            className="absolute top-20 right-20 w-32 h-32 border-4 border-white/20 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute bottom-40 left-20 w-24 h-24 border-4 border-white/10 rounded-full"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        <div className="text-center text-white max-w-lg relative z-10">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <motion.div
              className="inline-flex items-center justify-center h-40 w-40 bg-white/10 backdrop-blur-md rounded-full mb-6 shadow-2xl relative overflow-hidden"
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Pulsing rings */}
              <motion.div
                className="absolute inset-0 border-4 border-white/30 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute inset-0 border-4 border-white/30 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 1.5,
                }}
              />
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Activity className="h-20 w-20 text-white" strokeWidth={2} />
              </motion.div>
            </motion.div>
            <motion.h2
              className="text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Ilg'or Laboratoriya Boshqaruvi
            </motion.h2>
            <motion.p
              className="text-lg text-blue-100 dark:text-cyan-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Keng qamrovli boshqaruv tizimimiz bilan laboratoriya faoliyatingizni 
              soddalashtiring. Namunalarni kuzating, testlarni boshqaring va natijalarni 
              samarali yetkazib bering.
            </motion.p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-12">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 hover:bg-white/20 transition-all cursor-pointer border border-white/10"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.15, type: "spring" }}
                  whileHover={{ 
                    scale: 1.08, 
                    y: -10,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className={`inline-flex h-12 w-12 bg-gradient-to-br ${stat.color} rounded-xl items-center justify-center mb-3 shadow-lg`}
                    whileHover={{ 
                      rotate: [0, -10, 10, -10, 0],
                      scale: 1.1,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </motion.div>
                  <motion.p 
                    className="text-3xl font-bold mb-1"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-sm text-blue-100 dark:text-cyan-100">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Additional feature highlights */}
          <motion.div
            className="mt-12 grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div
              className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Zap className="h-5 w-5 text-yellow-300" />
              <span className="text-sm">Tez Natijalar</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Shield className="h-5 w-5 text-green-300" />
              <span className="text-sm">Xavfsiz Ma'lumotlar</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}