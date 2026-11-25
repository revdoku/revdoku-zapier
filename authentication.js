const { apiRequest, wrappedData } = require("./lib/revdoku");

module.exports = {
  type: "custom",
  fields: [
    {
      key: "api_token",
      label: "API Key",
      type: "password",
      required: true,
      helpText:
        "Create a key in [Account > Access](https://app.revdoku.com/account/access). The steps need write access to the project.",
    },
    { key: "account_id", label: "Account ID", type: "string", required: false, helpText: "Only for another account that the key can reach. Leave it empty for the key's own account." },
  ],
  test: async (z, bundle) => {
    // GET /v1/status answers the resource under its key: status.
    const status = wrappedData(await apiRequest(z, bundle, { path: "/status" }), "status");
    return { account_id: status.account.id, account_name: status.account.name };
  },
  connectionLabel: "{{account_name}} ({{account_id}})",
};
