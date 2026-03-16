"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Copy, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";

export type GlobalUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date | string;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export function GlobalUserDirectory({ users }: { users: GlobalUserRow[] }) {
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase().trim();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const email = u.email.toLowerCase();
    const orgName = u.organization?.name?.toLowerCase() ?? "";
    const orgSlug = u.organization?.slug?.toLowerCase() ?? "";

    const matchesSearch =
      !searchLower ||
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      orgName.includes(searchLower) ||
      orgSlug.includes(searchLower);

    const matchesRole =
      roleFilter === "all" || (u.role as string) === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-2xl border-2 border-primary/10 focus:border-primary/30 transition-all bg-white/50 backdrop-blur-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-2xl border-2 border-primary/10 bg-white/50">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value={Role.OWNER}>OWNER</SelectItem>
            <SelectItem value={Role.CUSTOMER}>CUSTOMER</SelectItem>
            <SelectItem value={Role.SUPER_ADMIN}>SUPER_ADMIN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-b p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    User
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Email
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Role
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Organization
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-muted-foreground font-bold italic"
                    >
                      No users matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-muted/5 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
                            <UserCircle className="h-5 w-5 text-primary/40" />
                          </div>
                          <div className="font-bold">
                            {u.firstName} {u.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(u.email)}
                          className="text-sm font-medium text-primary hover:underline underline-offset-2 inline-flex items-center gap-1.5 cursor-pointer"
                          title="Copy email"
                        >
                          {u.email}
                          <Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.organization ? (
                          <Link
                            href={`/super-admin/dealerships/${u.organization.id}`}
                            className="text-sm font-bold hover:text-primary transition-colors underline-offset-2 hover:underline"
                          >
                            {u.organization.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            —
                          </span>
                        )}
                        {u.organization && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            /{u.organization.slug}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
