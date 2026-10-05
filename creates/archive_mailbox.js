const {
  apiRequest,
  formatMailbox,
  wrappedData,
  requireConfirmation,
} = require("../lib/revdoku");

const perform = async (z, bundle) => {
  requireConfirmation(z, bundle);
  const response = await apiRequest(z, bundle, {
    method: "POST",
    json: { reason: bundle.inputData.reason },
    path: `/mailboxes/${encodeURIComponent(bundle.inputData.mailbox_id)}/archive`,
  });

  return formatMailbox(wrappedData(response, "mailbox"));
};

module.exports = {
  key: "archive_mailbox",
  noun: "Mailbox",
  display: {
    label: "Archive Mailbox",
    description:
      "Archives a Revdoku mailbox. Library mailboxes cannot be archived.",
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
        required: true,
      },
    ],
    perform,
    sample: {
      id: "bkt_sample",
      name: "Old mailbox",
      archived: true,
    },
  },
};
