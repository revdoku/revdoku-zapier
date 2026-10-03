const { apiRequest, formatBucket, wrappedData } = require("../lib/revdoku");

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
    path: "/buckets",
    params,
  });
  return (wrappedData(response, "buckets") || []).map(formatBucket);
};

module.exports = {
  key: "buckets",
  noun: "Bucket",
  display: {
    label: "Available Buckets",
    description: "Lists Revdoku buckets for dropdowns.",
    hidden: true,
  },
  operation: {
    inputFields: [
      {
        key: "archived",
        type: "boolean",
        required: false,
        label: "Archived buckets only",
      },
    ],
    perform,
    sample: {
      id: "bkt_sample",
      name: "Project files",
      title: "Project files",
      permission: "write",
      zapier_permission: "write",
      dashboard_url: "https://app.revdoku.com/buckets",
      account_access_url: "https://app.revdoku.com/account/access",
    },
  },
};
