const {
  bufferFromUploadInput,
  formatFile,
  uploadBufferToMailbox,
} = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const fileInput = await bufferFromUploadInput(z, bundle);
  const relativePath = input.path || fileInput.filename;

  const result = await uploadBufferToMailbox(z, bundle, {
    mailboxId: input.mailbox_id,
    buffer: fileInput.buffer,
    filename: fileInput.filename,
    contentType: fileInput.contentType,
    relativePath,
    role: input.role || "artifact",
    reason: input.reason,
  });

  return {
    file: formatFile(result.file, bundle),
    version: result.version,
    created: result.created,
    skipped: result.skipped || false,
  };
};

module.exports = {
  key: "upload_mailbox_file",
  noun: "Mailbox File",
  display: {
    label: "Upload File to Mailbox",
    description:
      "Uploads a Zapier file URL or text content into a Revdoku mailbox using Revdoku direct uploads.",
  },
  operation: {
    inputFields: [
      {
        key: "mailbox_id",
        label: "Mailbox",
        dynamic: "mailboxes.id.name",
        altersDynamicFields: true,
        required: true,
        helpText:
          "Choose a writable mailbox. Adjust this connection's access in [Account > Access](https://app.revdoku.com/account/access).",
      },
      {
        key: "file",
        label: "File URL",
        type: "file",
        required: false,
        helpText:
          "A file from a previous Zap step. Leave blank if you are uploading text content instead.",
      },
      {
        key: "content",
        label: "Text content",
        type: "text",
        required: false,
        helpText: "Optional text to save as a file when File URL is blank.",
      },
      {
        key: "path",
        label: "Mailbox path",
        type: "string",
        required: false,
        helpText:
          "Path inside Revdoku, for example invoices/customer-123.pdf or notes/summary.txt.",
      },
      {
        key: "filename",
        label: "Filename",
        type: "string",
        required: false,
        helpText:
          "Used when uploading text content or when the file URL does not include a useful name.",
      },
      {
        key: "content_type",
        label: "Content type",
        type: "string",
        required: false,
        helpText:
          "Optional MIME type. Revdoku infers this from the filename when blank.",
      },
      {
        key: "role",
        label: "File role",
        type: "string",
        required: false,
        default: "artifact",
        choices: {
          artifact: "Artifact",
          source: "Source",
          generated: "Generated",
          agent_output: "Agent output",
          export: "Export",
        },
      },
      {
        key: "reason",
        label: "Reason",
        type: "string",
        required: false,
      },
    ],
    perform,
    sample: {
      file: {
        id: "df_sample",
        mailbox_id: "bkt_sample",
        name: "notes/summary.txt",
        path: "notes/summary.txt",
        content_type: "text/plain",
        byte_size: 42,
      },
      created: true,
      uploaded: {
        filename: "summary.txt",
        path: "notes/summary.txt",
        byte_size: 42,
        content_type: "text/plain",
      },
    },
  },
};
