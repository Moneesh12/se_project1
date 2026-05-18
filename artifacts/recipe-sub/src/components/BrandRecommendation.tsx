import { useState, useEffect } from "react";
import { Store, Leaf, TrendingDown, Award, Sparkles, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RankedProduct {
  productName: string;
  brand: string;
  imageUrl: string | null;
  url: string | null;
  cleanScore: number;
  ingredientsList: string | null;
  additiveCount: number;
  novaGroup: number | null;
  nutriscoreGrade: string | null;
  reason: string;
}

interface BrandResult {
  brandable: boolean;
  substituteName: string;
  bestOverall: RankedProduct | null;
  cleanest: RankedProduct | null;
  budget: RankedProduct | null;
}

export default function BrandRecommendation({
  substituteName,
}: {
  substituteName: string;
}) {
  const [data, setData] = useState<BrandResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
    const API_BASE = rawApiBase;

    fetch(
      `${API_BASE}/api/brands/${encodeURIComponent(substituteName)}`
    )
      .then((r) => r.json())
      .then((result: BrandResult) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [substituteName]);

  if (loading) {
    return (
      <div className="mt-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
        <div className="h-20 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!data?.brandable) return null;

  const tiers: { label: string; icon: React.ReactNode; product: RankedProduct | null }[] = [
    {
      label: "Best Overall",
      icon: <Award className="w-4 h-4 text-teal-500" />,
      product: data.bestOverall,
    },
    {
      label: "Cleanest Ingredients",
      icon: <Leaf className="w-4 h-4 text-emerald-500" />,
      product: data.cleanest,
    },
    {
      label: "Budget Pick",
      icon: <TrendingDown className="w-4 h-4 text-amber-500" />,
      product: data.budget,
    },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Store className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Brand Recommendations
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          <Sparkles className="w-3 h-3 mr-0.5" />
          OpenFoodFacts
        </Badge>
      </div>

      <div className="space-y-2">
        {tiers.map(
          (tier) =>
            tier.product && (
              <div
                key={tier.label}
                className="flex items-start gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:border-primary/20 transition-all"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
                  {tier.product.imageUrl ? (
                    <img
                      src={tier.product.imageUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Store className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      {tier.label}
                    </span>
                    <Badge
                      variant={
                        tier.product.cleanScore >= 70 ? "success" : "secondary"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tier.product.cleanScore}/100
                    </Badge>
                  </div>

                  <p className="text-sm font-bold text-foreground mt-0.5 leading-tight">
                    {tier.product.productName}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    by {tier.product.brand}
                  </p>

                  {tier.product.reason && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {tier.product.reason}
                    </p>
                  )}

                  {tier.product.url && (
                    <a
                      href={tier.product.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View product
                    </a>
                  )}
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
}
