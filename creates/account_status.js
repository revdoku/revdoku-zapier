const { apiRequest, wrappedData } = require("../lib/revdoku");
module.exports = {
  key: "account_status",
  noun: "Connection",
  display: {
    label: "Get Connection Status",
    description: "Returns the account and permissions for this connection.",
  },
  operation: {
    perform: async (z, bundle) =>
      wrappedData(await apiRequest(z, bundle, { path: "/status" })),
    sample: {
      connected: true,
      account: { id: "acct_sample", name: "Example Account" },
    },
  },
};
