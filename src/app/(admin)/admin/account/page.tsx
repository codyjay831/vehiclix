import { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account | Admin",
};

export default async function AdminAccountPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9] italic">
          Your <span className="text-primary">Account</span>
        </h1>
        <p className="text-muted-foreground font-medium text-sm">
          Signed in as <span className="text-foreground font-bold">{user.email}</span>
        </p>
      </div>

      <Card className="rounded-2xl border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight italic">
            <KeyRound className="h-5 w-5 text-primary" />
            Change password
          </CardTitle>
          <CardDescription className="text-sm font-medium">
            Use a strong password you do not reuse on other sites.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
