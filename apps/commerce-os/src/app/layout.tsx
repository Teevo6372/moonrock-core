import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Moonrock Commerce OS",
  description: "Internal commerce intelligence and operating platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
