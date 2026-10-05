const { apiRequest, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: `/mailboxes/${encodeURIComponent(bundle.inputData.mailbox_id)}/versions`,
  });

  const versions = wrappedData(response, "versions") || [];
  return {
    versions,
    count: versions.length,
    current_version_id: wrappedData(response, "current_version_id") || null,
  };
};

module.exports = {
  key: "list_mailbox_versions",
  noun: "Mailbox Version",
  display: {
    label: "List Mailbox Versions",
    description:
      "Lists a Revdoku mailbox version history with change summaries.",
  },
  operation: {
    inputFields: [
      {
        key: "mailbox_id",
        label: "Mailbox",
        dynamic: "mailboxes.id.name",
        required: true,
        helpText:
          "Choose the mailbox whose version history you want to inspect.",
      },
    ],
    perform,
    sample: {
      count: 2,
      current_version_id: "bktrv_sample",
      versions: [
        {
          id: "bktrv_sample",
          mailbox_id: "bkt_sample",
          label: "Version 2",
          version_number: 1,
          reason: "Updated files",
          created_at: "2026-05-29T12:00:00Z",
          created_ago: "1 day ago",
          files_count: 2,
          changes: [
            {
              path: "notes.txt",
              status: "modified",
            },
          ],
        },
      ],
    },
  },
};
