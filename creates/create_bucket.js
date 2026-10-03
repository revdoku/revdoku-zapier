const {
  apiRequest,
  formatBucket,
  parseJsonObject,
  parseList,
  wrappedData,
} = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const response = await apiRequest(z, bundle, {
    method: "POST",
    path: "/buckets",
    json: {
      reason: input.reason,
      bucket: {
        title: input.title,
        description: input.description || undefined,
        tag_paths: parseList(input.tag_paths),
        ...(input.email_username
          ? { email: { username: input.email_username } }
          : {}),
        metadata: parseJsonObject(z, input.metadata, "Metadata"),
      },
    },
  });

  return formatBucket(wrappedData(response, "bucket"));
};

module.exports = {
  key: "create_bucket",
  noun: "Bucket",
  display: {
    label: "Create Bucket",
    description:
      "Creates a private Revdoku bucket for files, generated output, and incoming email.",
  },
  operation: {
    inputFields: [
      {
        key: "title",
        label: "Title",
        type: "string",
        required: false,
      },
      { key: "email_username", label: "Email Username", required: false },
      { key: "reason", label: "Reason", required: false },
      {
        key: "description",
        label: "Description",
        type: "text",
        required: false,
      },
      {
        key: "tag_paths",
        label: "Labels",
        type: "text",
        required: false,
        helpText:
          "Comma- or line-separated labels such as invoices, support, or projects/work.",
      },
      {
        key: "metadata",
        label: "Metadata JSON",
        type: "text",
        required: false,
        helpText:
          'Optional JSON object for future lookup, for example {"project":"invoices"}.',
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
