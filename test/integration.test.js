const nock = require("nock");
const zapier = require("zapier-platform-core");
const App = require("../index");
const trigger = require("../triggers/new_support_request");
const search = require("../searches/find_ticket");

const run = zapier.createAppTester(App);
const origin = "https://api.revdoku.com";
const authData = { api_token: "revdoku_test_key", account_id: "acct_client" };
const bundle = (inputData = {}, meta = {}) => ({ authData, inputData, meta });
const ok = (data) => ({ success: true, data });
const fail = (code, message) => ({ success: false, error: { code, message } });
const page = (key, rows, next = null) => ({
  [key]: rows,
  pagination: { limit: rows.length, has_more: Boolean(next), next_cursor: next },
});
const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
const api = () =>
  nock(origin, {
    reqheaders: {
      authorization: `Bearer ${authData.api_token}`,
      "x-revdoku-agent": "zapier",
    },
  });
const tickets = "/v1/projects/prj_1/tickets";

const ticket = (overrides = {}) => ({
  id: "tkt_1",
  number: 3,
  status: "open",
  subject: "How do I rotate my API key?",
  channel: "email",
  requester: { address: "dev@example.com", name: "Dana Developer" },
  labels: [{ id: "tag_1", name: "Personal", color: "blue" }],
  message_count: 1,
  unread_count: 1,
  created_at: ago(30),
  updated_at: ago(30),
  last_message_at: ago(30),
  solved_at: null,
  ...overrides,
});
const message = (overrides = {}) => ({
  id: "eml_1",
  direction: "received",
  subject: "How do I rotate my API key?",
  from_addresses: [{ address: "dev@example.com", name: "Dana Developer" }],
  received_at: ago(30),
  body_status: "complete",
  body_text: "How do I rotate my API key?",
  withheld: false,
  labels: [],
  attachment_count: 1,
  attachments: [{ id: "eat_1", name: "screen.png", content_type: "image/png", size_bytes: 3, origin: null }],
  ticket_id: "tkt_1",
  channel: "email",
  ...overrides,
});
const poll = (meta) =>
  run(
    App.triggers.new_support_request.operation.perform,
    bundle({ project_id: "prj_1" }, meta),
  );
const listTickets = (rows, check = () => true, next = null) =>
  api()
    .get(tickets)
    .query((query) => check(query))
    .reply(200, ok(page("tickets", rows, next)));
// The trigger reads the project once per poll with results, for the link to the message in Revdoku.
const dashboardUrl = "https://app.revdoku.com/projects/view?account_id=acct_client&id=prj_1";
const readProject = (status = 200, body = ok({ project: { id: "prj_1", dashboard_url: dashboardUrl } })) =>
  api().get("/v1/projects/prj_1").query({ account_id: "acct_client" }).reply(status, body);
const listMessages = (ticketId, rows, next = null, cursor) =>
  api()
    .get(`${tickets}/${ticketId}/messages`)
    .query((query) => query.limit === "50" && query.cursor === cursor)
    .reply(200, ok(page("messages", rows, next)));

beforeAll(() => {
  if (!nock.isActive()) nock.activate();
  nock.disableNetConnect();
});
afterEach(() => {
  const pending = nock.pendingMocks();
  nock.cleanAll();
  expect(pending).toEqual([]);
});
afterAll(() => {
  nock.restore();
  nock.enableNetConnect();
});

describe("the app", () => {
  test("has exactly the four steps and the hidden project dropdown", () => {
    expect(Object.keys(App.triggers)).toEqual(["new_support_request", "projects"]);
    expect(App.triggers.projects.display.hidden).toBe(true);
    expect(Object.keys(App.creates)).toEqual(["reply_to_ticket", "set_ticket_status"]);
    expect(Object.keys(App.searches)).toEqual(["find_ticket"]);
    expect(App.hydrators).toBeUndefined();
    expect(App.version).toBe("5.0.0");
  });

  test("every step picks the project by name", () => {
    const steps = [
      App.triggers.new_support_request,
      App.creates.reply_to_ticket,
      App.creates.set_ticket_status,
      App.searches.find_ticket,
    ];
    for (const step of steps) {
      expect(step.operation.inputFields[0]).toMatchObject({
        key: "project_id",
        required: true,
        dynamic: "projects.id.name",
      });
    }
  });

  test("text for people names no mailbox, price or Ask AI", () => {
    // Links are addresses, not text: the dashboard address of a message has view=mailbox.
    const text = JSON.stringify(App, (_key, value) =>
      typeof value === "function" ? undefined : value,
    ).replace(/https?:\/\/[^\s"\\]+/g, "");
    expect(text).not.toMatch(/mailbox|\bfree\b|Ask AI|\$\d/i);
  });
});

describe("authentication", () => {
  test("reads the status and labels the connection with the account", async () => {
    api()
      .get("/v1/status")
      .query({ account_id: "acct_client" })
      .reply(200, ok({ status: { account: { id: "acct_client", name: "Client" } } }));
    expect(await run(App.authentication.test, bundle())).toEqual({
      account_id: "acct_client",
      account_name: "Client",
    });
    expect(App.authentication.connectionLabel).toContain("{{account_name}}");
  });

  test("a refused key asks for a new connection", async () => {
    api().get("/v1/status").query(true).reply(401, fail("UNAUTHORIZED", "No"));
    await expect(run(App.authentication.test, bundle())).rejects.toThrow(
      /invalid or expired/,
    );
  });
});

describe("project dropdown", () => {
  test("names a project by its title, else its email address, else its ID", async () => {
    api()
      .get("/v1/projects")
      .query({ account_id: "acct_client", limit: 200, status: "active" })
      .reply(
        200,
        ok(
          page("projects", [
            { id: "prj_1", title: "Acme Docs", email: { address: "support@acme-docs.revdoku.net" } },
            { id: "prj_2", title: null, email: { address: "support@old.revdoku.net" } },
            { id: "prj_3", title: null, email: {} },
          ]),
        ),
      );
    expect(await run(App.triggers.projects.operation.perform, bundle())).toEqual([
      { id: "prj_1", name: "Acme Docs" },
      { id: "prj_2", name: "support@old.revdoku.net" },
      { id: "prj_3", name: "prj_3" },
    ]);
  });

  test("a malformed answer is an error, not an empty list", async () => {
    api().get("/v1/projects").query(true).reply(200, { projects: [] });
    await expect(
      run(App.triggers.projects.operation.perform, bundle()),
    ).rejects.toThrow(/invalid response/);
  });
});

describe("New Support Request", () => {
  test("reads the tickets of the last 24 hours, newest activity first, at most 25", async () => {
    let query;
    listTickets([], (sent) => {
      query = sent;
      return true;
    });
    expect(await poll()).toEqual([]);
    expect(query).toMatchObject({ account_id: "acct_client", limit: "25" });
    const age = Date.now() - Date.parse(query.updated_after);
    expect(Math.abs(age - trigger.limits.WINDOW_MS)).toBeLessThan(60000);
    expect(query.status).toBeUndefined();
  });

  test("emits the first message of a ticket with flat fields and no attachments", async () => {
    listTickets([ticket()]);
    listMessages("tkt_1", [message()]);
    readProject();
    const [request, ...rest] = await poll();
    expect(rest).toEqual([]);
    expect(request).toEqual({
      id: "eml_1",
      ticket_id: "tkt_1",
      ticket_number: 3,
      new_ticket: true,
      ticket_status: "open",
      channel: "email",
      requester_name: "Dana Developer",
      requester_address: "dev@example.com",
      subject: "How do I rotate my API key?",
      body_text: "How do I rotate my API key?",
      body_status: "complete",
      received_at: request.received_at,
      ticket_url: `${dashboardUrl}&view=mailbox&email_id=eml_1`,
    });
    expect(Object.keys(request).sort()).toEqual(
      App.triggers.new_support_request.operation.outputFields.map((field) => field.key).sort(),
    );
    expect(Object.keys(App.triggers.new_support_request.operation.sample).sort()).toEqual(
      Object.keys(request).sort(),
    );
  });

  test("a later message of the requester is not a new ticket; replies and drafts are not emitted", async () => {
    listTickets([ticket({ message_count: 4, last_message_at: ago(2) })]);
    listMessages("tkt_1", [
      message({ id: "eml_1", received_at: ago(60) }),
      message({ id: "eml_2", direction: "sent", received_at: ago(50), delivery: { status: "sent" } }),
      message({ id: "eml_3", direction: "sent", received_at: ago(40), delivery: { status: "awaiting_approval" } }),
      message({ id: "eml_4", received_at: ago(2), body_text: "Thanks, one more thing", subject: "[#3] Re: How do I rotate my API key?" }),
    ]);
    readProject();
    const requests = await poll();
    // Newest first; the IDs are the message IDs that Zapier deduplicates.
    expect(requests.map((request) => [request.id, request.new_ticket])).toEqual([
      ["eml_4", false],
      ["eml_1", true],
    ]);
    expect(new Set(requests.map((request) => request.id)).size).toBe(2);
  });

  test("passes the channel through, also an older feedback ticket without a requester", async () => {
    listTickets([
      ticket({ id: "tkt_chat", number: 5, channel: "chat" }),
      ticket({ id: "tkt_feedback", number: 4, channel: "feedback", requester: null }),
    ]);
    listMessages("tkt_chat", [message({ id: "eml_chat", ticket_id: "tkt_chat", channel: "chat", received_at: ago(5) })]);
    listMessages("tkt_feedback", [message({ id: "eml_fb", ticket_id: "tkt_feedback", channel: "feedback", received_at: ago(9) })]);
    readProject();
    const requests = await poll();
    expect(requests.map((request) => request.channel)).toEqual(["chat", "feedback"]);
    expect(requests[1]).toMatchObject({ requester_name: null, requester_address: null });
  });

  test("never emits a withheld message: Junk is skipped, a message in check waits for the next poll", async () => {
    const pending = message({
      id: "eml_2",
      received_at: ago(0.2),
      withheld: true,
      subject: null,
      body_status: "withheld",
      body_text: "AI labels are still checking this email. Read it again in a few seconds.",
    });
    const junk = message({
      id: "eml_3",
      received_at: ago(10),
      withheld: true,
      body_status: "withheld",
      labels: [{ id: "tag_j", name: "Junk", color: "red" }],
    });
    const first = message({ id: "eml_1", received_at: ago(20) });
    listTickets([ticket({ last_message_at: ago(0.2) })]);
    listMessages("tkt_1", [first, junk, pending]);
    expect((await poll()).map((request) => request.id)).toEqual(["eml_1"]);

    // The next poll: the check passed. The message was never sent to Zapier,
    // so its ID is new there, and it is still inside the window.
    listTickets([ticket({ last_message_at: ago(1.2) })]);
    listMessages("tkt_1", [
      first,
      junk,
      { ...pending, received_at: ago(1.2), withheld: false, subject: "Re: key", body_status: "complete", body_text: "Any news?" },
    ]);
    const next = await poll();
    expect(next.map((request) => request.id)).toEqual(["eml_2", "eml_1"]);
    expect(next[0]).toMatchObject({ new_ticket: false, body_text: "Any news?" });
  });

  test("a first message in check keeps new_ticket for the poll that emits it", async () => {
    listTickets([ticket({ subject: null })]);
    listMessages("tkt_1", [message({ withheld: true, body_status: "withheld" })]);
    expect(await poll()).toEqual([]);
    listTickets([ticket()]);
    listMessages("tkt_1", [message()]);
    expect((await poll())[0]).toMatchObject({ id: "eml_1", new_ticket: true });
  });

  test("an email index in preparation gives an empty poll", async () => {
    api().get(tickets).query(true).reply(503, fail("EMAIL_INDEX_BUILDING", "Email index is being prepared; retry shortly"));
    expect(await poll()).toEqual([]);
  });

  test("the first poll of a Zap fails loudly while the index is in preparation, so the next poll does not send the whole window", async () => {
    api().get(tickets).query(true).reply(503, fail("EMAIL_INDEX_BUILDING", "Email index is being prepared; retry shortly"));
    await expect(poll({ isPopulatingDedupe: true })).rejects.toThrow(/Email index/);
  });

  test("follows the ticket list to a second page, so a burst of activity on other tickets hides no new message", async () => {
    const busy = Array.from({ length: trigger.limits.TICKET_PAGE }, (_unused, index) =>
      ticket({ id: `tkt_busy_${index}`, number: index + 10, last_message_at: ago(60 * 48), updated_at: ago(1) }),
    );
    listTickets(busy, (query) => query.limit === "25" && query.cursor === undefined, "page2");
    listTickets([ticket({ id: "tkt_new", number: 2, last_message_at: ago(30) })], (query) => query.cursor === "page2");
    listMessages("tkt_new", [message({ id: "eml_new", ticket_id: "tkt_new" })]);
    readProject();
    expect((await poll()).map((request) => request.id)).toEqual(["eml_new"]);
  });

  test("a ticket whose messages are not ready is skipped; the others are emitted", async () => {
    listTickets([ticket(), ticket({ id: "tkt_2", number: 4 })]);
    api().get(`${tickets}/tkt_1/messages`).query(true).reply(503, fail("EMAIL_LABELING_PENDING", "AI labels are still checking this email."));
    listMessages("tkt_2", [message({ id: "eml_9", ticket_id: "tkt_2" })]);
    expect((await poll()).map((request) => request.id)).toEqual(["eml_9"]);
  });

  test("old messages of a ticket with new activity are not emitted again", async () => {
    listTickets([ticket({ message_count: 2, last_message_at: ago(3) })]);
    listMessages("tkt_1", [
      message({ id: "eml_old", received_at: ago(60 * 24 * 30) }),
      message({ id: "eml_new", received_at: ago(3) }),
    ]);
    expect(await poll()).toMatchObject([{ id: "eml_new", new_ticket: false }]);
  });

  test("a status change without a new message reads no messages", async () => {
    listTickets([ticket({ status: "solved", updated_at: ago(1), last_message_at: ago(60 * 48) })]);
    expect(await poll()).toEqual([]);
  });

  test("the call cap: one list call and one messages call per ticket, at most 4 pages of a long ticket", async () => {
    const rows = Array.from({ length: trigger.limits.TICKET_PAGE }, (_unused, index) =>
      ticket({ id: `tkt_${index}`, number: index + 1 }),
    );
    listTickets(rows, (query) => query.limit === "25");
    readProject();
    rows.slice(1).forEach((row) =>
      listMessages(row.id, [message({ id: `eml_${row.id}`, ticket_id: row.id })]),
    );
    // The first ticket is long: the cursor is followed for 4 pages, then no more.
    listMessages("tkt_0", [message({ id: "eml_p1", ticket_id: "tkt_0" })], "c1");
    listMessages("tkt_0", [message({ id: "eml_p2", ticket_id: "tkt_0" })], "c2", "c1");
    listMessages("tkt_0", [message({ id: "eml_p3", ticket_id: "tkt_0" })], "c3", "c2");
    listMessages("tkt_0", [message({ id: "eml_p4", ticket_id: "tkt_0" })], "c4", "c3");
    const requests = await poll();
    expect(requests).toHaveLength(trigger.limits.TICKET_PAGE + 3);
    expect(requests.filter((request) => request.new_ticket)).toHaveLength(25);
    // afterEach proves that no call was left over; nock refuses any extra call.
  });

  test("a test in the Zap editor reads 5 tickets without a time window", async () => {
    listTickets([ticket({ last_message_at: ago(60 * 24 * 90) })], (query) =>
      query.limit === "5" && query.updated_after === undefined,
    );
    listMessages("tkt_1", [message({ received_at: ago(60 * 24 * 90) })]);
    expect((await poll({ isLoadingSample: true })).map((request) => request.id)).toEqual(["eml_1"]);
  });

  test("a rate limit asks Zapier to poll again later; other failures are errors", async () => {
    api().get(tickets).query(true).reply(429, fail("RATE_LIMIT_EXCEEDED", "Slow down"), { "Retry-After": "7" });
    await expect(poll()).rejects.toMatchObject({ name: "ThrottledError" });
    api().get(tickets).query(true).reply(403, fail("FORBIDDEN", "This key cannot read the project."));
    await expect(poll()).rejects.toThrow(/cannot read the project/);
  });
});

describe("Reply to Ticket", () => {
  const reply = (input = {}) =>
    run(
      App.creates.reply_to_ticket.operation.perform,
      bundle({ project_id: "prj_1", ticket_id: "tkt_1", text: "Rotate it in Access.", ...input }),
    );

  test("sends the text only, once, and reports a reply that waits for approval", async () => {
    let calls = 0;
    api()
      .post(`${tickets}/tkt_1/messages`, (body) => {
        calls += 1;
        expect(body).toEqual({ text: "Rotate it in Access.", account_id: "acct_client" });
        return true;
      })
      .reply(
        202,
        ok({
          message: {
            id: "eml_r",
            direction: "sent",
            subject: "[#3] Re: How do I rotate my API key?",
            received_at: "2026-11-12T10:00:00.000000Z",
            delivery: { status: "awaiting_approval", recipients: { "dev@example.com": "awaiting_approval" } },
            ticket_id: "tkt_1",
            channel: "email",
          },
        }),
      );
    expect(await reply({ to: "other@example.com", subject: "x", cc: "y@example.com" })).toEqual({
      id: "eml_r",
      ticket_id: "tkt_1",
      subject: "[#3] Re: How do I rotate my API key?",
      delivery_status: "awaiting_approval",
      awaiting_approval: true,
      created_at: "2026-11-12T10:00:00.000000Z",
    });
    expect(calls).toBe(1);
  });

  test("has no recipient, subject or attachment fields", () => {
    expect(App.creates.reply_to_ticket.operation.inputFields.map((field) => field.key)).toEqual([
      "project_id",
      "ticket_id",
      "text",
    ]);
    const help = App.creates.reply_to_ticket.operation.inputFields[2].helpText;
    expect(help).toContain("The reply goes to the person who asked.");
    expect(help).toContain("Uses credits; see [Pricing](https://app.revdoku.com/pricing).");
  });

  test.each([
    [403, "EMAIL_RECIPIENT_NOT_ALLOWED", "Revdoku sends only replies to people who emailed this project."],
    [429, "EMAIL_SEND_RATE_LIMITED", "Too many emails. Try again later."],
    [423, "EMAIL_LOCKED", "Email is locked: Support is working on this email."],
    [403, "EMAIL_WITHHELD", "AI labels marked this email as junk. A person can review it in the dashboard."],
    [503, "EMAIL_LABELING_PENDING", "AI labels are still checking this email."],
  ])("HTTP %s %s shows the API's message and is sent once", async (status, code, text) => {
    // One interceptor: a second request would fail with a nock error instead.
    api().post(`${tickets}/tkt_1/messages`).reply(status, fail(code, text), { "Retry-After": "5" });
    const error = await reply().catch((caught) => caught);
    expect(error.name).toBe("AppError");
    expect(JSON.parse(error.message)).toEqual({ message: text, code, status });
  });

  test.each(["EMAIL_RECIPIENT_NOT_ALLOWED", "EMAIL_SEND_RATE_LIMITED", "EMAIL_LOCKED", "EMAIL_WITHHELD"])(
    "%s without a message still reads as a sentence",
    async (code) => {
      api().post(`${tickets}/tkt_1/messages`).reply(403, { success: false, error: { code } });
      const error = await reply().catch((caught) => caught);
      expect(JSON.parse(error.message).message).toMatch(/^[A-Z].*\.$/);
      expect(JSON.parse(error.message).message).not.toContain("HTTP");
    },
  );

  test("a rate-limited reply is never a throttle that Zapier repeats", async () => {
    api().post(`${tickets}/tkt_1/messages`).reply(429, fail("RATE_LIMIT_EXCEEDED", "Slow down"), { "Retry-After": "1" });
    await expect(reply()).rejects.toMatchObject({ name: "AppError" });
  });

  test.each([
    ["a proxy error", (scope) => scope.reply(502, "Bad gateway")],
    ["a lost connection", (scope) => scope.replyWithError("socket hang up")],
    ["an answer that is not Revdoku's", (scope) => scope.reply(200, { ok: true })],
  ])("an unconfirmed result (%s) halts the step and sends nothing again", async (_name, respond) => {
    respond(api().post(`${tickets}/tkt_1/messages`));
    await expect(reply()).rejects.toMatchObject({
      name: "HaltedError",
      message: expect.stringMatching(/did not confirm/),
    });
  });
});

describe("Solve or Reopen Ticket", () => {
  const setStatus = (status) =>
    run(
      App.creates.set_ticket_status.operation.perform,
      bundle({ project_id: "prj_1", ticket_id: "tkt_1", status, add_labels: ["x"] }),
    );

  test.each(["solved", "open"])("sends only the status %s and returns the flat ticket", async (status) => {
    api()
      .patch(`${tickets}/tkt_1`, (body) => {
        expect(body).toEqual({ status, account_id: "acct_client" });
        return true;
      })
      .reply(200, ok({ ticket: ticket({ status, solved_at: status === "solved" ? ago(0) : null }) }));
    const result = await setStatus(status);
    expect(result).toMatchObject({ id: "tkt_1", number: 3, status, requester_address: "dev@example.com" });
    expect(result.labels).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual(
      App.creates.set_ticket_status.operation.outputFields.map((field) => field.key).sort(),
    );
  });

  test("has no label inputs and only the two statuses", () => {
    const fields = App.creates.set_ticket_status.operation.inputFields;
    expect(fields.map((field) => field.key)).toEqual(["project_id", "ticket_id", "status"]);
    expect(Object.keys(fields[2].choices)).toEqual(["solved", "open"]);
  });

  test("shows the API's refusal", async () => {
    api().patch(`${tickets}/tkt_1`).reply(423, fail("EMAIL_LOCKED", "Email is locked: Support is working on this email."));
    await expect(setStatus("solved")).rejects.toThrow(/Support is working on this email/);
    api().patch(`${tickets}/tkt_1`).reply(404, fail("NOT_FOUND", "Not found"));
    await expect(setStatus("solved")).rejects.toThrow(/Not found/);
  });
});

describe("Find Ticket", () => {
  const find = (input) =>
    run(App.searches.find_ticket.operation.perform, bundle({ project_id: "prj_1", ...input }));

  test("by ID reads the ticket", async () => {
    api().get(`${tickets}/tkt_1`).query({ account_id: "acct_client" }).reply(200, ok({ ticket: ticket() }));
    expect(await find({ ticket_id: "tkt_1", ticket_number: 99 })).toMatchObject([
      { id: "tkt_1", number: 3, requester_name: "Dana Developer" },
    ]);
  });

  test("by ID gives no result for an unknown ticket", async () => {
    api().get(`${tickets}/tkt_none`).query(true).reply(404, fail("NOT_FOUND", "Not found"));
    expect(await find({ ticket_id: "tkt_none" })).toEqual([]);
  });

  test("by number looks through the newest tickets, page by page", async () => {
    api()
      .get(tickets)
      .query({ account_id: "acct_client", limit: 200 })
      .reply(200, ok(page("tickets", [ticket({ id: "tkt_9", number: 9 })], "next")));
    api()
      .get(tickets)
      .query({ account_id: "acct_client", limit: 200, cursor: "next" })
      .reply(200, ok(page("tickets", [ticket()])));
    expect(await find({ ticket_number: "#3" })).toMatchObject([{ id: "tkt_1", number: 3 }]);
  });

  test("by number stops after 3 pages", async () => {
    ["", "c1", "c2"].forEach((cursor, index) =>
      api()
        .get(tickets)
        .query((query) => (query.cursor || "") === cursor)
        .reply(200, ok(page("tickets", [ticket({ id: `tkt_${index}`, number: 100 + index })], `c${index + 1}`))),
    );
    expect(await find({ ticket_number: 1 })).toEqual([]);
    expect(search.limits.MAX_NUMBER_PAGES * search.limits.NUMBER_PAGE).toBe(600);
  });

  test("needs an ID or a valid number", async () => {
    await expect(find({})).rejects.toThrow(/Ticket ID or a Ticket Number/);
    await expect(find({ ticket_number: "abc" })).rejects.toThrow(/whole number/);
  });
});
