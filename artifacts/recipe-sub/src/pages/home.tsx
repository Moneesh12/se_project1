import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HeartPulse, ChefHat, Sparkles, ArrowRight, ArrowDown, 
  AlertOctagon, CheckCircle2, XCircle, Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmojiIcon } from "@/components/emoji-icon";
import { FeedbackWidget } from "@/components/feedback-widget";
import { NutritionComparison } from "@/components/nutrition-comparison";
import { useAnalyzeRecipe, useListDiseases } from "@workspace/api-client-react";

export default function Home() {
  const [recipeText, setRecipeText] = useState("");
  const [selectedDisease, setSelectedDisease] = useState("Diabetes");
  
  // Queries
  const { data: diseases, isLoading: isLoadingDiseases } = useListDiseases();
  
  // Mutations
  const { mutate: analyze, data: results, isPending, error } = useAnalyzeRecipe();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeText.trim()) return;
    analyze({
      data: {
        recipe: recipeText,
        disease: selectedDisease
      }
    });
  };

  const diseaseOptions = diseases || ["Diabetes", "Hypertension", "Heart Disease", "Kidney Disease"];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Vital<span className="text-primary">Sub</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Healthy fresh ingredients" 
            className="w-full h-full object-cover opacity-20 dark:opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="success" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Recipe Adaptation
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 leading-tight">
              Eat what you love, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                safe for your health.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Paste your favorite recipe, select your health condition, and we'll instantly find safe ingredient substitutions and compare nutrition facts.
            </p>
          </motion.div>

          {/* Main Input Form */}
          <motion.form 
            onSubmit={handleAnalyze}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl shadow-primary/10 border border-slate-100 max-w-3xl mx-auto text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            
            <div className="relative z-10 space-y-6">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  Your Recipe
                </label>
                <Textarea 
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  placeholder="Paste your recipe here... e.g. '2 cups sugar, 1 cup milk, 1 tbsp salt'"
                  required
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-destructive" />
                    Health Condition
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDisease}
                      onChange={(e) => setSelectedDisease(e.target.value)}
                      disabled={isLoadingDiseases}
                      className="w-full h-12 px-4 rounded-xl border-2 border-border bg-card text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 appearance-none transition-all cursor-pointer"
                    >
                      {diseaseOptions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <ArrowDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full md:w-1/2 group"
                  disabled={isPending || !recipeText.trim()}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="w-5 h-5" />
                      Analyze Recipe
                      <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </motion.form>
        </div>
      </div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12"
          >
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl flex items-start gap-4">
              <AlertOctagon className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-lg mb-1">Analysis Failed</h3>
                <p className="opacity-90">{error.message || "We couldn't analyze this recipe. Please try again."}</p>
              </div>
            </div>
          </motion.div>
        )}

        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12"
          >
            {/* Analysis Summary */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Analysis for <span className="text-primary">{results.disease}</span>
              </h2>
              <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-border">
                <span className="font-medium text-slate-600">We found</span>
                <Badge variant={results.unsafeCount > 0 ? "destructive" : "success"} className="text-base px-3 py-1">
                  {results.unsafeCount} {results.unsafeCount === 1 ? 'ingredient' : 'ingredients'}
                </Badge>
                <span className="font-medium text-slate-600">to substitute.</span>
              </div>
            </div>

            {/* Ingredients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.parsedIngredients.map((ing, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full hover:shadow-2xl hover:border-primary/20 transition-all duration-300"
                >
                  {/* Original Ingredient */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <EmojiIcon name={ing.name} className="w-14 h-14 text-3xl bg-slate-50 text-slate-700" />
                      <div>
                        <h3 className="text-xl font-bold text-foreground capitalize">{ing.name}</h3>
                        {ing.isUnsafe ? (
                          <Badge variant="destructive" className="mt-1"><XCircle className="w-3 h-3 mr-1" /> Unsafe</Badge>
                        ) : (
                          <Badge variant="secondary" className="mt-1"><CheckCircle2 className="w-3 h-3 mr-1" /> Safe</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Substitutes Section */}
                  {ing.isUnsafe && (
                    <div className="flex-1 flex flex-col mt-2">
                      <div className="flex justify-center mb-4 text-primary/40">
                        <ArrowDown className="w-6 h-6" />
                      </div>

                      {ing.substitutes.length > 0 ? (
                        <div className="space-y-4 flex-1">
                          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recommended Substitutes</h4>
                          {ing.substitutes.map((sub, subIdx) => (
                            <div key={subIdx} className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <EmojiIcon name={sub.name} className="w-10 h-10 text-xl bg-white shadow-sm" />
                                  <span className="font-bold text-foreground capitalize text-lg">{sub.name}</span>
                                </div>
                                <Badge variant="success">Match {sub.score}%</Badge>
                              </div>
                              <FeedbackWidget ingredient={ing.name} substitute={sub.name} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center flex-1 flex flex-col items-center justify-center">
                          <AlertOctagon className="w-8 h-8 text-slate-400 mb-2" />
                          <p className="text-slate-600 font-medium">No safe substitute available for this condition.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Nutrition Section */}
            {results.originalNutritionTotal && results.substitutedNutritionTotal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-16"
              >
                <NutritionComparison 
                  original={results.originalNutritionTotal} 
                  substituted={results.substitutedNutritionTotal} 
                />
              </motion.div>
            )}
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
