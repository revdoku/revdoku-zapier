const {
  apiRequest,
  formatFile,
  wrappedData,
  requireConfirmation,
} = require("../lib/revdoku");

const perform = async (z, bundle) => {
  requireConfirmation(z, bundle);
  const response = await apiRequest(z, bundle, {
    method: "DELETE",
    json: { reason: bundle.inputData.reason },
    path: `/buckets/${encodeURIComponent(bundle.inputData.bucket_id)}/files/${encodeURIComponent(bundle.inputData.file_id)}`,
  });

  return formatFile(wrappedData(response, "file"), bundle);
};

module.exports = {
  key: "delete_bucket_file",
  noun: "Bucket File",
  display: {
    label: "Delete Bucket File",
    description:
      "Deletes a file from a Revdoku bucket with administrator permission.",
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
        altersDynamicFields: true,
        required: true,
      },
      {
        key: "file_id",
        label: "File",
        dynamic: "bucket_files.id.name",
        required: true,
      },
    ],
    perform,
    sample: {
      id: "df_sample",
      bucket_id: "bkt_sample",
      name: "old-file.txt",
      deleted: true,
    },
  },
};
