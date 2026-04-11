import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Recruiter — Hire Smarter with AI-Powered Screening",
  description:
    "Import candidates, let AI screen them with natural phone calls, score responses, and auto-schedule interviews. Cut hiring time by 85%.",
  keywords: ["AI recruiting", "candidate screening", "automated hiring", "AI phone interview"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      allowedRedirectOrigins={["https://equiponderant-erica-nonderogatively.ngrok-free.dev"]}
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: "#3b82f6" },
        elements: {
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 !text-white",
          cardTitle: "text-white",
          socialButtonsBlockButton:
            "!text-white !border-gray-700 !hover:!bg-gray-800",
          formFieldInput:
            "!bg-gray-900 !border-gray-700 !text-white !placeholder:text-gray-500",
          footerActionLink:
            "!text-blue-400 !hover:text-blue-300",
        },
      }}
    >
      <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
