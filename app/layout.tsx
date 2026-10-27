import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "苏格拉底的提问方法｜思维闪电 · Socratic Rush",
  description: "Mark & Daddy 系列 02：45 秒提问竞技。100 个三语挑战、双手机 PK、实时比分、成就与苏格拉底技能卡。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
