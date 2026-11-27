"use client";

import {
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
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

const ERROR_MS = 8000;
const SUCCESS_MS = 4000;
const MAX_VISIBLE = 3;

type Tone = "error" | "success" | "info";

type Notification = {
  id: number;
  tone: Tone;
  message: string;
};

export type Notifier = {
  notifyError: (message: string) => void;
  notifySuccess: (message: string) => void;
  notifyInfo: (message: string) => void;
};

const NotificationContext = createContext<Notifier | null>(null);

const TONE_COLOR: Record<Tone, "red" | "teal" | "blue"> = {
  error: "red",
  success: "teal",
  info: "blue",
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((n) => n.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      const duration = tone === "error" ? ERROR_MS : SUCCESS_MS;
      const item: Notification = { id, tone, message };
      setItems((current) => [...current, item].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  const notifier = useMemo<Notifier>(
    () => ({
      notifyError: (message) => push("error", message),
      notifySuccess: (message) => push("success", message),
      notifyInfo: (message) => push("info", message),
    }),
    [push],
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
            color={TONE_COLOR[n.tone]}
            role={n.tone === "error" ? "alert" : "status"}
            aria-live={n.tone === "error" ? "assertive" : "polite"}
            size="1"
            style={{ display: "flex", alignItems: "center" }}
          >
            <Callout.Icon>
              {n.tone === "error" && <ExclamationTriangleIcon />}
              {n.tone === "success" && <CheckCircledIcon />}
              {n.tone === "info" && <InfoCircledIcon />}
            </Callout.Icon>
            <Callout.Text style={{ flex: 1 }}>{n.message}</Callout.Text>
            <IconButton
              size="1"
              variant="ghost"
              color={TONE_COLOR[n.tone]}
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
