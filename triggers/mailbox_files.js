const { apiRequest, formatFile, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const mailboxId = bundle.inputData.mailbox_id;
  if (!mailboxId) return [];

  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: `/mailboxes/${encodeURIComponent(mailboxId)}/files`,
    params: { limit: 100, offset: (bundle.meta?.page || 0) * 100 },
  });

  return (wrappedData(response, "files") || []).map((file) =>
    formatFile(file, bundle),
  );
};

module.exports = {
  key: "mailbox_files",
  noun: "Mailbox File",
  display: {
    label: "Mailbox Files",
    description: "Lists files in a selected Revdoku mailbox.",
    hidden: true,
  },
  operation: {
    inputFields: [
      {
        key: "mailbox_id",
        label: "Mailbox",
        dynamic: "mailboxes.id.name",
        required: true,
      },
    ],
    canPaginate: true,
    perform,
    sample: {
      id: "df_sample",
      name: "reports/summary.pdf",
      filename: "summary.pdf",
      path: "reports/summary.pdf",
      mailbox_id: "bkt_sample",
      content_type: "application/pdf",
      byte_size: 12000,
    },
  },
};
