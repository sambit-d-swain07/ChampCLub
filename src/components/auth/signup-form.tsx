"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { signUpMemberAction } from "@/app/actions/members";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  price: unknown;
  durationDays: number;
  courtDiscountPct: unknown;
  shopDiscountPct: unknown;
  barDiscountPct: unknown;
}

export function SignUpForm({ plans }: { plans: PlanItem[] }) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("planId", selectedPlanId);

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signUpMemberAction(formData);

    if (!res.success) {
      setError(res.error || "Failed to sign up.");
      setLoading(false);
      return;
    }

    // Auto sign in after registration
    try {
      const signInRes = await signIn.email({
        email,
        password,
      });

      if (signInRes.error) {
        // Redirect to login if auto sign in has an issue
        router.push("/login");
        return;
      }

      router.push("/member");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-xl border">
      <CardHeader className="space-y-2 text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
          <Trophy className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight">Apply for Club Membership</CardTitle>
        <CardDescription className="text-xs">
          Join The Champions Club for exclusive court access, pro-shop perks, and lounge privileges.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-md font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Rohan Bopanna"
              required
              disabled={loading}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="e.g. rohan@example.com"
              required
              disabled={loading}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              disabled={loading}
              className="text-xs h-9"
            />
          </div>

          {/* Membership Plan Selection */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-semibold">Choose Your Membership Privilege Tier</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`cursor-pointer rounded-lg p-3 border text-left transition-all relative ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-600"
                        : "border-border hover:border-muted-foreground/30 bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{p.name}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                    <div className="text-sm font-extrabold text-foreground">
                      ₹{Number(p.price).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {p.durationDays} days valid
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-1">
                      {Number(p.courtDiscountPct)}% off courts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-10 mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registering Membership...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Join The Champions Club <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t py-3 bg-muted/20 text-xs">
        <span className="text-muted-foreground mr-1">Already have a membership?</span>
        <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
          Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}
