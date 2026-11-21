import Link from "next/link";
import { searchMembers, getPlans } from "@/lib/services/members";
import { MemberSearchInput } from "@/components/admin/member-search-input";
import { RegisterMemberDialog } from "@/components/admin/register-member-dialog";
import { Eye, ArrowRight, ShieldCheck, Clock, AlertOctagon, ChevronLeft, ChevronRight, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  console.time("[Route: /admin/members] searchMembers + getPlans");
  const { q, page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const [{ members, total, page, totalPages }, plans] = await Promise.all([
    searchMembers(q, currentPage, 20),
    getPlans(),
  ]);
  console.timeEnd("[Route: /admin/members] searchMembers + getPlans");

  return (
    <div className="space-y-6">
      {/* Page Title & Primary Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
            Club Membership Roster
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage member privileges, entitlement status, renewals, and turnstile tokens.
          </p>
        </div>
        <RegisterMemberDialog plans={plans} />
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
        <div className="flex-1 max-w-md">
          <MemberSearchInput initialQuery={q} />
        </div>
        <div className="text-xs text-[#64748B] flex items-center gap-1 self-center">
          <span>Total:</span>
          <strong className="font-semibold text-[#0F172A]">{total}</strong>
          <span>members</span>
          {totalPages > 1 && (
            <span className="text-gray-400 ml-1">
              • Page {page} of {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#64748B] font-semibold">
                <th className="py-3 px-4 w-32">Member No</th>
                <th className="py-3 px-4">Name & Email</th>
                <th className="py-3 px-4 w-28">Plan</th>
                <th className="py-3 px-4 w-32">Status</th>
                <th className="py-3 px-4 text-right w-44">Privileges</th>
                <th className="py-3 px-4 w-32">Valid Until</th>
                <th className="py-3 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {members.length > 0 ? (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors h-11">
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#0F172A]">
                      {m.membershipNo}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[#0F172A]">{m.name}</div>
                      <div className="text-[11px] text-[#64748B]">{m.email}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                        {m.planName}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {m.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="h-3 w-3" /> ACTIVE
                        </span>
                      )}
                      {m.status === "GRACE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" /> 7D GRACE
                        </span>
                      )}
                      {m.status === "EXPIRED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertOctagon className="h-3 w-3" /> EXPIRED
                        </span>
                      )}
                      {m.status === "WALK_IN" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                          <User className="h-3 w-3" /> WALK-IN
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#64748B] font-mono">
                      {m.courtDiscountPct}% Crt • {m.shopDiscountPct}% Shop
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B]">
                      {m.endsAt
                        ? new Date(m.endsAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B2C] hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-xs text-[#64748B]">
                    No members match your search criteria. Try a different query or register a new member above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="py-3 px-4 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#64748B]">
            <div>
              Showing {members.length} of {total} records
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/members?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${Math.max(1, page - 1)}`}
                className={`p-1.5 rounded border border-[#E5E7EB] bg-white text-[#0F172A] hover:bg-gray-50 flex items-center gap-1 ${
                  page <= 1 ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Link>
              <span className="font-medium text-[#0F172A]">
                {page} / {totalPages}
              </span>
              <Link
                href={`/admin/members?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${Math.min(totalPages, page + 1)}`}
                className={`p-1.5 rounded border border-[#E5E7EB] bg-white text-[#0F172A] hover:bg-gray-50 flex items-center gap-1 ${
                  page >= totalPages ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
