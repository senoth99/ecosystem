import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casher Ecosystem",
  description: "Единый вход во все приложения"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
