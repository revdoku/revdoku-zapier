const { apiRequest, wrappedData } = require("../lib/revdoku");
const { projectField, ticketPath } = require("../lib/tickets");

// Zapier keeps no state between polls. Each poll reads the tickets with
// activity in this window and the received messages of the same window.
const WINDOW_MS = 24 * 60 * 60 * 1000;
// The ticket list comes newest activity first, 25 a page. A poll follows it for
// at most this many pages: a burst of replies and solves on other tickets must
// not hide a ticket with a new message below the first page.
const TICKET_PAGE = 25;
const MAX_TICKET_PAGES = 4;
const MAX_TICKETS = TICKET_PAGE * MAX_TICKET_PAGES;
const SAMPLE_TICKETS = 5;
// Messages come oldest first, 50 a page.
const MESSAGE_PAGE = 50;
const MAX_MESSAGE_PAGES = 4;
// A new message can wait about a minute for Revdoku's check; the email index
// of a project can be in preparation. Both are read at the next poll.
const NOT_READY = ["EMAIL_INDEX_BUILDING", "EMAIL_LABELING_PENDING"];

const ticketMessages = async (z, bundle, ticket) => {
  const messages = [];
  let cursor;
  for (let page = 0; page < MAX_MESSAGE_PAGES; page += 1) {
    const data = wrappedData(
      await apiRequest(z, bundle, {
        path: ticketPath(
          { project_id: bundle.inputData.project_id, ticket_id: ticket.id },
          "/messages",
        ),
        params: { limit: MESSAGE_PAGE, ...(cursor ? { cursor } : {}) },
      }),
    );
    messages.push(...(data.messages || []));
    const next = data.pagination?.next_cursor;
    if (!data.pagination?.has_more || !next || next === cursor) break;
    cursor = next;
  }
  return messages;
};

// The dashboard page of the project, with the message open in Support: the same
// address that Revdoku's own notification emails use. null when it is unknown.
const ticketUrl = (dashboardUrl, message) => {
  if (!dashboardUrl) return null;
  try {
    const url = new URL(dashboardUrl);
    url.searchParams.set("view", "mailbox");
    url.searchParams.set("email_id", message.id);
    return url.toString();
  } catch (_error) {
    return null;
  }
};

// One project read per poll, only when there is something to send. A failed
// read leaves the links empty and never fails the poll.
const projectDashboardUrl = async (z, bundle) => {
  try {
    const project = wrappedData(
      await apiRequest(z, bundle, {
        path: `/projects/${encodeURIComponent(bundle.inputData.project_id)}`,
      }),
      "project",
    );
    return project?.dashboard_url || null;
  } catch (_error) {
    return null;
  }
};

const formatRequest = (message, ticket, opening, dashboardUrl) => ({
  id: message.id,
  ticket_id: ticket.id,
  ticket_number: ticket.number,
  new_ticket: message.id === opening?.id,
  ticket_status: ticket.status,
  channel: message.channel || ticket.channel,
  requester_name: ticket.requester?.name ?? null,
  requester_address: ticket.requester?.address ?? null,
  subject: message.subject ?? ticket.subject ?? null,
  body_text: message.body_text ?? null,
  body_status: message.body_status,
  received_at: message.received_at,
  ticket_url: ticketUrl(dashboardUrl, message),
});

const perform = async (z, bundle) => {
  // A test in the Zap editor shows any earlier request, not only today's.
  const sample = Boolean(bundle.meta?.isLoadingSample);
  const since = sample ? null : Date.now() - WINDOW_MS;
  const inWindow = (time) => since === null || Date.parse(time) >= since;
  const tickets = [];
  let cursor;
  for (let page = 0; page < (sample ? 1 : MAX_TICKET_PAGES); page += 1) {
    let data;
    try {
      data = wrappedData(
        await apiRequest(z, bundle, {
          path: ticketPath({ project_id: bundle.inputData.project_id }),
          params: {
            limit: sample ? SAMPLE_TICKETS : TICKET_PAGE,
            ...(since === null
              ? {}
              : { updated_after: new Date(since).toISOString() }),
            ...(cursor ? { cursor } : {}),
          },
        }),
      );
    } catch (error) {
      if (!NOT_READY.includes(error.revdokuCode)) throw error;
      // The first poll of a Zap stores what it sees as already seen. An empty
      // answer then would make the next poll send the whole window.
      if (bundle.meta?.isPopulatingDedupe) throw error;
      break;
    }
    tickets.push(...(data.tickets || []));
    const next = data.pagination?.next_cursor;
    if (!data.pagination?.has_more || !next || next === cursor) break;
    cursor = next;
  }

  const found = [];
  for (const ticket of tickets) {
    // A status change alone also counts as activity: it has no new message.
    if (!ticket.last_message_at || !inWindow(ticket.last_message_at)) continue;
    let messages;
    try {
      messages = await ticketMessages(z, bundle, ticket);
    } catch (error) {
      if (NOT_READY.includes(error.revdokuCode)) continue;
      throw error;
    }
    const received = messages.filter(
      (message) => message.direction === "received",
    );
    for (const message of received) {
      // Withheld: Junk, or a new message that Revdoku still checks. A message
      // that is not sent to Zapier is not marked as seen, so the next poll
      // sends it when the check passed.
      if (message.withheld || message.body_status === "withheld") continue;
      if (!message.received_at || !inWindow(message.received_at)) continue;
      found.push({ message, ticket, opening: received[0] });
    }
  }
  if (found.length === 0) return [];

  const dashboardUrl = await projectDashboardUrl(z, bundle);
  return found
    .map(({ message, ticket, opening }) =>
      formatRequest(message, ticket, opening, dashboardUrl),
    )
    .sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at));
};

module.exports = {
  key: "new_support_request",
  noun: "Support Request",
  display: {
    label: "New Support Request",
    description:
      "Triggers when a person sends a message to your docs site's support: a new ticket or a new message on a ticket.",
  },
  operation: {
    inputFields: [projectField],
    perform,
    sample: {
      id: "eml_sample",
      ticket_id: "tkt_sample",
      ticket_number: 3,
      new_ticket: true,
      ticket_status: "open",
      channel: "chat",
      requester_name: "Dana Developer",
      requester_address: "dev@example.com",
      subject: "How do I rotate my API key?",
      body_text: "How do I rotate my API key?",
      body_status: "complete",
      received_at: "2026-10-11T12:05:00.000000Z",
      ticket_url:
        "https://app.revdoku.com/projects/view?account_id=acct_sample&id=prj_sample&view=mailbox&email_id=eml_sample",
    },
    outputFields: [
      { key: "id", label: "Message ID" },
      { key: "ticket_id", label: "Ticket ID" },
      { key: "ticket_number", label: "Ticket Number", type: "integer" },
      { key: "new_ticket", label: "New Ticket", type: "boolean" },
      { key: "ticket_status", label: "Ticket Status" },
      { key: "channel", label: "Channel" },
      { key: "requester_name", label: "Requester Name" },
      { key: "requester_address", label: "Requester Address" },
      { key: "subject", label: "Subject" },
      { key: "body_text", label: "Message Text" },
      { key: "body_status", label: "Message Text Status" },
      { key: "received_at", label: "Received", type: "datetime" },
      { key: "ticket_url", label: "Open in Revdoku" },
    ],
  },
  limits: {
    WINDOW_MS,
    TICKET_PAGE,
    MAX_TICKET_PAGES,
    MAX_TICKETS,
    MAX_MESSAGE_PAGES,
    MESSAGE_PAGE,
  },
};
