const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const { extractFirstUrl, fetchLinkPreview } = require("../lib/linkPreview");
const { assertMessagingAllowed, normalizeMessage } = require("./conversation.service");

const MESSAGE_TYPES = new Set(["text", "image", "document", "voice"]);

function validateMessagePayload(payload) {
  const type = MESSAGE_TYPES.has(payload.type) ? payload.type : "text";
  const content = String(payload.content || "").trim();

  if (type === "text") {
    if (!content) {
      const err = new Error("El mensaje no puede estar vacío");
      err.code = "INVALID_MESSAGE";
      throw err;
    }
    return { type, content };
  }

  if (type === "image") {
    if (!payload.imageUrl) {
      const err = new Error("Falta la URL de la imagen");
      err.code = "INVALID_MESSAGE";
      throw err;
    }
    return {
      type,
      content,
      imageUrl: payload.imageUrl,
      fileName: payload.fileName || null,
      mimeType: payload.mimeType || null,
      fileSize: payload.fileSize ?? null,
    };
  }

  if (type === "document") {
    if (!payload.documentUrl) {
      const err = new Error("Falta la URL del documento");
      err.code = "INVALID_MESSAGE";
      throw err;
    }
    return {
      type,
      content: content || payload.fileName || "Documento PDF",
      documentUrl: payload.documentUrl,
      fileName: payload.fileName || "documento.pdf",
      mimeType: payload.mimeType || "application/pdf",
      fileSize: payload.fileSize ?? null,
    };
  }

  if (type === "voice") {
    if (!payload.voiceUrl) {
      const err = new Error("Falta la URL de la nota de voz");
      err.code = "INVALID_MESSAGE";
      throw err;
    }
    const duration =
      payload.durationSeconds != null ? Number(payload.durationSeconds) : null;
    return {
      type,
      content: content || "Nota de voz",
      voiceUrl: payload.voiceUrl,
      fileName: payload.fileName || "nota-de-voz.webm",
      mimeType: payload.mimeType || "audio/webm",
      fileSize: payload.fileSize ?? null,
      durationSeconds: Number.isFinite(duration) && duration >= 0 ? duration : null,
    };
  }

  const err = new Error("Tipo de mensaje no válido");
  err.code = "INVALID_MESSAGE";
  throw err;
}

async function createMessage(payload) {
  const { conversationId, senderId } = payload;
  const validated = validateMessagePayload(payload);

  const { conversation, otherParticipantId, receiverBlockedSender, isGroup } =
    await assertMessagingAllowed(senderId, conversationId);

  const blockedFor =
    !isGroup && receiverBlockedSender ? [otherParticipantId] : [];

  let linkPreview = null;
  let messageType = validated.type;
  if (validated.type === "text") {
    const url = extractFirstUrl(validated.content);
    if (url) {
      linkPreview = await fetchLinkPreview(url);
      if (linkPreview) {
        messageType = "linkPreview";
      }
    }
  }

  const message = await Message.create({
    conversationId,
    sender: senderId,
    ...validated,
    type: messageType,
    linkPreview,
    deliveredBy: [],
    readBy: [],
    blockedFor,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessageAt: message.createdAt } }
  );

  return {
    message: normalizeMessage(message),
    participantIds: conversation.participants.map((id) => id.toString()),
    otherParticipantId,
    hiddenFromReceiver: !isGroup && receiverBlockedSender,
    isGroup: Boolean(isGroup),
    conversationType: conversation.type,
  };
}

module.exports = { createMessage };
