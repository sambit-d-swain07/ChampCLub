"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerMemberAction } from "@/app/actions/members";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  price: any;
  durationDays: number;
}

export function RegisterMemberDialog({ plans }: { plans: PlanItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await registerMemberAction(formData);

    if (!res.success) {
      setError(res.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
        <UserPlus className="h-4 w-4 mr-2" />
        Register Member
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">New Member Registration</DialogTitle>
          <DialogDescription className="text-xs">
            Create member profile, activate membership plan, and post to financial ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 text-xs bg-destructive/10 text-destructive rounded-md font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Sania Mirza" className="text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
            <Input id="email" name="email" type="email" required placeholder="member@chamclub.com" className="text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="planId" className="text-xs font-semibold">Membership Plan</Label>
            <Select name="planId" defaultValue={plans[0]?.id}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name} - ₹{Number(p.price).toLocaleString("en-IN")} ({p.durationDays} days)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod" className="text-xs font-semibold">Payment Method</Label>
            <Select name="paymentMethod" defaultValue="UPI">
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPI" className="text-xs">UPI</SelectItem>
                <SelectItem value="CARD" className="text-xs">Credit/Debit Card</SelectItem>
                <SelectItem value="CASH" className="text-xs">Cash at Counter</SelectItem>
                <SelectItem value="ONLINE" className="text-xs">Online Payment Gateway</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enrolling...</span>
              ) : (
                "Enroll & Issue Pass"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>
  );
}
