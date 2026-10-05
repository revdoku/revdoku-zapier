const { apiRequest, wrappedData } = require("../lib/revdoku");
module.exports = {
  key: "account_limits",
  noun: "Account Limits",
  display: {
    label: "Get Account Limits",
    description: "Returns the effective limits for the selected account.",
  },
  operation: {
    perform: async (z, bundle) =>
      wrappedData(await apiRequest(z, bundle, { path: "/account/limits" })),
    sample: {
      account_id: "acct_sample",
      limits: { max_mailboxes: 3, max_storage_bytes: 1073741824 },
    },
  },
};
