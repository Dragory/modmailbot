// Embed helpers for logging.
// Store embed data in the database and render a plain-text summary for the website logs.

function sanitiseEmbedsForMetadata(embeds) {
  if (! Array.isArray(embeds) || embeds.length === 0) return null;

  return embeds
    .filter(Boolean)
    .slice(0, 10)
    .map((embed) => ({
      title: embed.title,
      type: embed.type,
      description: embed.description,
      url: embed.url,
      timestamp: embed.timestamp,
      color: embed.color,
      footer: embed.footer,
      image: embed.image,
      thumbnail: embed.thumbnail,
      video: embed.video,
      provider: embed.provider,
      author: embed.author,
      fields: embed.fields,
    }));
}

function summariseEmbedsAsText(embeds, label) {
  if (! Array.isArray(embeds) || embeds.length === 0) return "";

  const lines = [`*${label}:*`];
  const list = embeds.filter(Boolean).slice(0, 10);

  for (const [i, embed] of list.entries()) {
    const title = embed.title ? String(embed.title).trim() : "";
    const description = embed.description ? String(embed.description).trim() : "";
    const embedUrl = embed.url ? String(embed.url).trim() : "";

    if (list.length > 1) {
      lines.push(`Embed ${i + 1}:`);
    }

    if (title) lines.push(`Title: ${title}`);
    if (embedUrl) lines.push(`URL: ${embedUrl}`);
    if (description) lines.push(`Description: ${description}`);
    if (embed.image && embed.image.url) lines.push(`Image: ${embed.image.url}`);
    if (embed.thumbnail && embed.thumbnail.url) lines.push(`Thumbnail: ${embed.thumbnail.url}`);
    if (embed.video && embed.video.url) lines.push(`Video: ${embed.video.url}`);

    if (embed.fields && embed.fields.length) {
      for (const field of embed.fields.slice(0, 25)) {
        if (! field) continue;
        if (field.name) lines.push(`Field: ${field.name}`);
        if (field.value) lines.push(field.value);
      }
    }

    if (list.length > 1 && i !== list.length - 1) {
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}

module.exports = {
  sanitiseEmbedsForMetadata,
  summariseEmbedsAsText,
};

