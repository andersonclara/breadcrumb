import type { Metadata } from "next";
import "./globals.css";
import {LocationSharingProvider} from "@/components/location-sharing";

export const metadata: Metadata = {
  title: "Breadcrumb · Leave a crumb. Spread the word.",
  description: "A shared, community-powered map of what's happening around the University of Florida.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><LocationSharingProvider>{children}</LocationSharingProvider></body>
    </html>
  );
}
