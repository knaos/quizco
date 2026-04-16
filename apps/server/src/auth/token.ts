import crypto from "crypto";

export type AuthRole = "host" | "admin";

interface TokenPayload {
  role: AuthRole;
  exp: number;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueAuthToken(
  role: AuthRole,
  secret: string,
  ttlSeconds: number,
  now = Date.now(),
): string {
  const payload: TokenPayload = {
    role,
    exp: now + ttlSeconds * 1000,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createSignature(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(
  token: string,
  secret: string,
  now = Date.now(),
): TokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as TokenPayload;
    if (
      !payload ||
      (payload.role !== "host" && payload.role !== "admin") ||
      typeof payload.exp !== "number" ||
      payload.exp <= now
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
