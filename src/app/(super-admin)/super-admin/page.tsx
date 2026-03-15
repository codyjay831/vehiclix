import { redirect } from "next/navigation";

/**
 * Super Admin dashboard index.
 * Currently redirects to the requests view.
 */
export default async function SuperAdminPage() {
  redirect("/super-admin/requests");
}
