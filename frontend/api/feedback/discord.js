/** Vercel Serverless — Discord Webhook 피드백 전달 (DISCORD_FEEDBACK_WEBHOOK_URL) */

const MAX_CONTENT_LEN = 4000;
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function dataUrlToBuffer(dataUrl) {
  const raw = String(dataUrl || "");
  const match = /^data:([^;]+);base64,(.+)$/i.exec(raw);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;
  return { mime: match[1], buffer };
}

function extFromMime(mime) {
  const map = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[String(mime || "").toLowerCase()] || "png";
}

function reportTypeMeta(reportType) {
  if (reportType === "BUG") {
    return { label: "버그", emoji: "🐛", color: 0xe74c3c };
  }
  return { label: "의견", emoji: "💬", color: 0x1e8e5a };
}

function formatKstIso(iso) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function buildEmbed({ reportType, content, username, appVersion, submittedAt, pageUrl, categoryLabel }) {
  const meta = reportTypeMeta(reportType);
  const fields = [
    { name: "유형", value: `${meta.emoji} ${meta.label}`, inline: true },
    { name: "사용자", value: String(username || "익명").slice(0, 256), inline: true },
    { name: "앱 버전", value: `v${String(appVersion || "?").replace(/^v/i, "")}`, inline: true },
    { name: "접수 시각", value: formatKstIso(submittedAt || new Date().toISOString()), inline: false },
  ];
  if (categoryLabel) {
    fields.push({ name: "영역", value: categoryLabel, inline: true });
  }
  if (pageUrl) {
    fields.push({ name: "페이지", value: String(pageUrl).slice(0, 1024), inline: false });
  }

  return {
    title: `${meta.emoji} 일당맵 ${meta.label}`,
    description: String(content || "").slice(0, MAX_CONTENT_LEN),
    color: meta.color,
    fields,
    footer: { text: "일당맵 베타 피드백" },
    timestamp: submittedAt || new Date().toISOString(),
  };
}

async function postDiscordWebhook(webhookUrl, { embed, files }) {
  const payload = { embeds: [embed] };

  if (!files.length) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Discord webhook failed (${response.status}): ${text.slice(0, 200)}`);
    }
    return;
  }

  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  files.forEach((file, index) => {
    const blob = new Blob([file.buffer], { type: file.mime });
    form.append(`files[${index}]`, blob, file.filename);
  });

  const response = await fetch(webhookUrl, { method: "POST", body: form });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Discord webhook failed (${response.status}): ${text.slice(0, 200)}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { success: false, message: "POST만 허용됩니다." });
  }

  const webhookUrl = String(process.env.DISCORD_FEEDBACK_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return json(res, 503, {
      success: false,
      message: "Discord Webhook이 설정되지 않았습니다. (DISCORD_FEEDBACK_WEBHOOK_URL)",
    });
  }

  const body = parseBody(req);
  if (!body || typeof body !== "object") {
    return json(res, 400, { success: false, message: "요청 본문이 올바르지 않습니다." });
  }

  const reportType = body.reportType === "BUG" ? "BUG" : "FEEDBACK";
  const content = String(body.content || "").trim();
  if (!content) {
    return json(res, 400, { success: false, message: "내용을 입력해 주세요." });
  }
  if (content.length > MAX_CONTENT_LEN) {
    return json(res, 400, { success: false, message: `내용은 ${MAX_CONTENT_LEN}자 이내로 입력해 주세요.` });
  }

  const submittedAt = new Date().toISOString();
  const embed = buildEmbed({
    reportType,
    content,
    username: body.username,
    appVersion: body.appVersion,
    submittedAt,
    pageUrl: body.pageUrl,
    categoryLabel: body.categoryLabel,
  });

  const rawImages = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
  const files = [];
  rawImages.forEach((item, index) => {
    const dataUrl = typeof item === "string" ? item : item?.dataUrl;
    const parsed = dataUrlToBuffer(dataUrl);
    if (!parsed) return;
    const ext = extFromMime(parsed.mime);
    const name =
      (typeof item === "object" && item?.name ? String(item.name) : `screenshot-${index + 1}.${ext}`)
        .replace(/[^\w.\-]+/g, "_")
        .slice(0, 80) || `screenshot-${index + 1}.${ext}`;
    files.push({ ...parsed, filename: name });
    if (index === 0 && embed.image == null) {
      embed.image = { url: `attachment://${name}` };
    }
  });

  try {
    await postDiscordWebhook(webhookUrl, { embed, files });
    return json(res, 200, {
      success: true,
      message: "Discord로 전송했습니다.",
      data: { submittedAt, reportType },
    });
  } catch (error) {
    console.error("[discord-feedback]", error);
    return json(res, 502, {
      success: false,
      message: "Discord 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
};
