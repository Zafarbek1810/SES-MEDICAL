import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { Clock, Loader2, CheckCircle, XCircle } from "lucide-react";

type VariantKey = "Kutilmoqda" | "Jarayonda" | "Bajarildi" | "Rejected";

export type StatusBadgeStatus =
  | "Kutilmoqda"
  | "Jarayonda"
  | "Bajarildi"
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Rejected";

interface StatusBadgeProps {
  status: StatusBadgeStatus;
  animated?: boolean;
  /** Berilsa, badge matni shu bo‘ladi (masalan enum `labelUz`); aks holda standart o‘zbekcha yozuv */
  label?: string;
}

function statusToVariantKey(status: StatusBadgeStatus): VariantKey {
  if (status === "Rejected") return "Rejected";
  if (status === "Pending" || status === "Kutilmoqda") return "Kutilmoqda";
  if (status === "In Progress" || status === "Jarayonda") return "Jarayonda";
  return "Bajarildi";
}

const defaultLabels: Record<VariantKey, string> = {
  Kutilmoqda: "Kutilmoqda",
  Jarayonda: "Jarayonda",
  Bajarildi: "Bajarildi",
  Rejected: "Rad etilgan",
};

export function StatusBadge({ status, animated = true, label }: StatusBadgeProps) {
  const variantKey = statusToVariantKey(status);
  const displayText = (label?.trim() || defaultLabels[variantKey]).trim();

  const variants: Record<
    VariantKey,
    {
      className: string;
      icon: React.ReactNode;
      bgGradient: string;
    }
  > = {
    Kutilmoqda: {
      className:
        "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      icon: <Clock className="h-3 w-3 mr-1" />,
      bgGradient: "from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900",
    },
    Jarayonda: {
      className:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700",
      icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
      bgGradient: "from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10",
    },
    Bajarildi: {
      className:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700",
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
      bgGradient: "from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/10",
    },
    Rejected: {
      className:
        "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
      icon: <XCircle className="h-3 w-3 mr-1" />,
      bgGradient: "from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-900/10",
    },
  };

  const config = variants[variantKey];

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={animated ? { scale: 1, opacity: 1 } : false}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.05 }}
    >
      <Badge
        className={`${config.className} bg-gradient-to-r ${config.bgGradient} flex items-center gap-1 px-3 py-1 font-semibold shadow-sm border transition-all duration-200`}
      >
        {config.icon}
        {displayText}
      </Badge>
    </motion.div>
  );
}
