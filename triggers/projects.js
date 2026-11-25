const { apiRequest, wrappedData } = require("../lib/revdoku");

// The name that a person knows the project by: its title, else its email address.
const projectName = (project) =>
  project.title || project.email?.address || project.id;

const perform = async (z, bundle) => {
  // One page of the maximum size; dropdowns do not page through cursors.
  const response = await apiRequest(z, bundle, {
    path: "/projects",
    params: { status: "active", limit: 200 },
  });
  return (wrappedData(response, "projects") || []).map((project) => ({
    id: project.id,
    name: projectName(project),
  }));
};

module.exports = {
  key: "projects",
  noun: "Project",
  display: {
    label: "Projects",
    description: "Lists the projects of the account for dropdowns.",
    hidden: true,
  },
  operation: {
    perform,
    sample: { id: "prj_sample", name: "Acme Docs" },
  },
};
