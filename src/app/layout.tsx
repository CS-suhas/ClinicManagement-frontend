import type { Metadata } from "next";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { AppShell } from "@/components/app-shell";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MediPulse Life",
  description:
    "Admin console for clinics, providers, patients and appointments",
};

const COLOR_SCHEME_SCRIPT = `(() => {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", media.matches);
  apply();
  media.addEventListener("change", apply);
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static inline script, no user input
          dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_SCRIPT }}
        />
      </head>
      <body>
        <Theme accentColor="teal" grayColor="slate" radius="medium">
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </Theme>
      </body>
    </html>
  );
}
