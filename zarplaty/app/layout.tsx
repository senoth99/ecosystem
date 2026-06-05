import "./globals.css";
import type { Metadata } from "next";
import { EcosystemBackButton } from "@/components/EcosystemBackButton";

export const metadata: Metadata = {
  title: "Зарплаты сотрудников",
  description: "Панель зарплат",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <EcosystemBackButton />
      </body>
    </html>
  );
}
