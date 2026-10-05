const { apiRequest, formatMailbox, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const params = {};
  if (
    bundle.inputData.archived !== undefined &&
    bundle.inputData.archived !== ""
  ) {
    params.archived = bundle.inputData.archived;
  }

  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: "/mailboxes",
    params,
  });
  return (wrappedData(response, "mailboxes") || []).map(formatMailbox);
};

module.exports = {
  key: "mailboxes",
  noun: "Mailbox",
  display: {
    label: "Available Mailboxes",
    description: "Lists Revdoku mailboxes for dropdowns.",
    hidden: true,
  },
  operation: {
    inputFields: [
      {
        key: "archived",
        type: "boolean",
        required: false,
        label: "Archived mailboxes only",
      },
    ],
    perform,
    sample: {
      id: "bkt_sample",
      name: "project@revdokumail.com",
      email: { address: "project@revdokumail.com" },
      permission: "write",
      zapier_permission: "write",
      dashboard_url: "https://app.revdoku.com/mailboxes",
      account_access_url: "https://app.revdoku.com/account/access",
    },
  },
};
