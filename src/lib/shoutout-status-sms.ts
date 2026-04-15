import { prisma } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

type ShoutoutApprovedSmsInput = {
  locationId: string;
  emailHash: string;
};

type ShoutoutRejectedSmsInput = {
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

function buildApprovedMessage() {
  return "Remix Alert: Your shoutout has been approved and added to the screen!";
}

function buildRejectedMessage(input: ShoutoutRejectedSmsInput) {
  const safeReason = cleanReason(input.reason);

  if (input.refunded) {
    return `Remix Alert: Sorry; your shoutout could not be approved. We returned the points to your balance. Reason: ${safeReason}`;
  }

  return `Remix Alert: Sorry; your shoutout could not be approved. Reason: ${safeReason}`;
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

export async function sendShoutoutApprovedSms(input: ShoutoutApprovedSmsInput) {
  try {
    const to = await getVerifiedPhone(input.locationId, input.emailHash);
    if (!to) {
      return { ok: false, skipped: true, reason: "NO_VERIFIED_PHONE" as const };
    }

    await sendSms(to, buildApprovedMessage());
    return { ok: true, skipped: false };
  } catch (error: any) {
    console.error("SHOUTOUT_APPROVED_SMS_FAILED", {
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

export async function sendShoutoutRejectedSms(input: ShoutoutRejectedSmsInput) {
  try {
    const to = await getVerifiedPhone(input.locationId, input.emailHash);
    if (!to) {
      return { ok: false, skipped: true, reason: "NO_VERIFIED_PHONE" as const };
    }

    await sendSms(to, buildRejectedMessage(input));
    return { ok: true, skipped: false };
  } catch (error: any) {
    console.error("SHOUTOUT_REJECTED_SMS_FAILED", {
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