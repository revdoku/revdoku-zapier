const {
  apiRequest,
  downloadMailboxFile,
  formatFile,
  wrappedData,
} = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const { mailbox_id: mailboxId, file_id: fileId, path } = bundle.inputData;
  const endpoint = `/mailboxes/${encodeURIComponent(mailboxId)}/files`;
  let found;
  if (fileId) {
    found = wrappedData(
      await apiRequest(z, bundle, {
        path: `${endpoint}/${encodeURIComponent(fileId)}`,
        allowNotFound: true,
      }),
      "file",
    );
  } else {
    if (!path) return [];
    let offset = 0;
    do {
      const data = wrappedData(
        await apiRequest(z, bundle, {
          path: endpoint,
          params: { q: path, limit: 100, offset },
        }),
      );
      found = data.files.find((file) => file.path === path);
      if (found || !data.pagination.has_more) break;
      if (
        !Number.isInteger(data.pagination.next_offset) ||
        data.pagination.next_offset <= offset
      ) {
        throw new z.errors.Error(
          "File pagination did not advance.",
          "InvalidPagination",
        );
      }
      offset = data.pagination.next_offset;
    } while (!found);
  }
  if (!found) return [];
  const file = formatFile(found);
  return [
    {
      ...file,
      file: z.dehydrateFile(downloadMailboxFile, {
        mailbox_id: mailboxId,
        file_id: file.id,
        filename: file.filename,
        content_type: file.content_type,
      }),
    },
  ];
};

module.exports = {
  key: "find_mailbox_file",
  noun: "Mailbox File",
  display: {
    label: "Find Mailbox File",
    description:
      "Finds a file by ID or exact path and returns its contents as a Zapier file.",
  },
  operation: {
    inputFields: [
      {
        key: "mailbox_id",
        label: "Mailbox",
        dynamic: "mailboxes.id.name",
        required: true,
        altersDynamicFields: true,
      },
      {
        key: "file_id",
        label: "File",
        dynamic: "mailbox_files.id.name",
        required: false,
      },
      { key: "path", label: "Exact Path", required: false },
    ],
    perform,
    sample: {
      id: "df_sample",
      mailbox_id: "bkt_sample",
      name: "notes.txt",
      path: "notes.txt",
    },
  },
};
