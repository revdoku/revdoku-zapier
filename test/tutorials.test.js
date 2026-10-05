const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const nock = require("nock");
const zapier = require("zapier-platform-core");
const App = require("../index");

const run = zapier.createAppTester(App);
const origin = "https://api.revdoku.com";
const sourceAuth = { api_token: "fixture-source", account_id: "acct_source" };
const destinationAuth = {
  api_token: "fixture-destination",
  account_id: "acct_destination",
};
const email = {
  id: "eml_tutorial",
  from: "sender@example.com",
  subject: "Résumé",
  received_at: "2026-10-01T12:00:00Z",
};
const ok = (data) => ({ success: true, data });
const api = (authData = sourceAuth) =>
  nock(origin, {
    reqheaders: { authorization: `Bearer ${authData.api_token}` },
  });

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

async function newEmail() {
  api()
    .get("/v1/mailboxes/bkt_source/emails")
    .query({ account_id: "acct_source", limit: 100, order: "desc" })
    .reply(
      200,
      ok({
        emails: [email],
        pagination: { has_more: false, next_cursor: "end" },
      }),
    );
  return (
    await run(App.triggers.new_email.operation.perform, {
      authData: sourceAuth,
      inputData: { mailbox_id: "bkt_source" },
    })
  )[0];
}

test("Slack and Sheets tutorial fields come from the trigger and optional Get Email step", async () => {
  const result = await newEmail();
  expect(`New email: ${result.subject} from ${result.from}`).toBe(
    "New email: Résumé from sender@example.com",
  );
  expect([result.id, result.from, result.subject, result.received_at]).toEqual(
    Object.values(email),
  );
  api()
    .get(`/v1/mailboxes/bkt_source/emails/${result.id}`)
    .query({ account_id: "acct_source" })
    .reply(
      200,
      ok({
        email: {
          ...email,
          body_text: null,
          body_status: "empty",
          attachments: [],
        },
      }),
    );
  const detail = await run(App.creates.get_email.operation.perform, {
    authData: sourceAuth,
    inputData: { mailbox_id: "bkt_source", email_id: result.id },
  });
  expect(detail).toMatchObject({
    id: email.id,
    body_text: null,
    body_status: "empty",
  });
});

test("backup tutorial hydrates the original with source credentials then uploads and marks read", async () => {
  const trigger = await newEmail();
  const sourceInput = {
    mailbox_id: "bkt_source",
    email_id: trigger.id,
    attachment_id: "",
  };
  const download = await run(
    App.creates.download_email_file.operation.perform,
    {
      authData: sourceAuth,
      inputData: sourceInput,
    },
  );
  // Decode the platform-generated file token, as the Zapier runtime does before hydration.
  const token = JSON.parse(
    download.file.slice("hydrate|||".length, -"|||hydrate".length),
  );
  expect(token).toMatchObject({
    type: "file",
    method: "hydrators.downloadEmailFile",
    bundle: sourceInput,
  });
  const bytes = Buffer.from(
    "From: sender@example.com\r\nSubject: Résumé\r\n\r\nhello\0",
    "utf8",
  );
  api()
    .get(`/v1/mailboxes/bkt_source/emails/${trigger.id}/raw`)
    .query({ account_id: "acct_source" })
    .reply(
      200,
      ok({
        download: {
          authentication: "none",
          url: "https://files.example.test/fresh",
          filename: "original.eml",
          content_type: "message/rfc822",
          size_bytes: bytes.length,
        },
      }),
    );
  nock("https://files.example.test", { badheaders: ["authorization"] })
    .get("/fresh")
    .reply(200, bytes);
  let stashed;
  const fileUrl = await run(
    async (z, bundle) =>
      App.hydrators.downloadEmailFile(
        {
          ...z,
          async stashFile(stream, size, filename, contentType) {
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            stashed = Buffer.concat(chunks);
            expect(stashed).toEqual(bytes);
            expect([size, filename, contentType]).toEqual([
              bytes.length,
              "original.eml",
              "message/rfc822",
            ]);
            return "https://stash.example.test/original";
          },
        },
        bundle,
      ),
    { authData: sourceAuth, inputData: token.bundle },
  );
  nock("https://stash.example.test", { badheaders: ["authorization"] })
    .get("/original")
    .reply(200, stashed);
  const filename = `${trigger.id}.eml`;
  const mailboxPath = `email-backups/${filename}`;
  api(destinationAuth)
    .post("/v1/direct_uploads", {
      account_id: "acct_destination",
      mailbox_id: "bkt_destination",
      path: mailboxPath,
      blob: {
        filename,
        byte_size: bytes.length,
        content_type: "message/rfc822",
        purpose: "mailbox_file",
        checksum: crypto.createHash("md5").update(bytes).digest("base64"),
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      },
    })
    .reply(
      201,
      ok({
        signed_id: "signed-example",
        direct_upload: {
          url: "https://storage.example.test/object",
          headers: {},
        },
      }),
    );
  nock("https://storage.example.test", { badheaders: ["authorization"] })
    .put("/object", bytes)
    .reply(200);
  api(destinationAuth)
    .post("/v1/mailboxes/bkt_destination/files", {
      account_id: "acct_destination",
      signed_blob_id: "signed-example",
      path: mailboxPath,
      name: filename,
      role: "artifact",
    })
    .reply(
      201,
      ok({ file: { id: "df_saved", path: mailboxPath }, created: true }),
    );
  const saved = await run(App.creates.upload_mailbox_file.operation.perform, {
    authData: destinationAuth,
    inputData: {
      mailbox_id: "bkt_destination",
      file: fileUrl,
      filename,
      path: mailboxPath,
      content_type: "message/rfc822",
    },
  });
  expect(saved.file.path).toBe(mailboxPath);
  api()
    .patch(`/v1/mailboxes/bkt_source/emails/${trigger.id}`, {
      account_id: "acct_source",
      read: true,
    })
    .reply(200, ok({ email: { ...email, read: true } }));
  expect(
    await run(App.creates.update_email.operation.perform, {
      authData: sourceAuth,
      inputData: { mailbox_id: "bkt_source", email_id: trigger.id, read: true },
    }),
  ).toMatchObject({ id: trigger.id, read: true });
});

test("tutorial names match the actual Revdoku actions", () => {
  const tutorial = fs.readFileSync(
    path.join(__dirname, "../TUTORIAL.md"),
    "utf8",
  );
  for (const key of [
    "get_email",
    "download_email_file",
    "upload_mailbox_file",
    "update_email",
  ]) {
    expect(tutorial).toContain(App.creates[key].display.label);
  }
});
