const { apiRequest, wrappedData } = require("../lib/revdoku");
const {
  projectField,
  ticketPath,
  formatTicket,
  ticketSample,
  ticketOutputFields,
} = require("../lib/tickets");

// The ticket list has no number filter. A number is looked for in the
// tickets with the newest activity: at most 3 pages of 200.
const NUMBER_PAGE = 200;
const MAX_NUMBER_PAGES = 3;

const findByNumber = async (z, bundle, number) => {
  let cursor;
  for (let page = 0; page < MAX_NUMBER_PAGES; page += 1) {
    const data = wrappedData(
      await apiRequest(z, bundle, {
        path: ticketPath({ project_id: bundle.inputData.project_id }),
        params: { limit: NUMBER_PAGE, ...(cursor ? { cursor } : {}) },
      }),
    );
    const ticket = (data.tickets || []).find((entry) => entry.number === number);
    if (ticket) return ticket;
    const next = data.pagination?.next_cursor;
    if (!data.pagination?.has_more || !next || next === cursor) break;
    cursor = next;
  }
  return null;
};

const perform = async (z, bundle) => {
  const { ticket_id: ticketId, ticket_number: ticketNumber } = bundle.inputData;
  let ticket = null;
  if (ticketId) {
    const response = await apiRequest(z, bundle, {
      path: ticketPath(bundle.inputData),
      allowNotFound: true,
    });
    ticket = response && wrappedData(response, "ticket");
  } else if (
    ticketNumber !== undefined &&
    ticketNumber !== null &&
    ticketNumber !== ""
  ) {
    const number = Number(String(ticketNumber).replace(/^#/, ""));
    if (!Number.isInteger(number) || number < 1) {
      throw new z.errors.Error(
        "Ticket Number must be a whole number, such as 12.",
        "InvalidTicketNumber",
      );
    }
    ticket = await findByNumber(z, bundle, number);
  } else {
    throw new z.errors.Error(
      "Enter a Ticket ID or a Ticket Number.",
      "TicketRequired",
    );
  }
  return ticket ? [formatTicket(ticket)] : [];
};

module.exports = {
  key: "find_ticket",
  noun: "Ticket",
  display: {
    label: "Find Ticket",
    description: "Finds a ticket by its ID or its number.",
  },
  operation: {
    inputFields: [
      projectField,
      {
        key: "ticket_id",
        label: "Ticket ID",
        type: "string",
        required: false,
        helpText: "Starts with tkt_. Use this when you have it.",
      },
      {
        key: "ticket_number",
        label: "Ticket Number",
        type: "integer",
        required: false,
        helpText:
          "The number in a reply's subject, such as 12 for [#12]. Used when Ticket ID is empty. Looks in the 600 tickets with the newest activity.",
      },
    ],
    perform,
    sample: ticketSample,
    outputFields: ticketOutputFields,
  },
  limits: { NUMBER_PAGE, MAX_NUMBER_PAGES },
};
