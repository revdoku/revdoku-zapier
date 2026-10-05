const { apiRequest, formatMailbox, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const mailboxId = String(bundle.inputData.mailbox_id || "").trim();
  if (mailboxId) {
    const response = await apiRequest(z, bundle, {
      method: "GET",
      path: `/mailboxes/${encodeURIComponent(mailboxId)}`,
      allowNotFound: true,
    });
    return response ? [formatMailbox(wrappedData(response, "mailbox"))] : [];
  }

  const query = String(bundle.inputData.email_address || "")
    .trim()
    .toLowerCase();
  if (!query) return [];

  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: "/mailboxes",
  });
  const mailboxes = (wrappedData(response, "mailboxes") || []).map(formatMailbox);
  const exact = mailboxes.find((mailbox) => (mailbox.email?.address || "").toLowerCase() === query);
  const partial = mailboxes.find((mailbox) =>
    (mailbox.email?.address || "").toLowerCase().includes(query),
  );
  return [exact || partial].filter(Boolean);
};

module.exports = {
  key: "find_mailbox",
  noun: "Mailbox",
  display: {
    label: "Find Mailbox",
    description: "Finds a Revdoku mailbox by ID or email address.",
  },
  operation: {
    inputFields: [
      {
        key: "mailbox_id",
        label: "Mailbox",
        type: "string",
        dynamic: "mailboxes.id.name",
        required: false,
        helpText:
          "Optional mailbox dropdown or bkt_... ID. If provided, email address is ignored.",
      },
      {
        key: "email_address",
        label: "Email address contains",
        type: "string",
        required: false,
      },
    ],
    perform,
    sample: {
      id: "bkt_sample",
      name: "project@revdokumail.com",
      email: { address: "project@revdokumail.com" },
      permission: "write",
    },
  },
};
