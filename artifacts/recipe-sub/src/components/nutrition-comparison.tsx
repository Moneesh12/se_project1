import React from "react";
import { Activity, Flame, Droplet, Wheat, Cuboid, Box } from "lucide-react";
import { NutritionData } from "@workspace/api-client-react";
import { motion } from "framer-motion";

interface NutritionComparisonProps {
  original: NutritionData;
  substituted: NutritionData;
}

const NUTRIENT_CONFIG = [
  { key: "calories", label: "Calories", icon: Flame, unit: "kcal", betterWhenLower: true },
  { key: "carbs", label: "Carbs", icon: Wheat, unit: "g", betterWhenLower: true },
  { key: "protein", label: "Protein", icon: Activity, unit: "g", betterWhenLower: false },
  { key: "fat", label: "Fat", icon: Droplet, unit: "g", betterWhenLower: true },
  { key: "sugar", label: "Sugar", icon: Cuboid, unit: "g", betterWhenLower: true },
  { key: "sodium", label: "Sodium", icon: Box, unit: "mg", betterWhenLower: true },
] as const;

function formatDelta(value: number, unit: string) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${unit}`;
}

export function NutritionComparison({ original, substituted }: NutritionComparisonProps) {
  const totalOriginal = NUTRIENT_CONFIG.reduce((acc, item) => acc + (original[item.key as keyof NutritionData] || 0), 0);
  const totalSubstituted = NUTRIENT_CONFIG.reduce((acc, item) => acc + (substituted[item.key as keyof NutritionData] || 0), 0);
  const relativeShift = totalOriginal > 0 ? ((totalSubstituted - totalOriginal) / totalOriginal) * 100 : 0;

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-primary/5 border border-border/50 overflow-hidden">
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="text-primary w-6 h-6" />
            Nutrition Impact
          </h2>
          <p className="text-muted-foreground mt-1">
            Estimated impact for the full ingredient list using the top substitute per ingredient
          </p>
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
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-sm text-slate-700">
            This is a relative nutrition estimate based on USDA per-100g ingredient profiles. For multiple ingredients, we compare:
            <span className="font-semibold"> (original ingredient set) vs (top recommended substitute set)</span>.
            Ingredient quantities from the recipe text are not yet weighted here.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Overall relative shift: <span className={`font-semibold ${relativeShift <= 0 ? "text-primary" : "text-amber-700"}`}>{relativeShift > 0 ? "+" : ""}{relativeShift.toFixed(1)}%</span>
            {" "}across displayed nutrients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {NUTRIENT_CONFIG.map(({ key, label, icon: Icon, unit, betterWhenLower }, i) => {
            const origVal = original[key as keyof NutritionData] || 0;
            const subVal = substituted[key as keyof NutritionData] || 0;
            
            const delta = subVal - origVal;
            const diff = Math.abs(delta);
            const diffPercent = origVal > 0 ? (diff / origVal) * 100 : 0;
            const isImprovement = betterWhenLower ? subVal < origVal : subVal > origVal;
            const isWorse = betterWhenLower ? subVal > origVal : subVal < origVal;

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
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isImprovement ? "bg-success/15 text-success-foreground" : "bg-amber-100 text-amber-700"}`}>
                      {isImprovement ? "Improved " : "Changed "}{diffPercent.toFixed(0)}%
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
                      className={`absolute top-0 left-0 h-full rounded-full ${isImprovement ? "bg-primary" : (isWorse ? "bg-amber-400" : "bg-primary")}`} 
                    />
                  </div>

                  <p className="text-xs text-slate-500 pt-1">
                    Delta: <span className={`font-semibold ${isImprovement ? "text-primary" : (isWorse ? "text-amber-700" : "text-slate-600")}`}>{formatDelta(delta, unit)}</span>
                    {" "}({betterWhenLower ? "lower is better" : "higher is better"})
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
