"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { createExpenseAction } from "@/app/actions/finance";

const EXPENSE_CATEGORIES = [
  "Equipment & Maintenance",
  "Court Resurfacing & Lighting",
  "Food & Beverage Supplies",
  "Pro Shop Wholesale Inventory",
  "Staff & Coaching Payroll",
  "Utilities (Power & Water)",
  "Marketing & Tournaments",
  "Software & Licences",
  "Other Operations",
];

export function ExpenseFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState<"yes" | "no">("yes");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (!vendor.trim()) {
      setError("Vendor name is required.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }

    startTransition(async () => {
      const res = await createExpenseAction({
        category,
        vendor: vendor.trim(),
        amount: parsedAmount,
        paid: paid === "yes",
        date,
        notes: notes.trim(),
      });

      if (res.success) {
        setOpen(false);
        setVendor("");
        setAmount("");
        setNotes("");
      } else {
        setError(res.error || "Failed to record expense.");
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        Add Expense
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Record Operating Expense</DialogTitle>
          <DialogDescription className="text-xs">
            Log procurement, equipment repair, utilities, or vendor invoices.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="font-semibold block mb-1">Expense Category</label>
            <Select value={category} onValueChange={(val) => val && setCategory(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="font-semibold block mb-1">Vendor / Payee</label>
            <Input
              placeholder="e.g. Wilson India, BESCOM, Daily Fresh Dairy"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Amount (₹ INR)</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Paid Status</label>
              <Select value={paid} onValueChange={(val) => val && setPaid(val as "yes" | "no")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes" className="text-xs text-emerald-700 font-medium">
                    ✓ Paid in Full
                  </SelectItem>
                  <SelectItem value="no" className="text-xs text-amber-700 font-medium">
                    ⏳ Unpaid / Payable
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Expense Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Notes / Invoice Ref (Optional)</label>
            <Input
              placeholder="Invoice # or remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? "Recording..." : "Save Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
