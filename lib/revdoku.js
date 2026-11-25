const { version } = require("../package.json");

const API_URL = "https://api.revdoku.com/v1";

// Used only when the API sends a code without a message.
const ERROR_TEXT = {
  EMAIL_RECIPIENT_NOT_ALLOWED:
    "This ticket has nobody to reply to. Revdoku sends replies only to people who wrote to the project.",
  EMAIL_SEND_RATE_LIMITED:
    "The sending limit of this project is reached. Try again later.",
  EMAIL_LOCKED: "The ticket is locked while Revdoku works on it. Try again later.",
  EMAIL_WITHHELD:
    "Revdoku holds this message as Junk. A person can review it in Revdoku.",
  EMAIL_LABELING_PENDING:
    "Revdoku still checks the newest message. Try again in a minute.",
};

const getHeader = (response, name) =>
  response.getHeader?.(name) ||
  response.headers?.get?.(name) ||
  response.headers?.[name.toLowerCase()];

// An error that keeps the API's code for the caller.
const apiError = (z, message, code, status) => {
  const error = new z.errors.Error(message, code, status);
  error.revdokuCode = code;
  error.revdokuStatus = status;
  return error;
};

// One request, never repeated here. `once: true` marks a send: when Revdoku
// does not confirm the result, the step halts so that nothing sends it again.
const apiRequest = async (z, bundle, options) => {
  const method = options.method || "GET";
  const accountId = bundle.authData.account_id;
  const scope = accountId ? { account_id: accountId } : {};
  const path = options.path;
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new z.errors.Error("Invalid Revdoku API path.", "InvalidPath");
  }
  const unconfirmed = () =>
    new z.errors.HaltedError(
      "Revdoku did not confirm the result. Open the ticket in Revdoku before you run this step again.",
    );
  let response;
  try {
    response = await z.request({
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
          method === "GET" ? { ...options.params, ...scope } : {},
        ).filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        ),
      ),
      body: method === "GET" ? undefined : { ...options.json, ...scope },
      skipThrowForStatus: true,
      // A request that is still running when Zapier stops the step counts as
      // failed, and a replay would send a reply again. End it first.
      timeout: 20000,
      // Zapier's request layer turns every 429 into a throttle that Zapier
      // repeats. This code decides: only reads are repeated (see below).
      throwForThrottlingEarly: false,
    });
  } catch (error) {
    if (options.once) throw unconfirmed();
    throw error;
  }
  if (options.allowNotFound && response.status === 404) return null;
  if (response.status === 401) {
    throw new z.errors.ExpiredAuthError(
      "The Revdoku API key is invalid or expired. Reconnect the account.",
    );
  }
  if (response.status >= 400) {
    const error = response.data?.error || {};
    // Zapier repeats a throttled request by itself: only reads may ask for that.
    if (response.status === 429 && method === "GET") {
      const seconds = Number(getHeader(response, "retry-after"));
      throw new z.errors.ThrottledError(
        "Revdoku rate limit reached.",
        Number.isFinite(seconds) && seconds > 0 ? seconds : 60,
      );
    }
    // Without the API's error, a proxy answered: the result is unknown.
    if (options.once && !error.code) throw unconfirmed();
    throw apiError(
      z,
      error.message ||
        ERROR_TEXT[error.code] ||
        `Revdoku returned HTTP ${response.status}.`,
      error.code || "RevdokuApiError",
      response.status,
    );
  }
  if (response.data?.success !== true || !response.data.data) {
    if (options.once) throw unconfirmed();
    throw new z.errors.Error(
      "Revdoku returned an invalid response.",
      "InvalidResponse",
    );
  }
  return response;
};

const wrappedData = (response, key) =>
  key ? response?.data?.data?.[key] : response?.data?.data;

module.exports = { apiRequest, wrappedData };
