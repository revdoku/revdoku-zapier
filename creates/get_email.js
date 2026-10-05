const { apiRequest, wrappedData } = require("../lib/revdoku");
const { mailboxField, emailField, emailPath, sample } = require("../lib/email");
module.exports = {
  key: "get_email",
  noun: "Email",
  display: {
    label: "Get Email",
    description: "Gets email text and attachment metadata.",
  },
  operation: {
    inputFields: [mailboxField, emailField],
    perform: async (z, bundle) =>
      wrappedData(
        await apiRequest(z, bundle, { path: emailPath(bundle.inputData) }),
        "email",
      ),
    sample: {
      ...sample,
      body_text: "Attached is the invoice.",
      body_status: "complete",
      attachments: [],
    },
  },
};
