"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Shield, UserCheck, UserX, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createStaffAction, toggleStaffStatusAction } from "@/app/actions/staff";

export interface StaffItem {
  id: string;
  name: string;
  email: string;
  role: string;
  bannedAt: Date | string | null;
  createdAt: Date | string;
}

interface StaffManagementProps {
  staffList: StaffItem[];
  title?: string;
  showCardWrapper?: boolean;
}

export function StaffManagement({
  staffList,
  title = "Staff Management",
  showCardWrapper = true,
}: StaffManagementProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = await createStaffAction({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create staff member.");
      return;
    }

    setSuccessMsg(`Staff account for ${name} created successfully.`);
    setName("");
    setEmail("");
    setPassword("");
    setTimeout(() => {
      setModalOpen(false);
      setSuccessMsg(null);
      router.refresh();
    }, 1200);
  };

  const handleToggleStatus = async (staffId: string) => {
    setTogglingId(staffId);
    await toggleStaffStatusAction(staffId);
    setTogglingId(null);
    router.refresh();
  };

  const content = (
    <div className="space-y-4">
      {/* Top Header inside section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1F4A33]" />
            {title} ({staffList.length})
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Personnel with staff-level portal permissions (courts, pro shop, bar tabs, and check-ins).
          </p>
        </div>

        <Button
          onClick={() => {
            setError(null);
            setSuccessMsg(null);
            setModalOpen(true);
          }}
          size="sm"
          className="h-8 px-3.5 text-xs font-semibold bg-[#1F4A33] text-white hover:bg-[#163826] transition-colors rounded-lg flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Staff</span>
        </Button>
      </div>

      {/* Staff List Table */}
      <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#64748B]">
                    No staff members registered yet. Click &quot;Add New Staff&quot; to invite a team member.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => {
                  const isBanned = !!staff.bannedAt;
                  const dateStr = new Date(staff.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={staff.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#1F4A33]/10 text-[#1F4A33] flex items-center justify-center font-bold text-[11px] shrink-0">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#0F172A] truncate">{staff.name}</div>
                            <div className="text-[11px] text-[#64748B] truncate">{staff.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="bg-[#1F4A33]/5 text-[#1F4A33] border-[#1F4A33]/20 font-semibold text-[10px] tracking-wide uppercase px-2 py-0.5"
                        >
                          STAFF
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-[#64748B]">
                        {dateStr}
                      </td>

                      <td className="py-3 px-4">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            Deactivated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={togglingId === staff.id}
                          onClick={() => handleToggleStatus(staff.id)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${
                            isBanned
                              ? "text-emerald-700 hover:bg-emerald-50 border border-emerald-300"
                              : "text-red-600 hover:bg-red-50 border border-red-200"
                          } disabled:opacity-50`}
                        >
                          {togglingId === staff.id ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Updating
                            </span>
                          ) : isBanned ? (
                            "Reactivate"
                          ) : (
                            "Deactivate"
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#E2E8F0] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Add New Staff Member</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Create a team account with staff portal credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  {successMsg}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-name" className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#64748B]" />
                  Full Name
                </Label>
                <Input
                  id="staff-name"
                  placeholder="e.g. Ramesh Chandra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs border-[#CBD5E1]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-email" className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                  Work Email Address
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="e.g. ramesh@chamclub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 text-xs border-[#CBD5E1]"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-pwd" className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                  Initial Password (min 8 characters)
                </Label>
                <Input
                  id="staff-pwd"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-9 text-xs border-[#CBD5E1]"
                />
                <p className="text-[10px] text-[#64748B]">
                  The staff member will use this password to sign in at the club login page.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F1F5F9]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={loading}
                  className="h-8 text-xs font-semibold border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-8 text-xs font-semibold bg-[#1F4A33] text-white hover:bg-[#163826]"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Staff...
                    </span>
                  ) : (
                    "Create Staff Account"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <Card className="shadow-none border border-[#E2E8F0] bg-white">
      <CardContent className="p-5">
        {content}
      </CardContent>
    </Card>
  );
}
