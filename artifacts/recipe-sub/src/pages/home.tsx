import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, Sparkles, ArrowRight, ArrowDown,
  AlertOctagon, CheckCircle2, Leaf, Search, RefreshCcw,
  TrendingDown, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmojiIcon } from "@/components/emoji-icon";
import { FeedbackWidget } from "@/components/feedback-widget";
import { NutritionComparison } from "@/components/nutrition-comparison";
import { useAnalyzeRecipe } from "@workspace/api-client-react";

export default function Home() {
  const [recipeText, setRecipeText] = useState("");

  const { mutate: analyze, data: results, isPending, error, reset } = useAnalyzeRecipe();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeText.trim()) return;
    analyze({ data: { recipe: recipeText } });
  };

  const handleReset = () => {
    reset();
    setRecipeText("");
  };

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
              Intelligent Ingredient Substitution
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 leading-tight">
              Cook smarter,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                eat healthier.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Paste any recipe and we'll instantly recommend the best nutritional substitutes — scored by similarity, function, and health impact.
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
                  Your Recipe Ingredients
                </label>
                <Textarea
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  placeholder="e.g. 2 cups brown sugar, 1 cup whole milk, 1 tbsp butter, 1 tsp salt"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Leaf className="w-3 h-3" />
                  Separate ingredients with commas. Variants like "brown sugar" are auto-normalized.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 group"
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
                      Find Substitutes
                      <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>

                {results && (
                  <Button type="button" size="lg" variant="outline" onClick={handleReset}>
                    <RefreshCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.form>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
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
            {/* Summary */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Recipe Analysis
              </h2>
              <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-border">
                <span className="font-medium text-slate-600">Found</span>
                <Badge
                  variant={results.substituteCount > 0 ? "success" : "secondary"}
                  className="text-base px-3 py-1"
                >
                  {results.substituteCount} {results.substituteCount === 1 ? "ingredient" : "ingredients"}
                </Badge>
                <span className="font-medium text-slate-600">with healthier substitutes.</span>
              </div>
            </div>

            {/* Ingredient Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.parsedIngredients.map((ing, idx) => (
                <IngredientCard key={idx} ing={ing} idx={idx} />
              ))}
            </div>

            {/* Nutrition Comparison */}
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

// ─── Ingredient Card Component ───────────────────────────────────────────────

function IngredientCard({ ing, idx }: { ing: any; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const topSub = ing.substitutes?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.08 }}
      className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full hover:shadow-2xl hover:border-primary/20 transition-all duration-300"
    >
      {/* Ingredient header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <EmojiIcon name={ing.name} className="w-14 h-14 text-3xl bg-slate-50 text-slate-700" />
          <div>
            <h3 className="text-xl font-bold text-foreground capitalize">{ing.name}</h3>
            {ing.normalizedName && (
              <p className="text-xs text-muted-foreground mt-0.5">→ normalized: <span className="font-medium">{ing.normalizedName}</span></p>
            )}
            {ing.hasSubstitutes ? (
              <Badge variant="success" className="mt-1"><Leaf className="w-3 h-3 mr-1" /> Has Substitutes</Badge>
            ) : (
              <Badge variant="secondary" className="mt-1"><CheckCircle2 className="w-3 h-3 mr-1" /> No Change Needed</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Substitutes */}
      {ing.hasSubstitutes && topSub && (
        <div className="flex-1 flex flex-col mt-2">
          <div className="flex justify-center mb-4 text-primary/40">
            <ArrowDown className="w-6 h-6" />
          </div>

          <div className="space-y-4 flex-1">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Best Substitute
            </h4>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <EmojiIcon name={topSub.name} className="w-10 h-10 text-xl bg-white shadow-sm" />
                  <span className="font-bold text-foreground capitalize text-lg">{topSub.name}</span>
                </div>
                <Badge variant="success">Score {topSub.score}%</Badge>
              </div>

              {/* Explanation reason */}
              {topSub.reason && (
                <p className="text-sm text-slate-600 mb-2 leading-relaxed">{topSub.reason}</p>
              )}

              {/* Key improvements */}
              {topSub.improvements && topSub.improvements.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {topSub.improvements.slice(0, 3).map((imp: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
                      <TrendingDown className="w-3 h-3" />
                      {imp}
                    </span>
                  ))}
                </div>
              )}

              {/* Expandable detailed explanation */}
              {topSub.explanation && (
                <div className="mt-2">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                    {expanded ? "Hide details" : "Why this substitute?"}
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed bg-white/60 p-3 rounded-xl border border-slate-100">
                          {topSub.explanation}
                        </p>

                        {/* Comparison highlights */}
                        {topSub.comparisonHighlights && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 rounded-lg p-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Original</p>
                              {topSub.comparisonHighlights.original.highlights.map((h: string, i: number) => (
                                <p key={i} className="text-[11px] text-slate-500">• {h}</p>
                              ))}
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-2">
                              <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Substitute</p>
                              {topSub.comparisonHighlights.substitute.highlights.map((h: string, i: number) => (
                                <p key={i} className="text-[11px] text-emerald-600">• {h}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <FeedbackWidget ingredient={ing.name} substitute={topSub.name} />
            </div>

            {/* Additional substitutes (collapsed) */}
            {ing.substitutes.length > 1 && (
              <AlternativeSubstitutes substitutes={ing.substitutes.slice(1, 4)} ingredientName={ing.name} />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Alternative Substitutes ─────────────────────────────────────────────────

function AlternativeSubstitutes({ substitutes, ingredientName }: { substitutes: any[]; ingredientName: string }) {
  const [showAlts, setShowAlts] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setShowAlts(!showAlts)}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        {showAlts ? "Hide" : `+${substitutes.length} more alternatives`}
        {showAlts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {showAlts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2 mt-2"
          >
            {substitutes.map((sub, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-2">
                  <EmojiIcon name={sub.name} className="w-8 h-8 text-base bg-white shadow-sm" />
                  <div>
                    <span className="font-semibold text-sm capitalize text-foreground">{sub.name}</span>
                    {sub.reason && (
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{sub.reason}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{sub.score}%</Badge>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
