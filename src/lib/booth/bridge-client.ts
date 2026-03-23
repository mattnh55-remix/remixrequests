// src/lib/booth/bridge-client.ts

type TriggerInterstitialPlaybackInput = {
  filename: string;
  locationId: string;
  sessionId: string;
  assetId: string;
};

type BridgePlaySuccess = {
  ok: true;
  attempted: true;
  status: number;
  url: string;
  responseBody: unknown;
};

type BridgePlayFailure = {
  ok: false;
  attempted: true;
  url: string;
  error: string;
};

export type BridgePlayResult = BridgePlaySuccess | BridgePlayFailure;

const DEFAULT_BRIDGE_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_TIMEOUT_MS = 1000;
const DEFAULT_RETRY_COUNT = 1;

function getBridgeBaseUrl() {
  const raw = process.env.BRIDGE_BASE_URL?.trim();
  return raw || DEFAULT_BRIDGE_BASE_URL;
}

function sanitizeBridgeFilename(raw: string): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;

  const withoutQuery = value.split("?")[0].split("#")[0];
  const normalized = withoutQuery.replace(/\\/g, "/");
  const lastSegment = normalized.split("/").filter(Boolean).pop() || "";

  if (!lastSegment) return null;

  try {
    return decodeURIComponent(lastSegment).trim() || null;
  } catch {
    return lastSegment.trim() || null;
  }
}

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}

async function postBridgePlayOnce(
  url: string,
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<BridgePlayResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    const responseBody = await readJsonSafe(response);

    if (!response.ok) {
      return {
        ok: false,
        attempted: true,
        url,
        error: `Bridge returned HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      attempted: true,
      status: response.status,
      url,
      responseBody,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown bridge request failure";

    return {
      ok: false,
      attempted: true,
      url,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function triggerInterstitialPlayback(
  input: TriggerInterstitialPlaybackInput
): Promise<BridgePlayResult> {
  const filename = sanitizeBridgeFilename(input.filename);

  if (!filename) {
    return {
      ok: false,
      attempted: true,
      url: `${getBridgeBaseUrl()}/play`,
      error: "Could not derive a valid filename for bridge playback.",
    };
  }

  const baseUrl = getBridgeBaseUrl().replace(/\/+$/, "");
  const url = `${baseUrl}/play`;

  const payload = {
    filename,
    metadata: {
      source: "web-runtime-materialize-next",
      locationId: input.locationId,
      sessionId: input.sessionId,
      assetId: input.assetId,
    },
  };

  let attempt = 0;
  let lastResult: BridgePlayResult | null = null;

  while (attempt <= DEFAULT_RETRY_COUNT) {
    lastResult = await postBridgePlayOnce(url, payload, DEFAULT_TIMEOUT_MS);

    if (lastResult.ok) {
      return lastResult;
    }

    attempt += 1;
  }

  return (
    lastResult || {
      ok: false,
      attempted: true,
      url,
      error: "Bridge request failed before a result was returned.",
    }
  );
}