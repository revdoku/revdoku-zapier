const { apiRequest, wrappedData } = require("../lib/revdoku");

const perform = async (z, bundle) => {
  const response = await apiRequest(z, bundle, {
    method: "GET",
    path: "/tags",
  });

  return (wrappedData(response, "tags") || []).map((tag) => ({
    ...tag,
    id: tag.id,
    name: tag.full_path || tag.name || tag.id,
  }));
};

module.exports = {
  key: "tags",
  noun: "Bucket Label",
  display: {
    label: "Bucket Labels",
    description: "Lists reusable Revdoku bucket labels.",
    hidden: true,
  },
  operation: {
    perform,
    sample: {
      id: "tag_sample",
      name: "ai-agent",
      full_path: "ai-agent",
    },
  },
};
