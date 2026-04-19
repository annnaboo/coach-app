import type { Metadata } from "next";
import "./globals.css";
import { globalAnimationCSS } from '@/lib/design/animations'

export const metadata: Metadata = {
  title: "Coach App",
  description: "Твой тренировочный дневник",
};

const enablePausaTilt = process.env.NEXT_PUBLIC_ENABLE_PAUSA_TILT === 'true'

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
        <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400&family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=chillax@300,400,500&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7a4a20" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Coach App" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <style dangerouslySetInnerHTML={{ __html: globalAnimationCSS }} />
      </head>
      <body className={`min-h-full flex flex-col${enablePausaTilt ? ' pausa-tilt' : ''}`}>
        {children}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
            })
          }
        `}} />
      </body>
    </html>
  );
}