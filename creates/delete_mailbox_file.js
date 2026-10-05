const {
  apiRequest,
  formatFile,
  wrappedData,
  requireConfirmation,
} = require("../lib/revdoku");

const perform = async (z, bundle) => {
  requireConfirmation(z, bundle);
  const response = await apiRequest(z, bundle, {
    method: "DELETE",
    json: { reason: bundle.inputData.reason },
    path: `/mailboxes/${encodeURIComponent(bundle.inputData.mailbox_id)}/files/${encodeURIComponent(bundle.inputData.file_id)}`,
  });

  return formatFile(wrappedData(response, "file"), bundle);
};

module.exports = {
  key: "delete_mailbox_file",
  noun: "Mailbox File",
  display: {
    label: "Delete Mailbox File",
    description:
      "Deletes a file from a Revdoku mailbox with administrator permission.",
  },
  operation: {
    inputFields: [
      {
        key: "confirm",
        label: "Confirm",
        type: "boolean",
        required: true,
        default: "false",
      },
      { key: "reason", label: "Reason", required: false },
      {
        key: "mailbox_id",
        label: "Mailbox",
        dynamic: "mailboxes.id.name",
        altersDynamicFields: true,
        required: true,
      },
      {
        key: "file_id",
        label: "File",
        dynamic: "mailbox_files.id.name",
        required: true,
      },
    ],
    perform,
    sample: {
      id: "df_sample",
      mailbox_id: "bkt_sample",
      name: "old-file.txt",
      deleted: true,
    },
  },
};
