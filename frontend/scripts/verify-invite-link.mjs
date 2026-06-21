/**
 * inviteLink.js 단위 검증 (node scripts/verify-invite-link.mjs)
 */
import { buildInviteLink, buildInviteSharePayload, getPublicAppOrigin } from "../src/utils/inviteLink.js";

const prev = process.env.REACT_APP_PUBLIC_URL;
process.env.REACT_APP_PUBLIC_URL = "https://ildangmap.vercel.app";

const link = buildInviteLink({ ref: 1, contactId: "u-abc" });
const expected = "https://ildangmap.vercel.app/invite?ref=1&contact=u-abc";

if (link !== expected) {
  console.error("FAIL buildInviteLink:", link, "expected:", expected);
  process.exit(1);
}

const payload = buildInviteSharePayload({ ref: 1, contactId: "u-abc", inviterName: "오야지" });
if (payload.url !== expected || !payload.fullText.includes(expected)) {
  console.error("FAIL buildInviteSharePayload url mismatch", payload.url);
  process.exit(1);
}

if (getPublicAppOrigin() !== "https://ildangmap.vercel.app") {
  console.error("FAIL getPublicAppOrigin");
  process.exit(1);
}

process.env.REACT_APP_PUBLIC_URL = prev;
console.log("OK invite link:", link);
console.log("OK share url:", payload.url);
