"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trophy, Shield, KeyRound, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const e = loginEmail || email;
    const p = loginPassword || password;
    if (!e || !p) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.email({
        email: e,
        password: p,
      });

      if (result.error) {
        setError(result.error.message || "Invalid credentials.");
        setLoading(false);
        return;
      }

      // Route by role
      if (e.includes("member")) {
        router.push("/member");
      } else if (e.includes("staff")) {
        router.push("/admin/members");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred during sign in.");
      setLoading(false);
    }
  };

  const quickLogin = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    handleLogin(e, p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Trophy className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">The Champions Club</CardTitle>
          <CardDescription className="text-xs">
            Sign in to access your administrative dashboard or member portal.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-md font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@chamclub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="text-xs"
            />
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9"
            onClick={() => handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              1-Click Demo Login
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] px-2 h-8"
                onClick={() => quickLogin("owner@championsclub.test", "Password123!")}
                disabled={loading}
              >
                <Shield className="h-3 w-3 mr-1 text-emerald-600" /> Owner
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] px-2 h-8"
                onClick={() => quickLogin("staff1@championsclub.test", "Password123!")}
                disabled={loading}
              >
                <KeyRound className="h-3 w-3 mr-1 text-blue-600" /> Staff
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] px-2 h-8"
                onClick={() => quickLogin("member@championsclub.test", "Password123!")}
                disabled={loading}
              >
                <Trophy className="h-3 w-3 mr-1 text-purple-600" /> Member
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 justify-center border-t py-3 bg-muted/20 text-muted-foreground text-[11px]">
          <div>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-emerald-700 font-semibold hover:underline">
              Apply for Membership
            </Link>
          </div>
          <div>Demo Environment • Hackathon Release</div>
        </CardFooter>
      </Card>
    </div>
  );
}
