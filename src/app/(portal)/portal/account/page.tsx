import { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account | Portal",
};

export default async function PortalAccountPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9] italic">
          Your <span className="text-primary">Account</span>
        </h1>
        <p className="text-muted-foreground font-medium text-sm">
          Signed in as <span className="text-foreground font-bold">{user.email}</span>
        </p>
      </div>

      <Card className="rounded-[2rem] border-2 max-w-xl">
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
