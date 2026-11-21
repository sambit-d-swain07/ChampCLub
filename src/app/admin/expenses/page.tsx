import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ExpenseFormDialog } from "@/components/admin/expense-form-dialog";
import { ExpenseStatusToggle } from "@/components/admin/expense-status-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt, DollarSign, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (!user || role !== "OWNER") {
    redirect("/admin/members");
  }

  const rawExpenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
  });

  let totalExpenses = 0;
  let unpaidExpenses = 0;

  const expenses = rawExpenses.map((exp) => {
    let vendor = exp.title;
    let isPaid = true;
    let description = exp.notes || "";

    try {
      if (exp.notes) {
        const parsed = JSON.parse(exp.notes);
        if (parsed.vendor) vendor = parsed.vendor;
        if (typeof parsed.paid === "boolean") isPaid = parsed.paid;
        if (parsed.notes) description = parsed.notes;
      }
    } catch {
      if (exp.notes?.includes("[UNPAID]")) isPaid = false;
    }

    const amt = Number(exp.amount);
    totalExpenses += amt;
    if (!isPaid) unpaidExpenses += amt;

    return {
      ...exp,
      amountNum: amt,
      vendor,
      isPaid,
      description,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/owner">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Expenses</h1>
          </div>
        </div>

        <ExpenseFormDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Cumulative Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{totalExpenses.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} expense vouchers logged</p>
          </CardContent>
        </Card>

        <Card className={`shadow-xs ${unpaidExpenses > 0 ? "border-amber-300 bg-amber-50/20" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Pending / Accounts Payable</CardTitle>
            <Clock className={`h-4 w-4 ${unpaidExpenses > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${unpaidExpenses > 0 ? "text-amber-700" : "text-foreground"}`}>
              ₹{unpaidExpenses.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding vendor invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Expense Ledger</CardTitle>
          <CardDescription className="text-xs">
            Complete records of disbursements, categorized for financial reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs pl-6">Date</TableHead>
                <TableHead className="text-xs">Vendor / Payee</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Notes / Ref</TableHead>
                <TableHead className="text-xs">Logged By</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-10">
                    No operating expenses logged yet. Click &quot;Add Expense&quot; above to record your first voucher.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-medium pl-6">
                      {new Intl.DateTimeFormat("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                      }).format(exp.date)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground">
                      {exp.vendor}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {exp.description || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {exp.recordedBy || "Owner"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <ExpenseStatusToggle expenseId={exp.id} isPaid={exp.isPaid} />
                    </TableCell>
                    <TableCell className="text-xs font-bold text-right pr-6">
                      ₹{exp.amountNum.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
