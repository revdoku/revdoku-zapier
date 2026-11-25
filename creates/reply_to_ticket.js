const { apiRequest, wrappedData } = require("../lib/revdoku");
const { projectField, ticketIdField, ticketPath } = require("../lib/tickets");

const perform = async (z, bundle) => {
  // A send is made once. See `once` in lib/revdoku.js.
  const message = wrappedData(
    await apiRequest(z, bundle, {
      method: "POST",
      path: ticketPath(bundle.inputData, "/messages"),
      json: { text: bundle.inputData.text },
      once: true,
    }),
    "message",
  );
  const status = message.delivery?.status ?? null;
  return {
    id: message.id,
    ticket_id: message.ticket_id || bundle.inputData.ticket_id,
    subject: message.subject ?? null,
    delivery_status: status,
    awaiting_approval: status === "awaiting_approval",
    created_at: message.received_at ?? null,
  };
};

module.exports = {
  key: "reply_to_ticket",
  noun: "Reply",
  display: {
    label: "Reply to Ticket",
    description:
      "Sends a reply to the person who opened the ticket.",
  },
  operation: {
    inputFields: [
      projectField,
      ticketIdField,
      {
        key: "text",
        label: "Reply Text",
        type: "text",
        required: true,
        helpText:
          "Plain text. The reply goes to the person who asked. Uses credits; see [Pricing](https://app.revdoku.com/pricing).",
      },
    ],
    perform,
    sample: {
      id: "eml_reply_sample",
      ticket_id: "tkt_sample",
      subject: "[#3] Re: How do I rotate my API key?",
      delivery_status: "queued",
      awaiting_approval: false,
      created_at: "2026-10-11T12:40:00.000000Z",
    },
    outputFields: [
      { key: "id", label: "Reply Message ID" },
      { key: "ticket_id", label: "Ticket ID" },
      { key: "subject", label: "Subject" },
      { key: "delivery_status", label: "Delivery Status" },
      { key: "awaiting_approval", label: "Awaiting Approval", type: "boolean" },
      { key: "created_at", label: "Created", type: "datetime" },
    ],
  },
};
