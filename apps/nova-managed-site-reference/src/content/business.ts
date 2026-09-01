export interface BusinessProfile {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  hours: Record<string, string>;
  serviceAreas: string[];
  services: Array<{ name: string; description: string }>;
  testimonials: Array<{ quote: string; author: string }>;
  faqs: Array<{ question: string; answer: string }>;
  ctas: { primary: string; secondary: string };
  socialLinks: Record<string, string>;
}

export const business: BusinessProfile = {
  name: "Northstar Home Services",
  tagline: "Reliable home service without the runaround.",
  phone: "(785) 555-0147",
  email: "hello@northstar.example",
  hours: {
    Monday: "8:00 AM–5:00 PM",
    Tuesday: "8:00 AM–5:00 PM",
    Wednesday: "8:00 AM–5:00 PM",
    Thursday: "8:00 AM–5:00 PM",
    Friday: "8:00 AM–5:00 PM",
    Saturday: "8:00 AM–2:00 PM",
    Sunday: "Closed",
  },
  serviceAreas: ["Lawrence", "Perry", "Tonganoxie", "Eudora"],
  services: [
    { name: "Repairs", description: "Fast diagnosis and straightforward repair recommendations." },
    { name: "Maintenance", description: "Preventive service designed to reduce surprise breakdowns." },
    { name: "Installations", description: "Professional replacement and installation with clear expectations." },
  ],
  testimonials: [
    { quote: "They showed up when promised and explained everything clearly.", author: "Reference Customer" },
  ],
  faqs: [
    { question: "Do you provide estimates?", answer: "Yes. Contact us and we will confirm the right next step for your project." },
    { question: "What areas do you serve?", answer: "We serve Lawrence and selected nearby communities." },
  ],
  ctas: { primary: "Request Service", secondary: "Call Now" },
  socialLinks: { facebook: "#", instagram: "#" },
};
