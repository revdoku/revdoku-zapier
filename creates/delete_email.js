const { apiRequest, requireConfirmation } = require("../lib/revdoku");
const {
  bucketField,
  emailField,
  emailPath,
  reasonField,
} = require("../lib/email");
module.exports = {
  key: "delete_email",
  noun: "Email",
  display: {
    label: "Delete Email",
    description:
      "Permanently deletes one email and its stored attachments. Requires administrator permission.",
  },
  operation: {
    inputFields: [
      bucketField,
      emailField,
      {
        key: "confirm",
        label: "Confirm Permanent Deletion",
        type: "boolean",
        required: true,
        default: "false",
      },
      reasonField,
    ],
    perform: async (z, bundle) => {
      requireConfirmation(z, bundle);
      await apiRequest(z, bundle, {
        method: "DELETE",
        path: emailPath(bundle.inputData),
        json: { reason: bundle.inputData.reason },
      });
      return { id: bundle.inputData.email_id, deleted: true };
    },
    sample: { id: "eml_sample", deleted: true },
  },
};
