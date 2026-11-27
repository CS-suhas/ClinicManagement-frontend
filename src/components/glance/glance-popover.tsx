"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Button, Dialog, IconButton, Popover, Text } from "@radix-ui/themes";
import Link from "next/link";
import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CHIP_BUTTON_CLASS } from "@/components/ui/chip";

const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 150;
const SHEET_QUERY = "(max-width: 639px)";

let activeGlance: { id: string; close: () => void } | null = null;

export type GlanceRenderState = {
  open: boolean;
  close: () => void;
};

export type GlancePopoverProps = {
  trigger: ReactNode;
  label: string;
  children: (state: GlanceRenderState) => ReactNode;
  side?: "bottom" | "top";
  width?: number;
  onOpen?: () => void;
};

export function GlancePopover({
  trigger,
  label,
  children,
  side = "bottom",
  width = 320,
  onOpen,
}: GlancePopoverProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);

  const isOpen = useRef(false);
  const pinned = useRef(false);
  const hovering = useRef(false);
  const openedByHover = useRef(false);
  const escaped = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const query = window.matchMedia(SHEET_QUERY);
    const update = () => setSheet(query.matches);
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
      if (activeGlance?.id === id) activeGlance = null;
    };
  }, [id]);

  const clearTimers = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  };

  const close = (reason: "escape" | "other" = "other") => {
    clearTimers();
    escaped.current = reason === "escape";
    isOpen.current = false;
    pinned.current = false;
    setOpen(false);
    if (activeGlance?.id === id) activeGlance = null;
  };

  const show = (pin: boolean, byHover: boolean) => {
    clearTimers();
    if (!isOpen.current) {
      if (activeGlance && activeGlance.id !== id) activeGlance.close();
      activeGlance = { id, close: () => close("other") };
      isOpen.current = true;
      openedByHover.current = byHover;
      setOpen(true);
      onOpenRef.current?.();
    }
    if (pin) pinned.current = true;
  };

  const scheduleClose = () => {
    if (pinned.current || !isOpen.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!hovering.current && !pinned.current) close("other");
    }, CLOSE_DELAY_MS);
  };

  const enterMouse = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    hovering.current = true;
    clearTimeout(closeTimer.current);
    if (!isOpen.current) {
      clearTimeout(openTimer.current);
      openTimer.current = setTimeout(() => show(false, true), OPEN_DELAY_MS);
    }
  };

  const leaveMouse = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    hovering.current = false;
    clearTimeout(openTimer.current);
    scheduleClose();
  };

  const onTriggerClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen.current && pinned.current) {
      pinned.current = false;
      if (!hovering.current) close("other");
      return;
    }
    show(true, false);
  };

  const stop = (e: MouseEvent) => e.stopPropagation();

  const triggerButton = (
    <button
      type="button"
      aria-label={label}
      className={CHIP_BUTTON_CLASS}
      onClick={onTriggerClick}
      onPointerEnter={enterMouse}
      onPointerLeave={leaveMouse}
    >
      {trigger}
    </button>
  );

  const body = <>{children({ open, close: () => close("other") })}</>;

  if (sheet) {
    return (
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) close("other");
        }}
      >
        <Dialog.Trigger>{triggerButton}</Dialog.Trigger>
        <Dialog.Content
          aria-label={label}
          maxWidth="100%"
          className="mp-glance"
          onClick={stop}
          style={{
            position: "fixed",
            top: "auto",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            maxHeight: "70vh",
            transform: "none",
            margin: 0,
            padding: 0,
            borderRadius: "16px 16px 0 0",
            overflowY: "auto",
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-10 rounded-full"
            style={{ background: "var(--mp-paper-deep)" }}
          />
          <div className="flex justify-end px-3 pt-1">
            <Dialog.Close>
              <IconButton
                variant="ghost"
                color="gray"
                aria-label="Close details"
              >
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <div className="px-4 pb-2">{body}</div>
        </Dialog.Content>
      </Dialog.Root>
    );
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close(escaped.current ? "escape" : "other");
      }}
    >
      <Popover.Trigger>{triggerButton}</Popover.Trigger>
      <Popover.Content
        side={side}
        align="start"
        sideOffset={8}
        collisionPadding={12}
        aria-label={label}
        className="mp-glance"
        onClick={stop}
        onPointerEnter={enterMouse}
        onPointerLeave={leaveMouse}
        onEscapeKeyDown={() => {
          escaped.current = true;
        }}
        onOpenAutoFocus={(e) => {
          if (openedByHover.current) e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          if (!escaped.current) e.preventDefault();
          escaped.current = false;
        }}
        style={{
          width,
          maxWidth: "calc(100vw - 24px)",
          padding: 0,
          borderRadius: 16,
          border: "1px solid var(--mp-paper-deep)",
          background: "var(--mp-surface)",
          boxShadow: "0 16px 40px -16px var(--mp-shadow)",
        }}
      >
        <div className="p-4">{body}</div>
      </Popover.Content>
    </Popover.Root>
  );
}

export function GlanceHeader({
  avatar,
  title,
  subtitle,
}: {
  avatar: ReactNode;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 pr-2">
      <div className="shrink-0">{avatar}</div>
      <div className="min-w-0">
        <Text
          as="p"
          weight="bold"
          size="3"
          className="truncate"
          style={{ color: "var(--mp-ink)" }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            as="p"
            size="1"
            className="truncate"
            style={{ color: "var(--mp-muted)" }}
          >
            {subtitle}
          </Text>
        )}
      </div>
    </div>
  );
}

export function GlanceSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-3 first:mt-0">
      {title && (
        <h3
          className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--mp-muted)" }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

export function GlanceFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-4 flex flex-wrap gap-2 border-t pt-3"
      style={{ borderColor: "var(--mp-paper-deep)" }}
    >
      {children}
    </div>
  );
}

export function GlanceSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true">
      <output className="sr-only">Loading details…</output>
      {Array.from({ length: rows }, (_, row) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows never reorder
          key={row}
          className="block h-3 rounded-full motion-safe:animate-pulse"
          style={{
            width: row === rows - 1 ? "55%" : "100%",
            background: "var(--mp-paper-deep)",
          }}
        />
      ))}
    </div>
  );
}

export function GlanceError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Text size="2" style={{ color: "var(--mp-red-ink)" }}>
        {message}
      </Text>
      <Button size="1" variant="soft" color="red" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function GlanceAction({
  href,
  children,
  icon,
  primary = false,
  external = false,
  disabledReason,
}: {
  href: string | null;
  children: ReactNode;
  icon?: ReactNode;
  primary?: boolean;
  external?: boolean;
  disabledReason?: string;
}) {
  const variant = primary ? "solid" : "soft";
  if (!href)
    return (
      <Button
        size="2"
        variant="soft"
        color="gray"
        disabled
        title={disabledReason}
      >
        {icon}
        {children}
      </Button>
    );
  if (href.startsWith("/"))
    return (
      <Button size="2" variant={variant} color="teal" asChild>
        <Link href={href}>
          {icon}
          {children}
        </Link>
      </Button>
    );
  return (
    <Button size="2" variant={variant} color="teal" asChild>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {icon}
        {children}
      </a>
    </Button>
  );
}
