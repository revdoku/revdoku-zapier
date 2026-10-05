const { apiRequest, wrappedData } = require("../lib/revdoku");
const { mailboxField, emailPath, sample } = require("../lib/email");
module.exports = {
  key: "list_emails",
  noun: "Email",
  display: {
    label: "List Emails",
    description: "Returns one page of emails and the cursor for the next page.",
  },
  operation: {
    inputFields: [
      mailboxField,
      { key: "cursor", label: "Cursor", required: false },
      { key: "limit", label: "Limit", type: "integer", default: "50" },
      {
        key: "order",
        label: "Order",
        choices: { asc: "Oldest Arrival First", desc: "Newest Arrival First" },
        default: "asc",
      },
      { key: "sender", label: "Sender", required: false },
      { key: "subject", label: "Subject Contains", required: false },
    ],
    perform: async (z, bundle) => {
      const {
        cursor,
        limit = 50,
        order = "asc",
        sender,
        subject,
      } = bundle.inputData;
      return wrappedData(
        await apiRequest(z, bundle, {
          path: emailPath(bundle.inputData),
          params: { cursor, limit, order, sender, subject },
        }),
      );
    },
    sample: {
      emails: [sample],
      pagination: { has_more: false, next_cursor: "opaque-cursor", limit: 50 },
    },
  },
};
