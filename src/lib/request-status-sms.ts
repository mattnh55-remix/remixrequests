import { prisma } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

type RequestAcceptedSmsInput = {
  locationId: string;
  emailHash: string;
  title: string;
  artist: string;
  isPlayNow: boolean;
};

type RequestRejectedSmsInput = {
  locationId: string;
  emailHash: string;
  reason: string;
  refunded: boolean;
};

function cleanReason(reason: string) {
  return String(reason || "Rejected")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function buildAcceptedMessage(input: RequestAcceptedSmsInput) {
  const hook = input.isPlayNow
    ? "Get your Roll On! Your Play Now request at Remix has been added to the queue!"
    : "Get your Roll On! Your song request at Remix has been added to the queue!";

  const songLine = `${input.title} — ${input.artist}`.slice(0, 120);
  return `${hook} ${songLine}`;
}

function buildRejectedMessage(input: RequestRejectedSmsInput) {
  const safeReason = cleanReason(input.reason);

  if (input.refunded) {
    return `Remix Alert: Sorry; your request didn't make it to the queue, we returned the points to your balance. Reason: ${safeReason}`;
  }

  return `Remix Alert: Sorry; your request didn't make it to the queue. This request was outside the refund window. Reason: ${safeReason}`;
}

async function getVerifiedPhone(locationId: string, emailHash: string) {
  const identity = await prisma.identity.findUnique({
    where: {
      locationId_emailHash: {
        locationId,
        emailHash,
      },
    },
    select: {
      phoneE164: true,
      smsVerifiedAt: true,
    },
  });

  if (!identity?.phoneE164 || !identity.smsVerifiedAt) {
    return null;
  }

  return identity.phoneE164;
}

export async function sendRequestAcceptedSms(input: RequestAcceptedSmsInput) {
  try {
    const to = await getVerifiedPhone(input.locationId, input.emailHash);
    if (!to) {
      return { ok: false, skipped: true, reason: "NO_VERIFIED_PHONE" as const };
    }

    await sendSms(to, buildAcceptedMessage(input));
    return { ok: true, skipped: false };
  } catch (error: any) {
    console.error("REQUEST_ACCEPTED_SMS_FAILED", {
      locationId: input.locationId,
      emailHashSuffix: input.emailHash.slice(-6),
      message: error?.message || String(error),
      code: error?.code,
      status: error?.status,
    });

    return {
      ok: false,
      skipped: false,
      error: error?.message || String(error),
    };
  }
}

export async function sendRequestRejectedSms(input: RequestRejectedSmsInput) {
  try {
    const to = await getVerifiedPhone(input.locationId, input.emailHash);
    if (!to) {
      return { ok: false, skipped: true, reason: "NO_VERIFIED_PHONE" as const };
    }

    await sendSms(to, buildRejectedMessage(input));
    return { ok: true, skipped: false };
  } catch (error: any) {
    console.error("REQUEST_REJECTED_SMS_FAILED", {
      locationId: input.locationId,
      emailHashSuffix: input.emailHash.slice(-6),
      message: error?.message || String(error),
      code: error?.code,
      status: error?.status,
    });

    return {
      ok: false,
      skipped: false,
      error: error?.message || String(error),
    };
  }
}
