// src/lib/mailchimp.ts

import crypto from "crypto";
import mailchimp from "@mailchimp/mailchimp_marketing";

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY!,
  server: process.env.MAILCHIMP_SERVER_PREFIX!,
});

type SubscribeMailchimpInput =
  | string
  | {
      email: string;
      phone?: string | null;
      smsConsent?: boolean;
      tags?: string[];
      firstName?: string | null;
      lastName?: string | null;
      source?: string;
    };

function md5(value: string) {
  return crypto.createHash("md5").update(value.toLowerCase().trim()).digest("hex");
}

function normalizePhone(phone?: string | null) {
  if (!phone) return undefined;

  const clean = String(phone).trim();

  if (clean.startsWith("+")) {
    return clean.replace(/[^\d+]/g, "");
  }

  const digits = clean.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return undefined;
}

function uniqueTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
    )
  );
}

export async function subscribeMailchimp(
  input: SubscribeMailchimpInput,
  legacyTags: string[] = []
) {
  const listId = process.env.MAILCHIMP_AUDIENCE_ID!;

  const normalized =
    typeof input === "string"
      ? {
          email: input,
          tags: legacyTags,
        }
      : input;

  const email = String(normalized.email || "").trim().toLowerCase();

  if (!email) {
    throw new Error("Missing email for Mailchimp subscription.");
  }

  const subscriberHash = md5(email);
  const smsPhoneNumber = normalizePhone(normalized.phone);

  const tags = uniqueTags([
    ...(normalized.tags || []),
    ...(normalized.source ? [`SOURCE_${normalized.source}`] : []),
  ]);

  const payload: Record<string, any> = {
    email_address: email,
    status_if_new: "subscribed",
    status: "subscribed",
    merge_fields: {
      ...(normalized.firstName ? { FNAME: normalized.firstName } : {}),
      ...(normalized.lastName ? { LNAME: normalized.lastName } : {}),
      merge_fields: {
  ...(smsPhoneNumber ? {
    PHONE: smsPhoneNumber,
    SMSPHONE: smsPhoneNumber,
  } : {}),
},
    },
  };

  /**
   * Mailchimp SMS:
   * This stores the dedicated SMS phone number field when supported by the audience/account.
   * Mailchimp requires SMS contacts to be on an SMS-enabled audience/program.
   */
  if (smsPhoneNumber) {
    payload.sms_phone_number = smsPhoneNumber;

    if (normalized.smsConsent === true) {
      payload.sms_marketing_consent = true;
    }
  }

console.log("MAILCHIMP_SMS_DEBUG", {
  email,
  smsPhoneNumber,
  smsConsent: normalized.smsConsent,
  tags,
  payload,
});

  const res = await mailchimp.lists.setListMember(
    listId,
    subscriberHash,
    payload as any
  );

  if (tags.length) {
    await mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
      tags: tags.map((tag) => ({
        name: tag,
        status: "active",
      })),
    });
  }

  return res;
}

export async function tagMailchimpContact(email: string, tags: string[]) {
  const listId = process.env.MAILCHIMP_AUDIENCE_ID!;
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) {
    throw new Error("Missing email for Mailchimp tag update.");
  }

  const subscriberHash = md5(cleanEmail);
  const cleanTags = uniqueTags(tags);

  if (!cleanTags.length) {
    return { ok: true, skipped: true };
  }

  return mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
    tags: cleanTags.map((tag) => ({
      name: tag,
      status: "active",
    })),
  });
}

export async function markVerifiedRequestUser(params: {
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return subscribeMailchimp({
    email: params.email,
    phone: params.phone,
    smsConsent: true,
    firstName: params.firstName,
    lastName: params.lastName,
    source: "REMIXREQUESTS",
    tags: ["REQUEST_USER", "VERIFIED_REQUEST_USER", "VERIFIED_SMS"],
  });
}

export async function markPointsPurchaser(params: {
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return subscribeMailchimp({
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    source: "REMIXREQUESTS",
    tags: ["REQUEST_USER", "VERIFIED_REQUEST_USER", "POINTS_PURCHASER"],
  });
}