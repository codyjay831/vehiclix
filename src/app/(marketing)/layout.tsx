import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar userRole={user?.role || null} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
