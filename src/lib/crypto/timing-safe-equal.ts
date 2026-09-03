import crypto from "crypto";

export function timingSafeEqualString(
  expected: string,
  received: string
): boolean {
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(received);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
