import type { Metadata } from "next";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { ContainerProvider } from "@/di/container-provider";
import { AppShell } from "@/presentation/components/app-shell";
import { NotificationProvider } from "@/presentation/components/notifications";

export const metadata: Metadata = {
  title: "MediPulse Life",
  description:
    "Admin console for clinics, providers, patients and appointments",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Theme accentColor="teal" grayColor="slate" radius="medium">
          <ContainerProvider>
            <NotificationProvider>
              <AppShell>{children}</AppShell>
            </NotificationProvider>
          </ContainerProvider>
        </Theme>
      </body>
    </html>
  );
}
