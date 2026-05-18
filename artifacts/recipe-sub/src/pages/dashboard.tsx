import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Heart, Bookmark, History, User, LogOut, ArrowLeft, Trash2,
  Clock, ChefHat, Sparkles, Leaf, Loader2, Copy, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import * as authApi from "@/lib/auth-api";

export default function Dashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("recipes");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    setIsDataLoading(true);
    try {
      const [favs, savedRecipes, hist] = await Promise.all([
        authApi.getFavoriteSubstitutes().catch(() => []),
        authApi.getSavedRecipes().catch(() => []),
        authApi.getSubstitutionHistory().catch(() => []),
      ]);
      setFavorites(favs);
      setRecipes(savedRecipes);
      setHistory(hist);
    } catch {}
    setIsDataLoading(false);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out", { description: "You have been logged out successfully." });
    setLocation("/");
  };

  const handleDeleteRecipe = async (id: number) => {
    try {
      await authApi.deleteSavedRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      toast.success("Recipe deleted");
    } catch {
      toast.error("Failed to delete recipe");
    }
  };

  const handleCopyRecipe = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Vital<span className="text-primary">Sub</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16 bg-primary/10">
              <AvatarFallback className="text-primary font-bold text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {user.name}'s Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-border rounded-2xl p-1.5">
            <TabsTrigger value="recipes" className="rounded-xl data-[state=active]:shadow-md gap-2">
              <Bookmark className="w-4 h-4" />
              Saved Recipes
            </TabsTrigger>
            <TabsTrigger value="favorites" className="rounded-xl data-[state=active]:shadow-md gap-2">
              <Heart className="w-4 h-4" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl data-[state=active]:shadow-md gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes">
            <Card className="border-border/50 shadow-xl shadow-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-primary" />
                  Saved Recipes
                </CardTitle>
                <CardDescription>Recipes you've analyzed and saved for later.</CardDescription>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : recipes.length === 0 ? (
                  <div className="text-center py-12">
                    <ChefHat className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No saved recipes yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      Analyze a recipe and save it to see it here.
                    </p>
                    <Link href="/">
                      <Button variant="outline" className="mt-4">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze a Recipe
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="flex items-start justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{recipe.recipeText}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(recipe.createdAt).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <button
                            onClick={() => handleCopyRecipe(recipe.recipeText)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-white"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="p-2 text-destructive/60 hover:text-destructive transition-colors rounded-xl hover:bg-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites">
            <Card className="border-border/50 shadow-xl shadow-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Favorite Substitutes
                </CardTitle>
                <CardDescription>Your saved ingredient substitutions for quick access.</CardDescription>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No favorites yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      Save your favorite substitutes by clicking the heart icon.
                    </p>
                    <Link href="/">
                      <Button variant="outline" className="mt-4">
                        <Leaf className="w-4 h-4 mr-2" />
                        Find Substitutes
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {favorites.map((fav) => (
                      <div
                        key={fav.id}
                        className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-primary/20 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="capitalize">{fav.ingredient}</Badge>
                          <Heart className="w-4 h-4 text-primary fill-primary" />
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize flex items-center gap-2">
                          <span className="text-muted-foreground">→</span> {fav.substitute}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Saved {new Date(fav.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-border/50 shadow-xl shadow-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Substitution History
                </CardTitle>
                <CardDescription>Your recent substitution activity.</CardDescription>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No history yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      Your substitution activity will appear here.
                    </p>
                    <Link href="/">
                      <Button variant="outline" className="mt-4">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Exploring
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={entry.action === "saved" ? "success" : entry.action === "dismissed" ? "secondary" : "default"}
                            className="capitalize text-[10px] px-2 py-0.5"
                          >
                            {entry.action}
                          </Badge>
                          <span className="text-sm font-medium capitalize text-foreground">{entry.ingredient}</span>
                          <span className="text-muted-foreground text-sm">→</span>
                          <span className="text-sm font-medium capitalize text-foreground">{entry.substitute}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
