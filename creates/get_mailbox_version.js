const { apiRequest, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: `/mailboxes/${encodeURIComponent(bundle.inputData.mailbox_id)}/versions/${encodeURIComponent(bundle.inputData.version_id)}`,
  });

  return {
    version: wrappedData(response, "version"),
    files: wrappedData(response, "files") || [],
  };
};

module.exports = {
  key: "get_mailbox_version",
  noun: "Mailbox Version",
  display: {
    label: "Get Mailbox Version",
    description:
      "Returns one Revdoku mailbox version and the files in that version.",
  },
  operation: {
    inputFields: [
      {
        key: "mailbox_id",
        label: "Mailbox",
        dynamic: "mailboxes.id.name",
        required: true,
        helpText: "Choose the mailbox that owns the version.",
      },
      {
        key: "version_id",
        label: "Version",
        required: true,
        helpText: "Paste or select the version ID from List Mailbox Versions.",
      },
    ],
    perform,
    sample: {
      version: {
        id: "bktrv_sample",
        mailbox_id: "bkt_sample",
        label: "Version 2",
        version_number: 1,
        reason: "Updated files",
        files_count: 2,
      },
      files: [
        {
          id: "df_sample",
          version_id: "dfv_sample",
          name: "notes.txt",
          path: "notes.txt",
          version_number: 1,
          deleted: false,
          current_file_version: {
            id: "dfv_sample",
            file_id: "df_sample",
            version_number: 1,
            name: "notes.txt",
          },
        },
      ],
    },
  },
};
