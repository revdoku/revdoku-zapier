const { apiRequest, formatBucket, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const bucketId = String(bundle.inputData.bucket_id || "").trim();
  if (bucketId) {
    const response = await apiRequest(z, bundle, {
      method: "GET",
      path: `/buckets/${encodeURIComponent(bucketId)}`,
      allowNotFound: true,
    });
    return response ? [formatBucket(wrappedData(response, "bucket"))] : [];
  }

  const query = String(bundle.inputData.title || "")
    .trim()
    .toLowerCase();
  if (!query) return [];

  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: "/buckets",
  });
  const buckets = (wrappedData(response, "buckets") || []).map(formatBucket);
  const exact = buckets.find((bucket) => bucket.title.toLowerCase() === query);
  const partial = buckets.find((bucket) =>
    bucket.title.toLowerCase().includes(query),
  );
  return [exact || partial].filter(Boolean);
};

module.exports = {
  key: "find_bucket",
  noun: "Bucket",
  display: {
    label: "Find Bucket",
    description: "Finds a Revdoku bucket by ID or title.",
  },
  operation: {
    inputFields: [
      {
        key: "bucket_id",
        label: "Bucket",
        type: "string",
        dynamic: "buckets.id.name",
        required: false,
        helpText:
          "Optional bucket dropdown or bkt_... ID. If provided, title is ignored.",
      },
      {
        key: "title",
        label: "Title contains",
        type: "string",
        required: false,
      },
    ],
    perform,
    sample: {
      id: "bkt_sample",
      name: "Project files",
      title: "Project files",
      permission: "write",
    },
  },
};
