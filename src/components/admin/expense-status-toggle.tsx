"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleExpensePaidAction } from "@/app/actions/finance";
import { CheckCircle2, Clock } from "lucide-react";

interface ExpenseStatusToggleProps {
  expenseId: string;
  isPaid: boolean;
}

export function ExpenseStatusToggle({ expenseId, isPaid }: ExpenseStatusToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleExpensePaidAction(expenseId, !isPaid);
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleToggle}
      className={`text-[11px] h-6 px-2 gap-1 border font-medium ${
        isPaid
          ? "border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
          : "border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
      }`}
    >
      {isPaid ? (
        <>
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
        </>
      ) : (
        <>
          <Clock className="h-3 w-3 text-amber-600" /> Mark Paid
        </>
      )}
    </Button>
  );
}
