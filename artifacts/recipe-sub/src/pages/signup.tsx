import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, UserPlus, Sparkles, Eye, EyeOff, ArrowLeft, CheckCircle2, XCircle, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import * as authApi from "@/lib/auth-api";

interface PasswordRequirement {
  label: string;
  test: (pw: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /\d/.test(pw) },
  { label: "One special character (@$!%*?&)", test: (pw) => /[@$!%*?&]/.test(pw) },
];

export default function Signup() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  const passwordValid = requirements.every((r) => r.test(password));
  const formValid = username.trim().length >= 3 && email.trim() && passwordValid;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    setIsSubmitting(true);
    try {
      await authApi.sendOtp(username.trim(), email.trim(), password);
      setStep("otp");
      toast.success("OTP sent!", {
        description: "Check your email (and console/logs) for the verification code.",
      });
    } catch (err: any) {
      toast.error("Failed to send OTP", {
        description: err.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setOtpError("");
    setIsSubmitting(true);
    try {
      await register(username.trim(), email.trim(), password, otp);
      toast.success("Account created!", {
        description: "Welcome to VitalSub. Start exploring healthy substitutions.",
      });
      setLocation("/");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("otp") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
        setOtpError(msg);
      } else {
        toast.error("Registration failed", {
          description: msg || "Could not create account. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setIsSubmitting(true);
    try {
      await authApi.sendOtp(username.trim(), email.trim(), password);
      toast.success("OTP resent!", { description: "A new code has been sent." });
      setOtp("");
      setOtpError("");
    } catch (err: any) {
      toast.error("Failed to resend OTP", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Vital<span className="text-primary">Sub</span>
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-primary/10 border border-slate-100">
            <div className="text-center mb-8">
              <Badge variant="success" className="mb-4 px-4 py-1.5 text-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                {step === "form" ? "Get Started" : "Verify Email"}
              </Badge>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {step === "form" ? "Create your account" : "Check your email"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {step === "form"
                  ? "Join VitalSub to save your favorite substitutions and track your nutrition journey."
                  : `We sent a 6-digit code to ${email}`}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === "form" ? (
                <motion.form
                  key="form"
                  onSubmit={handleSendOtp}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="your_username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      required
                      autoComplete="username"
                    />
                    {username.length > 0 && username.length < 3 && (
                      <p className="text-xs text-destructive">Username must be at least 3 characters</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {requirements.map((req, i) => {
                        const met = req.test(password);
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {met ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className={met ? "text-success" : "text-muted-foreground"}>{req.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full group"
                    size="lg"
                    disabled={isSubmitting || !formValid}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending OTP...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Send Verification Code
                        <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp"
                  onSubmit={handleVerifyOtp}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(val);
                        setOtpError("");
                      }}
                      required
                      autoComplete="one-time-code"
                      className="text-center text-2xl tracking-[0.5em] font-mono"
                    />
                    {otpError && (
                      <p className="text-xs text-destructive mt-1">{otpError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full group"
                    size="lg"
                    disabled={isSubmitting || otp.length !== 6}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Create Account
                      </span>
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isSubmitting}
                      className="text-sm text-primary font-semibold hover:underline disabled:opacity-50"
                    >
                      Resend code
                    </button>
                    <span className="text-sm text-muted-foreground mx-2">·</span>
                    <button
                      type="button"
                      onClick={() => { setStep("form"); setOtp(""); setOtpError(""); }}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      Change email
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {step === "form" && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Leaf className="w-3 h-3" />
              Your data is encrypted and securely stored
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
