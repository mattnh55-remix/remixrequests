
const banned = [
  "fuck","shit","bitch","asshole","cunt","slut","nigger","faggot","rape"
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function moderateShoutoutText(fromName: string, messageText: string) {
  const combined = normalize(fromName + " " + messageText);

  for (const word of banned) {
    if (combined.includes(word)) {
      return { result: "BLOCK", reason: "banned_word" };
    }
  }

  return { result: "ALLOW", reason: null };
}
