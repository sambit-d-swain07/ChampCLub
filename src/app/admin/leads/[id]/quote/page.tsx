import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateLeadStatusAction } from "@/app/actions/leads";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";

const CLUB_ADDRESS = "The Champions Club, 123 Sports Avenue, Bengaluru – 560001";
const CLUB_EMAIL = "info@championsclub.in";
const CLUB_PHONE = "+91 80 1234 5678";

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ planId?: string }>;
}) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (!user || role === "MEMBER") {
    redirect("/member");
  }

  const { id } = await params;
  const { planId } = await searchParams;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });

  // Auto-advance status to QUOTE_SENT
  if (lead.status === "NEW" || lead.status === "CONTACTED") {
    await updateLeadStatusAction(lead.id, "QUOTE_SENT");
  }

  const recommendedPlan = planId
    ? plans.find((p) => p.id === planId) || plans[0]
    : plans[0];

  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + 30);

  return (
    <div className="max-w-2xl mx-auto space-y-8 print:mx-0 print:max-w-full">
      {/* Print controls — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <a
          href={`/admin/leads/${lead.id}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to Lead
        </a>
        <PrintButton />
      </div>

      {/* Quote document */}
      <div className="bg-white border rounded-xl p-10 shadow-sm print:shadow-none print:border-0 print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <div className="text-xl font-bold text-emerald-800 tracking-tight">
              THE CHAMPIONS CLUB
            </div>
            <div className="text-xs text-muted-foreground mt-1">{CLUB_ADDRESS}</div>
            <div className="text-xs text-muted-foreground">
              {CLUB_EMAIL} · {CLUB_PHONE}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              QUOTE
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Date: {today.toLocaleDateString("en-IN", { dateStyle: "long" })}
            </div>
            <div className="text-xs text-muted-foreground">
              Valid until:{" "}
              {validUntil.toLocaleDateString("en-IN", { dateStyle: "long" })}
            </div>
          </div>
        </div>

        {/* To */}
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
            Prepared for
          </div>
          <div className="text-base font-semibold text-foreground">{lead.name}</div>
          {lead.email && (
            <div className="text-xs text-muted-foreground">{lead.email}</div>
          )}
          {lead.phone && (
            <div className="text-xs text-muted-foreground">{lead.phone}</div>
          )}
        </div>

        {/* Recommended Plan */}
        {recommendedPlan && (
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Recommended Membership Plan
            </div>
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-emerald-900 text-lg">
                    {recommendedPlan.name} Membership
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    {recommendedPlan.durationDays} days access
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-800">
                    ₹{Number(recommendedPlan.price).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    for {recommendedPlan.durationDays} days
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="text-center bg-white rounded border p-2">
                  <div className="font-semibold text-emerald-800">
                    {Number(recommendedPlan.courtDiscountPct)}%
                  </div>
                  <div className="text-muted-foreground">Court Discount</div>
                </div>
                <div className="text-center bg-white rounded border p-2">
                  <div className="font-semibold text-emerald-800">
                    {Number(recommendedPlan.shopDiscountPct)}%
                  </div>
                  <div className="text-muted-foreground">Pro Shop Discount</div>
                </div>
                <div className="text-center bg-white rounded border p-2">
                  <div className="font-semibold text-emerald-800">
                    {Number(recommendedPlan.barDiscountPct)}%
                  </div>
                  <div className="text-muted-foreground">Bar Discount</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Plans Comparison */}
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            All Available Plans
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-2 font-semibold">Plan</th>
                <th className="text-right p-2 font-semibold">Price</th>
                <th className="text-right p-2 font-semibold">Duration</th>
                <th className="text-right p-2 font-semibold">Court Disc.</th>
                <th className="text-right p-2 font-semibold">Shop Disc.</th>
                <th className="text-right p-2 font-semibold">Bar Disc.</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b last:border-0 ${
                    p.id === recommendedPlan?.id
                      ? "bg-emerald-50 font-semibold"
                      : ""
                  }`}
                >
                  <td className="p-2">
                    {p.name}
                    {p.id === recommendedPlan?.id && (
                      <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 rounded px-1 py-0.5">
                        Recommended
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    ₹{Number(p.price).toLocaleString("en-IN")}
                  </td>
                  <td className="p-2 text-right">{p.durationDays}d</td>
                  <td className="p-2 text-right">{Number(p.courtDiscountPct)}%</td>
                  <td className="p-2 text-right">{Number(p.shopDiscountPct)}%</td>
                  <td className="p-2 text-right">{Number(p.barDiscountPct)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
          <p>
            This quote is valid for <strong>30 days</strong> from the date above.
          </p>
          <p>
            To proceed, contact us at <strong>{CLUB_EMAIL}</strong> or visit the
            club at {CLUB_ADDRESS}.
          </p>
          <p className="mt-2 font-medium text-foreground">
            Thank you for your interest in The Champions Club.
          </p>
        </div>
      </div>
    </div>
  );
}
