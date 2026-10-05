const { apiRequest, boolInput, wrappedData } = require("../lib/revdoku");
const {
  mailboxField,
  emailField,
  emailPath,
  reasonField,
  sample,
} = require("../lib/email");
module.exports = {
  key: "update_email",
  noun: "Email",
  display: {
    label: "Set Email Read Status",
    description: "Marks one email read or unread.",
  },
  operation: {
    inputFields: [
      mailboxField,
      emailField,
      { key: "read", label: "Read", type: "boolean", required: true },
      reasonField,
    ],
    perform: async (z, bundle) =>
      wrappedData(
        await apiRequest(z, bundle, {
          method: "PATCH",
          path: emailPath(bundle.inputData),
          json: {
            read: boolInput(bundle.inputData.read),
            reason: bundle.inputData.reason,
          },
        }),
        "email",
      ),
    sample,
  },
};
