const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;

export const isBlank = (v: string | undefined | null) => !v || v.trim() === "";
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isPhone = (v: string) => PHONE_RE.test(v.trim());
export const isValidDate = (v: string) => !Number.isNaN(Date.parse(v));
