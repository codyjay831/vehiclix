import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
