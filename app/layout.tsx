import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "HOLDFAST",
  description: "Submit your claim. We hold it to the truth. AI-powered insurance claims verification on GenLayer — now with multi-party dispute resolution.",
  openGraph: {
    title: "HOLDFAST v2 — On-Chain Claims Verification",
    description: "Single-party and multi-party insurance claims. AI reads every account. The chain remembers every verdict.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
