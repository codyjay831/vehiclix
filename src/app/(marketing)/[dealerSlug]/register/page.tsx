import { Metadata } from "next";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
import { DealerRegisterForm } from "@/components/public/DealerRegisterForm";

interface DealerRegisterPageProps {
  params: Promise<{ dealerSlug: string }>;
}

export async function generateMetadata({ params }: DealerRegisterPageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) return { title: "Register" };

  const canonical = getCanonicalUrl(org, "/register");

  return {
    title: "Create Account",
    description: `Create your customer account at ${org.name} to track your electric vehicle deals and inquiries.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
}

export default async function DealerRegisterPage() {
  return <DealerRegisterForm />;
}
