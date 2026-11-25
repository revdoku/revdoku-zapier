const { apiRequest, wrappedData } = require("../lib/revdoku");
const {
  projectField,
  ticketIdField,
  ticketPath,
  formatTicket,
  ticketSample,
  ticketOutputFields,
} = require("../lib/tickets");

const perform = async (z, bundle) =>
  formatTicket(
    wrappedData(
      await apiRequest(z, bundle, {
        method: "PATCH",
        path: ticketPath(bundle.inputData),
        json: { status: bundle.inputData.status },
      }),
      "ticket",
    ),
  );

module.exports = {
  key: "set_ticket_status",
  noun: "Ticket",
  display: {
    label: "Solve or Reopen Ticket",
    description: "Marks a ticket as solved, or opens it again.",
  },
  operation: {
    inputFields: [
      projectField,
      ticketIdField,
      {
        key: "status",
        label: "Status",
        type: "string",
        required: true,
        choices: { solved: "Solved", open: "Open" },
        default: "solved",
      },
    ],
    perform,
    sample: {
      ...ticketSample,
      status: "solved",
      solved_at: "2026-10-11T13:00:00.000000Z",
    },
    outputFields: ticketOutputFields,
  },
};
