import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI RoadMap",
  description: "AI-powered personalized learning roadmaps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}