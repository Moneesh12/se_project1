import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { useSubmitFeedback } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import * as authApi from "@/lib/auth-api";
import { toast } from "sonner";

interface FeedbackWidgetProps {
  ingredient: string;
  substitute: string;
  user?: any;
}

export function FeedbackWidget({ ingredient, substitute, user }: FeedbackWidgetProps) {
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState<"up" | "down" | null>(null);
  const { mutate, isPending } = useSubmitFeedback();

  const handleFeedback = (rating: number) => {
    mutate(
      { data: { ingredient, substitute, rating } },
      {
        onSuccess: () => {
          setSubmitted(true);
          if (rating === 5 && user) {
            authApi.saveFavoriteSubstitute(ingredient, substitute).catch(() => {});
          }
        },
      }
    );
  };

  return (
    <div className="flex items-center justify-between py-3 border-t border-border mt-4">
      <span className="text-sm text-muted-foreground font-medium">Was this helpful?</span>
      
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center text-success font-medium text-sm gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Thank you!</span>
          </motion.div>
        ) : (
          <motion.div
            key="buttons"
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex gap-2"
          >
            <button
              disabled={isPending}
              onClick={() => handleFeedback(5)}
              onMouseEnter={() => setHovered("up")}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                hovered === "up" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              disabled={isPending}
              onClick={() => handleFeedback(1)}
              onMouseEnter={() => setHovered("down")}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                hovered === "down" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
