import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Browsers expose `crypto.subtle` and `crypto.randomUUID` only in secure
 * contexts (HTTPS, or http://localhost). The deployment is served over plain
 * HTTP on an IP address, where both are missing: PKCE cannot hash its code
 * verifier and new record ids cannot be generated.
 *
 * On such a page this fills in exactly those two: `subtle.digest("SHA-256")`
 * from @noble/hashes and a v4 UUID from `crypto.getRandomValues` (which is
 * available everywhere). It does nothing on a secure page or on the server.
 * Remove it once the app is served over HTTPS.
 */
export function ensureCryptoInInsecureContext(): void {
  if (typeof window === "undefined" || window.isSecureContext) return;
  const target = window.crypto as Partial<Crypto> | undefined;
  if (!target?.getRandomValues) return;

  if (!target.subtle) {
    const digest = async (
      algorithm: AlgorithmIdentifier,
      data: BufferSource,
    ): Promise<ArrayBuffer> => {
      const name = typeof algorithm === "string" ? algorithm : algorithm.name;
      if (name.toUpperCase() !== "SHA-256")
        throw new Error(`${name} is not available outside a secure context.`);
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      return sha256(bytes).slice().buffer as ArrayBuffer;
    };
    Object.defineProperty(target, "subtle", {
      value: { digest },
      configurable: true,
    });
  }

  if (typeof target.randomUUID !== "function") {
    const randomUUID =
      (): `${string}-${string}-${string}-${string}-${string}` => {
        const b = window.crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
        return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
      };
    Object.defineProperty(target, "randomUUID", {
      value: randomUUID,
      configurable: true,
    });
  }
}
