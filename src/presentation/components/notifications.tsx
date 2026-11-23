"use client";

import { Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Callout, Flex, IconButton } from "@radix-ui/themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

const DISMISS_AFTER_MS = 8000;

interface Notification {
  id: number;
  message: string;
}

interface Notifier {
  /** Shows a popup for a failed action; it dismisses itself after a while. */
  notifyError: (message: string) => void;
}

const NotificationContext = createContext<Notifier | null>(null);

/** Renders failure popups in the corner and exposes `useNotify`. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setItems((current) => current.filter((n) => n.id !== id)),
    [],
  );

  const notifier = useMemo<Notifier>(
    () => ({
      notifyError: (message) => {
        const id = nextId.current++;
        setItems((current) => [...current, { id, message }]);
        window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
      },
    }),
    [dismiss],
  );

  return (
    <NotificationContext.Provider value={notifier}>
      {children}
      <Flex
        direction="column"
        gap="2"
        role="region"
        aria-label="Notifications"
        style={{
          position: "fixed",
          right: "var(--space-4)",
          bottom: "var(--space-4)",
          zIndex: 100,
          maxWidth: "min(420px, calc(100vw - 2 * var(--space-4)))",
        }}
      >
        {items.map((n) => (
          <Callout.Root
            key={n.id}
            color="red"
            role="alert"
            size="1"
            style={{ display: "flex", alignItems: "center" }}
          >
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text style={{ flex: 1 }}>{n.message}</Callout.Text>
            <IconButton
              size="1"
              variant="ghost"
              color="red"
              aria-label="Dismiss notification"
              style={{ marginLeft: "auto", flexShrink: 0 }}
              onClick={() => dismiss(n.id)}
            >
              <Cross2Icon />
            </IconButton>
          </Callout.Root>
        ))}
      </Flex>
    </NotificationContext.Provider>
  );
}

export function useNotify(): Notifier {
  const notifier = useContext(NotificationContext);
  if (!notifier)
    throw new Error("useNotify must be used inside <NotificationProvider>");
  return notifier;
}
