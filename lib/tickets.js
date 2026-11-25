const projectField = {
  key: "project_id",
  label: "Project",
  type: "string",
  required: true,
  dynamic: "projects.id.name",
  helpText: "The project of your docs site.",
};

const ticketIdField = {
  key: "ticket_id",
  label: "Ticket ID",
  type: "string",
  required: true,
  helpText:
    "Use Ticket ID from New Support Request or Find Ticket. It starts with tkt_.",
};

const ticketPath = (input, suffix = "") =>
  `/projects/${encodeURIComponent(input.project_id)}/tickets${
    input.ticket_id ? `/${encodeURIComponent(input.ticket_id)}` : ""
  }${suffix}`;

// One flat ticket, without labels.
const formatTicket = (ticket) => ({
  id: ticket.id,
  number: ticket.number,
  status: ticket.status,
  subject: ticket.subject ?? null,
  channel: ticket.channel,
  requester_name: ticket.requester?.name ?? null,
  requester_address: ticket.requester?.address ?? null,
  message_count: ticket.message_count,
  unread_count: ticket.unread_count,
  created_at: ticket.created_at,
  updated_at: ticket.updated_at,
  last_message_at: ticket.last_message_at ?? null,
  solved_at: ticket.solved_at ?? null,
});

const ticketSample = {
  id: "tkt_sample",
  number: 3,
  status: "open",
  subject: "How do I rotate my API key?",
  channel: "email",
  requester_name: "Dana Developer",
  requester_address: "dev@example.com",
  message_count: 2,
  unread_count: 1,
  created_at: "2026-10-11T12:05:00.000000Z",
  updated_at: "2026-10-11T12:30:00.000000Z",
  last_message_at: "2026-10-11T12:30:00.000000Z",
  solved_at: null,
};

const ticketOutputFields = [
  { key: "id", label: "Ticket ID" },
  { key: "number", label: "Ticket Number", type: "integer" },
  { key: "status", label: "Ticket Status" },
  { key: "subject", label: "Subject" },
  { key: "channel", label: "Channel" },
  { key: "requester_name", label: "Requester Name" },
  { key: "requester_address", label: "Requester Address" },
  { key: "message_count", label: "Messages", type: "integer" },
  { key: "unread_count", label: "Unread Messages", type: "integer" },
  { key: "created_at", label: "Created", type: "datetime" },
  { key: "updated_at", label: "Last Activity", type: "datetime" },
  { key: "last_message_at", label: "Last Message", type: "datetime" },
  { key: "solved_at", label: "Solved", type: "datetime" },
];

module.exports = {
  projectField,
  ticketIdField,
  ticketPath,
  formatTicket,
  ticketSample,
  ticketOutputFields,
};
