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
import { Search, ScrollText, Building2 } from "lucide-react";

export type AuditLogRow = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorRole: string | null;
  organizationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string;
  organization: { id: string; name: string } | null;
  actor: { id: string; email: string; firstName: string; lastName: string } | null;
};

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ");
}

function metadataSummary(meta: Record<string, unknown> | null): string {
  if (!meta || typeof meta !== "object") return "—";
  const parts: string[] = [];
  const prefer = ["targetOrgName", "orgName", "orgSlug", "reason", "blocked"];
  for (const key of prefer) {
    if (meta[key] != null) {
      parts.push(String(meta[key]));
      if (parts.length >= 2) break;
    }
  }
  if (parts.length > 0) return parts.join(" · ");
  const entries = Object.entries(meta).slice(0, 2).map(([k, v]) => `${k}: ${v}`);
  return entries.length ? entries.join(" · ") : "—";
}

export function SystemLogView({ events }: { events: AuditLogRow[] }) {
  const [search, setSearch] = React.useState("");
  const [eventTypeFilter, setEventTypeFilter] = React.useState<string>("all");
  const [orgFilter, setOrgFilter] = React.useState<string>("all");

  const eventTypes = React.useMemo(
    () => [...new Set(events.map((e) => e.eventType))].sort(),
    [events]
  );
  const orgs = React.useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const e of events) {
      const o = e.organization;
      if (o && !seen.has(o.id)) {
        seen.add(o.id);
        list.push(o);
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [events]);

  const filtered = events.filter((e) => {
    const searchLower = search.toLowerCase().trim();
    const matchSearch =
      !searchLower ||
      (e.actor?.email?.toLowerCase().includes(searchLower)) ||
      (e.actor?.firstName?.toLowerCase().includes(searchLower)) ||
      (e.actor?.lastName?.toLowerCase().includes(searchLower)) ||
      e.eventType.toLowerCase().includes(searchLower) ||
      e.organization?.name?.toLowerCase().includes(searchLower);
    const matchEvent = eventTypeFilter === "all" || e.eventType === eventTypeFilter;
    const matchOrg =
      orgFilter === "all" || (e.organization?.id && e.organization.id === orgFilter);
    return matchSearch && matchEvent && matchOrg;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by event type, actor email, or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-2xl border-2 border-primary/10 focus:border-primary/30 transition-all bg-white/50 backdrop-blur-sm"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={(v) => setEventTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[200px] h-12 rounded-2xl border-2 border-primary/10 bg-white/50">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {eventTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {formatEventType(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orgFilter} onValueChange={(v) => setOrgFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[200px] h-12 rounded-2xl border-2 border-primary/10 bg-white/50">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-b p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            System / Audit log ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    Time
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Event
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Actor
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Organization
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-muted-foreground font-bold italic"
                    >
                      No events matching your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                          {formatEventType(e.eventType)}
                        </span>
                        {e.actorRole && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            ({e.actorRole})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {e.actor ? (
                          <span className="font-medium" title={`${e.actor.firstName} ${e.actor.lastName}`}>
                            {e.actor.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {e.organization ? (
                          <Link
                            href={`/super-admin/dealerships/${e.organization.id}`}
                            className="text-sm font-bold hover:text-primary transition-colors underline-offset-2 hover:underline inline-flex items-center gap-1"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            {e.organization.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-[240px] truncate" title={metadataSummary(e.metadata)}>
                        {metadataSummary(e.metadata)}
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
