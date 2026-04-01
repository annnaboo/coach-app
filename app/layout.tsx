import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coach App",
  description: "Твой тренировочный дневник",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=chillax@300,400,500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}