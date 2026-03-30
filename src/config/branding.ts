export const BRANDING = {
  companyName: "Vehiclix",
  platformDomain: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 
                  (process.env.NODE_ENV === "development" ? "localhost:3000" : "vehiclix.app"),
  slogan: "Modern Dealership Operating System",
  description: "The premium multi-tenant platform for boutique electric vehicle dealerships. Manage inventory, track deals, and provide a world-class showroom experience.",
  contact: {
    email: "hello@vehiclix.com",
    phone: "(555) 000-0000",
    address: "Vehiclix HQ, Silicon Valley, CA",
  },
  socials: {
    instagram: "https://instagram.com/vehiclix",
    twitter: "https://twitter.com/vehiclix",
    linkedin: "https://linkedin.com/company/vehiclix",
  },
  metadata: {
    titleTemplate: "%s | Vehiclix",
    defaultTitle: "Vehiclix | Modern Dealership OS",
  },
};
