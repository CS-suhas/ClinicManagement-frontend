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
import { CHIP_BUTTON_CLASS } from "../ui/chip";

/** Hover opens after this delay and closes after the pointer leaves for the grace period. */
const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 150;
const SHEET_QUERY = "(max-width: 639px)";

/** Only one glance is open at a time; opening one closes the others. */
let activeGlance: { id: string; close: () => void } | null = null;

export interface GlanceRenderState {
  /** True while the card is open. Children only mount while open, so they can fetch lazily. */
  open: boolean;
  /** Closes the card and returns focus to the trigger. */
  close: () => void;
}

export interface GlancePopoverProps {
  /** Shown inside the trigger button, normally a Chip, StatusDot or AvatarStack. */
  trigger: ReactNode;
  /** Accessible name of the trigger, e.g. "Patient Asha Perera, show details". */
  label: string;
  /** Card content. Receives the open state and a close function. */
  children: (state: GlanceRenderState) => ReactNode;
  /** Side of the trigger on desktop. Defaults to "bottom". */
  side?: "bottom" | "top";
  /** Desktop card width in px. Defaults to 320. */
  width?: number;
  /** Runs each time the card opens, e.g. to start a fetch. */
  onOpen?: () => void;
}

/**
 * A button that shows a detail card. One component covers every input:
 * - Mouse: hovering opens after 250 ms and closes 150 ms after leaving the
 *   trigger and card. A click pins the card open; clicking a pinned card
 *   unpins it.
 * - Touch: a tap toggles and pins the card.
 * - Keyboard: Enter or Space opens and pins; focus moves into the card; Esc
 *   closes and returns focus to the trigger. Hover-opening never moves focus.
 * Below 640 px the card becomes a bottom sheet (a dialog), full width.
 * Clicks never reach an enclosing row.
 */
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

  /** Starts the grace period after a pointer leaves, unless the card is pinned. */
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
    // This component owns the open state, so stop Radix's own toggle and the row click.
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
          // Focus goes back to the trigger only after Esc, never after a hover or outside click.
          if (!escaped.current) e.preventDefault();
          escaped.current = false;
        }}
        style={{
          width,
          maxWidth: "calc(100vw - 24px)",
          padding: 0,
          borderRadius: 16,
          border: "1px solid var(--mp-paper-deep)",
          background: "#fff",
          boxShadow: "0 16px 40px -16px rgb(19 41 45 / 0.28)",
        }}
      >
        <div className="p-4">{body}</div>
      </Popover.Content>
    </Popover.Root>
  );
}

/* ----------------------------------------------------------------------
 * Card building blocks. Entity glances compose these so every card looks
 * the same: header, body sections, a footer of actions.
 * ---------------------------------------------------------------------- */

/** Avatar, title and an optional subtitle at the top of a card. */
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

/** A labelled block inside the card body. */
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

/** Action row at the bottom of a card. */
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

/** Placeholder of the card's height while its data loads. */
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

/** One line of explanation with a Retry button; the card keeps its seed details above it. */
export function GlanceError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Text size="2" style={{ color: "#9b1c1c" }}>
        {message}
      </Text>
      <Button size="1" variant="soft" color="red" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/**
 * An action in a card's footer. `href` is an internal path (client link), an
 * external URL, or a tel:/mailto: link. A null href renders a disabled button,
 * so the action is visible but cannot be used.
 */
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
  /** Filled teal instead of soft. */
  primary?: boolean;
  external?: boolean;
  /** Shown as the button's title when `href` is null. */
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
