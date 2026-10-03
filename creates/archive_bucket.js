const {
  apiRequest,
  formatBucket,
  wrappedData,
  requireConfirmation,
} = require("../lib/revdoku");

const perform = async (z, bundle) => {
  requireConfirmation(z, bundle);
  const response = await apiRequest(z, bundle, {
    method: "POST",
    json: { reason: bundle.inputData.reason },
    path: `/buckets/${encodeURIComponent(bundle.inputData.bucket_id)}/archive`,
  });

  return formatBucket(wrappedData(response, "bucket"));
};

module.exports = {
  key: "archive_bucket",
  noun: "Bucket",
  display: {
    label: "Archive Bucket",
    description:
      "Archives a Revdoku bucket. Library buckets cannot be archived.",
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
        key: "bucket_id",
        label: "Bucket",
        dynamic: "buckets.id.name",
        required: true,
      },
    ],
    perform,
    sample: {
      id: "bkt_sample",
      name: "Old bucket",
      archived: true,
    },
  },
};
