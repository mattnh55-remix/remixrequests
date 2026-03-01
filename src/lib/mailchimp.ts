import mailchimp from "@mailchimp/mailchimp_marketing";

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY!,
  server: process.env.MAILCHIMP_SERVER_PREFIX!,
});

export async function subscribeMailchimp(email: string, tags: string[] = []) {
  const listId = process.env.MAILCHIMP_AUDIENCE_ID!;
  const res = await mailchimp.lists.setListMember(listId, require("crypto").createHash("md5").update(email.toLowerCase()).digest("hex"), {
    email_address: email,
    status_if_new: "subscribed",
    status: "subscribed",
  });

  if (tags.length) {
    // Optional: apply tags
    try {
      await mailchimp.lists.updateListMemberTags(listId, require("crypto").createHash("md5").update(email.toLowerCase()).digest("hex"), {
        tags: tags.map((t) => ({ name: t, status: "active" })),
      });
    } catch {}
  }

  return res;
}