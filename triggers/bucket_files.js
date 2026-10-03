const { apiRequest, formatFile, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const bucketId = bundle.inputData.bucket_id;
  if (!bucketId) return [];

  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: `/buckets/${encodeURIComponent(bucketId)}/files`,
    params: { limit: 100, offset: (bundle.meta?.page || 0) * 100 },
  });

  return (wrappedData(response, "files") || []).map((file) =>
    formatFile(file, bundle),
  );
};

module.exports = {
  key: "bucket_files",
  noun: "Bucket File",
  display: {
    label: "Bucket Files",
    description: "Lists files in a selected Revdoku bucket.",
    hidden: true,
  },
  operation: {
    inputFields: [
      {
        key: "bucket_id",
        label: "Bucket",
        dynamic: "buckets.id.name",
        required: true,
      },
    ],
    canPaginate: true,
    perform,
    sample: {
      id: "df_sample",
      name: "reports/summary.pdf",
      filename: "summary.pdf",
      path: "reports/summary.pdf",
      bucket_id: "bkt_sample",
      content_type: "application/pdf",
      byte_size: 12000,
    },
  },
};
