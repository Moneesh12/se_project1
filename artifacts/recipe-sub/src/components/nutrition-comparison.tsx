import React from "react";
import { Activity, Flame, Droplet, Wheat, Cuboid, Box } from "lucide-react";
import { NutritionData } from "@workspace/api-client-react";
import { motion } from "framer-motion";

interface NutritionComparisonProps {
  original: NutritionData;
  substituted: NutritionData;
}

const NUTRIENT_CONFIG = [
  { key: "calories", label: "Calories", icon: Flame, unit: "kcal" },
  { key: "carbs", label: "Carbs", icon: Wheat, unit: "g" },
  { key: "protein", label: "Protein", icon: Activity, unit: "g" },
  { key: "fat", label: "Fat", icon: Droplet, unit: "g" },
  { key: "sugar", label: "Sugar", icon: Cuboid, unit: "g" },
  { key: "sodium", label: "Sodium", icon: Box, unit: "mg" },
] as const;

export function NutritionComparison({ original, substituted }: NutritionComparisonProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-primary/5 border border-border/50 overflow-hidden">
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="text-primary w-6 h-6" />
            Nutrition Impact
          </h2>
          <p className="text-muted-foreground mt-1">Total recipe comparison using the top recommended substitution</p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            <span className="text-slate-600">Original</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-primary">Substituted</span>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {NUTRIENT_CONFIG.map(({ key, label, icon: Icon, unit }, i) => {
            const origVal = original[key as keyof NutritionData] || 0;
            const subVal = substituted[key as keyof NutritionData] || 0;
            
            // For most things (calories, fat, sugar, sodium), lower is better.
            // Let's assume a generic reduction is highlighted in green if it's less.
            const isReduction = subVal < origVal;
            const isIncrease = subVal > origVal;
            const diff = Math.abs(origVal - subVal);
            const diffPercent = origVal > 0 ? (diff / origVal) * 100 : 0;

            return (
              <motion.div 
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-5 border border-border/60 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-secondary rounded-xl text-primary group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-foreground text-lg">{label}</span>
                  </div>
                  {diffPercent > 0 && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isReduction ? 'bg-success/15 text-success-foreground' : 'bg-amber-100 text-amber-700'}`}>
                      {isReduction ? '-' : '+'}{diffPercent.toFixed(0)}%
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-slate-500">Original</span>
                    <span className="text-lg font-bold text-slate-700">{origVal.toFixed(1)} <span className="text-sm text-slate-400 font-medium">{unit}</span></span>
                  </div>
                  
                  <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      className="absolute top-0 left-0 h-full bg-slate-300 rounded-full" 
                    />
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <span className="text-sm font-bold text-primary">Substituted</span>
                    <span className="text-xl font-black text-primary">{subVal.toFixed(1)} <span className="text-sm text-primary/70 font-bold">{unit}</span></span>
                  </div>

                  <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${origVal > 0 ? (subVal / Math.max(origVal, subVal)) * 100 : 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute top-0 left-0 h-full rounded-full ${isReduction ? 'bg-primary' : (isIncrease ? 'bg-amber-400' : 'bg-primary')}`} 
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
