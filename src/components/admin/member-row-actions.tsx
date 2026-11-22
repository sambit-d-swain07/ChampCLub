"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnbanMemberDialog } from "@/components/admin/unban-member-dialog";

interface MemberRowActionsProps {
  member: {
    id: string;
    membershipNo: string;
    name: string;
    banned?: boolean;
  };
  isOwner: boolean;
}

export function MemberRowActions({ member, isOwner }: MemberRowActionsProps) {
  const [unbanOpen, setUnbanOpen] = useState(false);

  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <Link
        href={`/admin/members/${member.id}`}
        prefetch={false}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B2C] hover:underline"
      >
        <Eye className="h-3.5 w-3.5" />
        <span>Manage</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Row actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 bg-white shadow-md border border-gray-200 p-1">
          <DropdownMenuItem
            onClick={() => {
              window.location.href = `/admin/members/${member.id}`;
            }}
            className="flex items-center gap-2 cursor-pointer text-xs"
          >
            <Eye className="h-3.5 w-3.5 text-gray-500" />
            <span>Manage</span>
          </DropdownMenuItem>
          {member.banned && isOwner && (
            <DropdownMenuItem
              onClick={() => setUnbanOpen(true)}
              className="flex items-center gap-2 cursor-pointer text-xs text-emerald-700 hover:text-emerald-800 focus:text-emerald-800 font-medium"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Unban</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {member.banned && isOwner && (
        <UnbanMemberDialog
          memberId={member.id}
          membershipNo={member.membershipNo}
          memberName={member.name}
          open={unbanOpen}
          onOpenChange={setUnbanOpen}
        />
      )}
    </div>
  );
}
