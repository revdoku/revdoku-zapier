const crypto = require("node:crypto");
const mime = require("mime-types");
const { version } = require("../package.json");

const API_URL = "https://api.revdoku.com/v1";

const apiRequest = async (z, bundle, options) => {
  const method = options.method || "GET";
  const accountId = bundle.authData.account_id;
  const scope = accountId ? { account_id: accountId } : {};
  const path = options.path;
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new z.errors.Error("Invalid Revdoku API path.", "InvalidPath");
  }
  const response = await z.request({
    url: `${API_URL}${path}`,
    method,
    headers: {
      Authorization: `Bearer ${bundle.authData.api_token}`,
      "X-Revdoku-Agent": "zapier",
      "X-Revdoku-Agent-Client": "zapier-platform",
      "X-Revdoku-Agent-Version": version,
    },
    params: Object.fromEntries(
      Object.entries(
        method === "GET"
          ? { ...options.params, ...scope }
          : options.params || {},
      ).filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      ),
    ),
    body: method === "GET" ? undefined : { ...options.json, ...scope },
    skipThrowForStatus: true,
    redirect: options.redirect,
    raw: options.raw,
  });
  if (options.allowNotFound && response.status === 404) return null;
  if (response.status === 401) {
    throw new z.errors.ExpiredAuthError(
      "The Revdoku API key is invalid or expired. Reconnect the account.",
    );
  }
  if (response.status >= 400) {
    const error = response.data?.error || {};
    // Do not replay a mutation whose outcome is uncertain.
    if (response.status === 429 && method === "GET") {
      const seconds = Number(getHeader(response, "retry-after"));
      throw new z.errors.ThrottledError(
        "Revdoku rate limit reached.",
        Number.isFinite(seconds) && seconds > 0 ? seconds : 60,
      );
    }
    throw new z.errors.Error(
      error.message || `Revdoku returned HTTP ${response.status}.`,
      error.code || "RevdokuApiError",
      response.status,
    );
  }
  if (
    !options.raw &&
    response.status !== 204 &&
    (response.data?.success !== true || !response.data.data)
  ) {
    throw new z.errors.Error(
      "Revdoku returned an invalid response.",
      "InvalidResponse",
    );
  }
  return response;
};

const wrappedData = (response, key) =>
  key ? response?.data?.data?.[key] : response?.data?.data;
const getHeader = (response, name) =>
  response.getHeader?.(name) ||
  response.headers?.get?.(name) ||
  response.headers?.[name.toLowerCase()];
const boolInput = (value, fallback = false) =>
  value === undefined || value === null || value === ""
    ? fallback
    : value === true || value === "true";
const parseList = (value) =>
  (Array.isArray(value) ? value : String(value || "").split(/[\n,]/))
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);

const parseJsonObject = (z, value, fieldName) => {
  if (value === undefined || value === null || value === "") return {};
  try {
    const parsed = typeof value === "object" ? value : JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed;
  } catch (_error) {
    /* report the field without exposing its contents */
  }
  throw new z.errors.Error(
    `${fieldName} must be a JSON object.`,
    "InvalidJsonObject",
  );
};

const requireConfirmation = (z, bundle) => {
  if (!boolInput(bundle.inputData.confirm))
    throw new z.errors.Error(
      "Confirm this deletion or archive action.",
      "ConfirmationRequired",
    );
};

const formatMailbox = (mailbox) => ({
  ...mailbox,
  name: mailbox.email?.address || mailbox.id,
});
const formatFile = (file) => {
  const current = file.current_file_version || {};
  return {
    ...file,
    name: file.path || file.basename || file.id,
    filename: file.basename || current.name || file.id,
    byte_size: current.byte_size,
    content_type: current.mime_type,
    sha256: current.sha256,
  };
};

const normalizeFilename = (name) =>
  String(name || "revdoku-file")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
    .trim() || "revdoku-file";
const filenameFromResponse = (response, url) => {
  const header = getHeader(response, "content-disposition") || "";
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].replace(/"/g, ""));
    } catch (_error) {
      /* try plain filename */
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  if (plain) return plain[1];
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop());
  } catch (_error) {
    return "revdoku-file";
  }
};

const bufferFromUploadInput = async (z, bundle) => {
  const input = bundle.inputData;
  if (input.file) {
    // External file and object-storage requests never receive the API key.
    const response = await z.request({ url: input.file, raw: true });
    return {
      buffer: await response.buffer(),
      filename: normalizeFilename(
        input.filename || filenameFromResponse(response, input.file),
      ),
      contentType:
        input.content_type ||
        getHeader(response, "content-type") ||
        "application/octet-stream",
    };
  }
  if (input.content !== undefined && input.content !== null) {
    const filename = normalizeFilename(
      input.filename ||
        String(input.path || "note.txt")
          .split("/")
          .pop(),
    );
    return {
      buffer: Buffer.from(String(input.content), "utf8"),
      filename,
      contentType: input.content_type || mime.lookup(filename) || "text/plain",
    };
  }
  throw new z.errors.Error(
    "Provide a file URL or text content.",
    "UploadInputRequired",
  );
};

const uploadBufferToMailbox = async (z, bundle, upload) => {
  const path = upload.relativePath || upload.filename;
  const descriptor = wrappedData(
    await apiRequest(z, bundle, {
      method: "POST",
      path: "/direct_uploads",
      json: {
        mailbox_id: upload.mailboxId,
        path,
        reason: upload.reason,
        blob: {
          filename: upload.filename,
          byte_size: upload.buffer.length,
          checksum: crypto
            .createHash("md5")
            .update(upload.buffer)
            .digest("base64"),
          content_type: upload.contentType,
          sha256: crypto
            .createHash("sha256")
            .update(upload.buffer)
            .digest("hex"),
          purpose: "mailbox_file",
        },
      },
    }),
  );
  if (descriptor.skipped && descriptor.file) return descriptor;
  if (!descriptor.direct_upload?.url || !descriptor.signed_id) {
    throw new z.errors.Error(
      "Revdoku did not return an upload URL.",
      "DirectUploadMissing",
    );
  }
  await z.request({
    url: descriptor.direct_upload.url,
    method: "PUT",
    headers: descriptor.direct_upload.headers,
    body: upload.buffer,
    raw: true,
  });
  return wrappedData(
    await apiRequest(z, bundle, {
      method: "POST",
      path: `/mailboxes/${encodeURIComponent(upload.mailboxId)}/files`,
      json: {
        signed_blob_id: descriptor.signed_id,
        path,
        name: upload.filename,
        role: upload.role || "artifact",
        reason: upload.reason,
      },
    }),
  );
};

const downloadMailboxFile = async (z, bundle) => {
  const response = await apiRequest(z, bundle, {
    path: `/mailboxes/${encodeURIComponent(bundle.inputData.mailbox_id)}/files/${encodeURIComponent(bundle.inputData.file_id)}/download`,
    raw: true,
    redirect: "manual",
  });
  const location = getHeader(response, "location");
  const content = location
    ? await z.request({ url: new URL(location, API_URL).href, raw: true })
    : response;
  return z.stashFile(
    content.body,
    Number(getHeader(content, "content-length")) || undefined,
    normalizeFilename(bundle.inputData.filename),
    bundle.inputData.content_type || getHeader(content, "content-type"),
  );
};

const downloadEmailFile = async (z, bundle) => {
  const {
    mailbox_id: mailboxId,
    email_id: emailId,
    attachment_id: attachmentId,
  } = bundle.inputData;
  const suffix = attachmentId
    ? `attachments/${encodeURIComponent(attachmentId)}`
    : "raw";
  const download = wrappedData(
    await apiRequest(z, bundle, {
      path: `/mailboxes/${encodeURIComponent(mailboxId)}/emails/${encodeURIComponent(emailId)}/${suffix}`,
    }),
    "download",
  );
  if (!download?.url || download.authentication !== "none")
    throw new z.errors.Error("Invalid download link.", "InvalidDownload");
  // Obtain a fresh temporary link when Zapier hydrates the file.
  const response = await z.request({ url: download.url, raw: true });
  return z.stashFile(
    response.body,
    download.size_bytes,
    normalizeFilename(download.filename),
    download.content_type,
  );
};

module.exports = {
  apiRequest,
  wrappedData,
  boolInput,
  parseList,
  parseJsonObject,
  requireConfirmation,
  formatMailbox,
  formatFile,
  bufferFromUploadInput,
  uploadBufferToMailbox,
  downloadMailboxFile,
  downloadEmailFile,
};
