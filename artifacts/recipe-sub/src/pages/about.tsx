import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Leaf, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">
              About <span className="text-primary">VitalSub</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Smarter ingredient substitutions for healthier cooking.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Leaf className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">What is VitalSub?</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    VitalSub is an intelligent ingredient substitution platform that helps you
                    make healthier choices in the kitchen without sacrificing flavor or
                    functionality. Simply paste any recipe, and we analyze every ingredient to
                    suggest healthier alternatives backed by nutritional science.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Why is it helpful?</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Whether you're managing diabetes, reducing sodium, cutting sugar, or just
                    trying to eat better — VitalSub gives you practical, real-world alternatives.
                    Our engine considers nutrition, taste, texture, and cooking function so your
                    dish still turns out great.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Why use VitalSub?</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Unlike generic substitution charts, VitalSub analyzes entire recipes at once,
                    provides brand recommendations for processed ingredients, saves your history
                    and favorites, and is completely free to use. It's like having a nutritionist
                    in your kitchen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link href="/">
              <Button size="lg" className="rounded-xl">
                Try It Now
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
