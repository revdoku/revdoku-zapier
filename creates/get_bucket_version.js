const { apiRequest, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: `/buckets/${encodeURIComponent(bundle.inputData.bucket_id)}/versions/${encodeURIComponent(bundle.inputData.version_id)}`,
  });

  return {
    version: wrappedData(response, "version"),
    files: wrappedData(response, "files") || [],
  };
};

module.exports = {
  key: "get_bucket_version",
  noun: "Bucket Version",
  display: {
    label: "Get Bucket Version",
    description:
      "Returns one Revdoku bucket version and the files in that version.",
  },
  operation: {
    inputFields: [
      {
        key: "bucket_id",
        label: "Bucket",
        dynamic: "buckets.id.name",
        required: true,
        helpText: "Choose the bucket that owns the version.",
      },
      {
        key: "version_id",
        label: "Version",
        required: true,
        helpText: "Paste or select the version ID from List Bucket Versions.",
      },
    ],
    perform,
    sample: {
      version: {
        id: "bktrv_sample",
        bucket_id: "bkt_sample",
        label: "Version 2",
        version_number: 1,
        reason: "Updated files",
        files_count: 2,
      },
      files: [
        {
          id: "df_sample",
          version_id: "dfv_sample",
          name: "notes.txt",
          path: "notes.txt",
          version_number: 1,
          deleted: false,
          current_file_version: {
            id: "dfv_sample",
            file_id: "df_sample",
            version_number: 1,
            name: "notes.txt",
          },
        },
      ],
    },
  },
};
