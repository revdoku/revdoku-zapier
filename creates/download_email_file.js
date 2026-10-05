const { downloadEmailFile } = require("../lib/revdoku");
const { mailboxField, emailField } = require("../lib/email");
module.exports = {
  key: "download_email_file",
  noun: "Email File",
  display: {
    label: "Download Email File",
    description:
      "Downloads an attachment, or the original email when Attachment ID is blank.",
  },
  operation: {
    inputFields: [
      mailboxField,
      emailField,
      { key: "attachment_id", label: "Attachment ID", required: false },
    ],
    perform: async (z, bundle) => ({
      file: z.dehydrateFile(downloadEmailFile, bundle.inputData),
    }),
    sample: { file: "https://example.com/attachment.pdf" },
  },
};
