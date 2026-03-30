import { motion } from "motion/react";
import { Card, CardContent } from "./ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  index?: number;
}

export function StatCard({ title, value, icon: Icon, iconColor = "text-blue-600 dark:text-blue-400", index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card className="overflow-hidden border-border hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <motion.p 
                className="text-sm font-medium text-muted-foreground mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {title}
              </motion.p>
              <motion.p 
                className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
              >
                {value}
              </motion.p>
            </div>
            <motion.div
              className={`${iconColor} p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Icon className="h-8 w-8" strokeWidth={2.5} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
