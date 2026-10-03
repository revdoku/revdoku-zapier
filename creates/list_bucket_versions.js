const { apiRequest, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: `/buckets/${encodeURIComponent(bundle.inputData.bucket_id)}/versions`,
  });

  const versions = wrappedData(response, "versions") || [];
  return {
    versions,
    count: versions.length,
    current_version_id: wrappedData(response, "current_version_id") || null,
  };
};

module.exports = {
  key: "list_bucket_versions",
  noun: "Bucket Version",
  display: {
    label: "List Bucket Versions",
    description:
      "Lists a Revdoku bucket version history with change summaries.",
  },
  operation: {
    inputFields: [
      {
        key: "bucket_id",
        label: "Bucket",
        dynamic: "buckets.id.name",
        required: true,
        helpText:
          "Choose the bucket whose version history you want to inspect.",
      },
    ],
    perform,
    sample: {
      count: 2,
      current_version_id: "bktrv_sample",
      versions: [
        {
          id: "bktrv_sample",
          bucket_id: "bkt_sample",
          label: "Version 2",
          version_number: 1,
          reason: "Updated files",
          created_at: "2026-05-29T12:00:00Z",
          created_ago: "1 day ago",
          files_count: 2,
          changes: [
            {
              path: "notes.txt",
              status: "modified",
            },
          ],
        },
      ],
    },
  },
};
