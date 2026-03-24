import "@fontsource/outfit/latin.css";
import "./globals.css";

import AppProviders from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="dark:bg-gray-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
