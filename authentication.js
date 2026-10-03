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
        "Create a key in [Account > Access](https://app.revdoku.com/account/access).",
    },
    { key: "account_id", label: "Account ID", type: "string", required: false },
  ],
  test: async (z, bundle) => {
    const data = wrappedData(await apiRequest(z, bundle, { path: "/status" }));
    return { account_id: data.account.id, account_name: data.account.name };
  },
  connectionLabel: "{{account_name}} ({{account_id}})",
};
