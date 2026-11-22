import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./calm.css";
// Variable fonts, bundled locally so the app renders identically offline.
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import AtlasDelight from "@/components/AtlasDelight";

// Fraunces gives the atlas its cartographic voice; opsz keeps it sharp at
// display sizes and warm at reading sizes.
const fontVars = `
  :root {
    --font-outfit: "Fraunces Variable", Georgia, "Times New Roman", serif;
    --font-inter: "Plus Jakarta Sans Variable", ui-sans-serif, system-ui, -apple-system, sans-serif;
    --font-atlas-mono: "JetBrains Mono Variable", ui-monospace, "SF Mono", monospace;
  }
`;

export const metadata: Metadata = {
  title: "ATLAS — A world worth knowing",
  description:
    "Turn your geography test list into an interactive map with flashcards, quizzes, and blank-map tests.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0d13",
};

const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('atlas_colorway');
    var dark = saved !== 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) { document.documentElement.classList.add("dark"); }
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: fontVars }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-canvas font-sans text-ink-900 antialiased">
        {children}
        <AtlasDelight/>
      </body>
    </html>
  );
}
