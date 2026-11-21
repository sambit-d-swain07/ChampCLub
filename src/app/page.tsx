import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Trophy, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-foreground">THE CHAMPIONS CLUB</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Racquet & Sports Club</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs h-8">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                Apply for Membership <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-20 px-6 text-center max-w-4xl mx-auto space-y-6">
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs px-3 py-1">
            Official 2026 Club Management System
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            Precision Performance. <br />
            <span className="text-emerald-600">Pure Sporting Luxury.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Championship Tennis, Panoramic Padel, Teakwood Badminton courts, complete with an artisanal sports bar, pro shop, and dynamic member reservations.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Access Live Demo Portal
              </Button>
            </Link>
            <Link href="/admin">
              <Button size="lg" variant="outline" className="font-semibold">
                Admin Operations
              </Button>
            </Link>
          </div>
        </section>

        {/* Sports Features */}
        <section className="py-12 px-6 max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold">Championship Tennis</CardTitle>
              <CardDescription className="text-xs">2 Tournament-grade cushioned acrylic courts with broadcast floodlights.</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div>• Capacity: 4 players per court</div>
              <div>• Dynamic peak/off-peak pricing</div>
              <div>• Ball machine & coaching integration</div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                <Zap className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold">Pro Padel Arenas</CardTitle>
              <CardDescription className="text-xs">2 Panoramic glass & textured turf padel arenas with instant video replays.</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div>• Seamless 4-player social bookings</div>
              <div>• Overlap-prevention exclusion locks</div>
              <div>• Demo racket rentals from the Pro Shop</div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold">Elite Badminton</CardTitle>
              <CardDescription className="text-xs">2 Shock-absorbing teakwood & synthetic courts certified for competition.</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div>• BWF standard anti-glare illumination</div>
              <div>• Yonex tournament shuttles in-stock</div>
              <div>• Dedicated Junior academy sessions</div>
            </CardContent>
          </Card>
        </section>

        {/* Membership Plans */}
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Privilege Memberships</h2>
            <p className="text-xs text-muted-foreground">Select the tier tailored to your playing routine.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Gold */}
            <Card className="border-2 border-emerald-600 shadow-lg relative">
              <Badge className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px]">MOST POPULAR</Badge>
              <CardHeader>
                <CardTitle className="text-xl font-bold">GOLD PASS</CardTitle>
                <CardDescription className="text-xs">Full year complete club privileges</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold">₹25,000</span>
                  <span className="text-xs text-muted-foreground"> / year</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 20% Court Booking Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 15% Pro Shop Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 10% Champions Bar & F&B Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Fast-Track QR Turnstile Pass</div>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="w-full">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Apply for Gold Pass</Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Silver */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold">SILVER PASS</CardTitle>
                <CardDescription className="text-xs">Essential racquet access</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold">₹15,000</span>
                  <span className="text-xs text-muted-foreground"> / year</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 10% Court Booking Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 10% Pro Shop Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 5% Champions Bar Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Standard QR Pass</div>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="w-full">
                  <Button variant="outline" className="w-full text-xs">Apply for Silver Pass</Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Junior */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold">JUNIOR PASS</CardTitle>
                <CardDescription className="text-xs">Ages under 18 development program</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold">₹8,000</span>
                  <span className="text-xs text-muted-foreground"> / 6 months</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 15% Court Booking Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 5% Pro Shop Discount</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Junior Coaching Squad Access</div>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="w-full">
                  <Button variant="outline" className="w-full text-xs">Apply for Junior Pass</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center text-xs text-muted-foreground bg-muted/20">
        <p>© 2026 The Champions Club • 24-Hour Hackathon Demo</p>
      </footer>
    </div>
  );
}
