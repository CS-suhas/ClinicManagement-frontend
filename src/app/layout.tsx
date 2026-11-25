import type { Metadata } from "next";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { ContainerProvider } from "@/di/container-provider";
import { AuthProvider } from "@/presentation/auth/auth-provider";
import { AppShell } from "@/presentation/components/app-shell";
import { NotificationProvider } from "@/presentation/components/notifications";

export const metadata: Metadata = {
  title: "MediPulse Life",
  description:
    "Admin console for clinics, providers, patients and appointments",
};

/**
 * Radix Themes only switches palettes through a `.dark` class, so mirror the
 * OS colour scheme onto <html> before first paint and keep it in sync.
 */
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
          <ContainerProvider>
            <NotificationProvider>
              <AuthProvider>
                <AppShell>{children}</AppShell>
              </AuthProvider>
            </NotificationProvider>
          </ContainerProvider>
        </Theme>
      </body>
    </html>
  );
}
