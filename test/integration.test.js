const nock = require("nock");
const zapier = require("zapier-platform-core");
const App = require("../index");
const {
  apiRequest,
  bufferFromUploadInput,
  downloadEmailFile,
  downloadBucketFile,
} = require("../lib/revdoku");
const run = zapier.createAppTester(App);
const origin = "https://api.revdoku.com";
const authData = { api_token: "revdoku_test_key", account_id: "acct_client" };
const bundle = (inputData = {}) => ({ authData, inputData });
const ok = (data) => ({ success: true, data });
const bucket = { id: "bkt_1", title: "Invoices" };
const file = {
  id: "df_1",
  bucket_id: bucket.id,
  path: "Notes.txt",
  basename: "Notes.txt",
  current_file_version: { byte_size: 4, mime_type: "text/plain" },
};
const api = () =>
  nock(origin, {
    reqheaders: {
      authorization: `Bearer ${authData.api_token}`,
      "x-revdoku-agent": "zapier",
    },
  });
const action = (key, input = {}) =>
  run(App.creates[key].operation.perform, bundle(input));

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

test("API-key authentication uses status and selects the granted account", async () => {
  api()
    .get("/v1/status")
    .query({ account_id: "acct_client" })
    .reply(200, ok({ account: { id: "acct_client", name: "Client" } }));
  expect(await run(App.authentication.test, bundle())).toEqual({
    account_id: "acct_client",
    account_name: "Client",
  });
});

test.each([401, 403, 429, 503])(
  "GET preserves HTTP %s failures",
  async (status) => {
    api()
      .get("/v1/status")
      .query(true)
      .reply(
        status,
        {
          success: false,
          error: { code: "EXAMPLE", message: "Example failure" },
        },
        { "Retry-After": "5" },
      );
    await expect(action("account_status")).rejects.toThrow();
  },
);

test("mutation failure is made once and does not ask Zapier to retry", async () => {
  api()
    .post("/v1/buckets")
    .reply(503, {
      success: false,
      error: {
        code: "RECEIVING_PENDING",
        message: "Check the bucket before retrying",
      },
    });
  await expect(action("create_bucket", { title: "Inbox" })).rejects.toThrow(
    /Check the bucket/,
  );
});

test("malformed success is not silently returned as an empty list", async () => {
  api().get("/v1/buckets").query(true).reply(200, { buckets: [] });
  await expect(
    run(App.triggers.buckets.operation.perform, bundle()),
  ).rejects.toThrow(/invalid response/);
});

test("create mailbox sends the username, metadata, labels and reason with account scope", async () => {
  api()
    .post("/v1/buckets", {
      account_id: "acct_client",
      reason: "Customer invoices",
      bucket: {
        title: "Invoices",
        email: { username: "invoices" },
        tag_paths: ["work"],
        metadata: { project: "billing" },
      },
    })
    .reply(
      201,
      ok({
        bucket: { ...bucket, email: { address: "invoices@revdokumail.com" } },
      }),
    );
  expect(
    await action("create_bucket", {
      title: "Invoices",
      email_username: "invoices",
      tag_paths: "work",
      metadata: '{"project":"billing"}',
      reason: "Customer invoices",
    }),
  ).toMatchObject({
    id: "bkt_1",
    email: { address: "invoices@revdokumail.com" },
  });
});

test("file dropdown retrieves the next page", async () => {
  api()
    .get("/v1/buckets/bkt_1/files")
    .query({ account_id: "acct_client", limit: 100, offset: 100 })
    .reply(200, ok({ files: [file] }));
  const result = await run(App.triggers.bucket_files.operation.perform, {
    ...bundle({ bucket_id: "bkt_1" }),
    meta: { page: 1 },
  });
  expect(result[0]).toMatchObject({ id: "df_1", byte_size: 4 });
  expect(App.triggers.bucket_files.operation.canPaginate).toBe(true);
});

test("find file uses the detail endpoint for IDs beyond the first page", async () => {
  api()
    .get("/v1/buckets/bkt_1/files/df_1")
    .query({ account_id: "acct_client" })
    .reply(200, ok({ file }));
  expect(
    await run(
      App.searches.find_bucket_file.operation.perform,
      bundle({ bucket_id: "bkt_1", file_id: "df_1" }),
    ),
  ).toEqual([
    expect.objectContaining({ id: "df_1", file: expect.any(String) }),
  ]);
});

test("find file preserves path case and searches subsequent pages", async () => {
  api()
    .get("/v1/buckets/bkt_1/files")
    .query({ account_id: "acct_client", q: "Notes.txt", limit: 100, offset: 0 })
    .reply(
      200,
      ok({
        files: [{ ...file, id: "df_wrong", path: "notes.txt" }],
        pagination: { has_more: true, next_offset: 1 },
      }),
    );
  api()
    .get("/v1/buckets/bkt_1/files")
    .query({ account_id: "acct_client", q: "Notes.txt", limit: 100, offset: 1 })
    .reply(200, ok({ files: [file], pagination: { has_more: false } }));
  expect(
    (
      await run(
        App.searches.find_bucket_file.operation.perform,
        bundle({ bucket_id: "bkt_1", path: "Notes.txt" }),
      )
    )[0].id,
  ).toBe("df_1");
});

test("find file rejects a nonadvancing page", async () => {
  api()
    .get("/v1/buckets/bkt_1/files")
    .query(true)
    .reply(
      200,
      ok({ files: [], pagination: { has_more: true, next_offset: 0 } }),
    );
  await expect(
    run(
      App.searches.find_bucket_file.operation.perform,
      bundle({ bucket_id: "bkt_1", path: "missing" }),
    ),
  ).rejects.toThrow(/did not advance/);
});

test.each(["find_bucket", "find_bucket_file"])(
  "%s returns no results on 404",
  async (key) => {
    const isFile = key.endsWith("file");
    api()
      .get(`/v1/buckets/bkt_missing${isFile ? "/files/df_missing" : ""}`)
      .query(true)
      .reply(404, {
        success: false,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
    expect(
      await run(
        App.searches[key].operation.perform,
        bundle({
          bucket_id: "bkt_missing",
          file_id: isFile ? "df_missing" : undefined,
        }),
      ),
    ).toEqual([]);
  },
);

test("new email polls newest arrivals through multiple pages with stable IDs", async () => {
  api()
    .get("/v1/buckets/bkt_1/emails")
    .query({ account_id: "acct_client", limit: 100, order: "desc" })
    .reply(
      200,
      ok({
        emails: [{ id: "eml_late", received_at: "2020-01-01T00:00:00Z" }],
        pagination: { has_more: true, next_cursor: "next&cursor" },
      }),
    );
  api()
    .get("/v1/buckets/bkt_1/emails")
    .query({
      account_id: "acct_client",
      limit: 100,
      order: "desc",
      cursor: "next&cursor",
    })
    .reply(
      200,
      ok({
        emails: [{ id: "eml_older" }],
        pagination: { has_more: false, next_cursor: "end" },
      }),
    );
  const result = await run(
    App.triggers.new_email.operation.perform,
    bundle({ bucket_id: "bkt_1" }),
  );
  expect(result.map((email) => email.id)).toEqual(["eml_late", "eml_older"]);
});

test("list emails retains the empty-page polling cursor", async () => {
  api()
    .get("/v1/buckets/bkt_1/emails")
    .query({
      account_id: "acct_client",
      limit: 50,
      order: "asc",
      cursor: "old",
    })
    .reply(
      200,
      ok({ emails: [], pagination: { has_more: false, next_cursor: "new" } }),
    );
  expect(
    (await action("list_emails", { bucket_id: "bkt_1", cursor: "old" }))
      .pagination.next_cursor,
  ).toBe("new");
});

test("read status sends boolean false", async () => {
  api()
    .patch("/v1/buckets/bkt_1/emails/eml_1", {
      account_id: "acct_client",
      read: false,
    })
    .reply(200, ok({ email: { id: "eml_1", read: false } }));
  expect(
    await action("update_email", {
      bucket_id: "bkt_1",
      email_id: "eml_1",
      read: false,
    }),
  ).toMatchObject({ read: false });
});

test("email deletion handles 204", async () => {
  api()
    .delete("/v1/buckets/bkt_1/emails/eml_1", {
      account_id: "acct_client",
      reason: "Requested removal",
    })
    .reply(204);
  expect(
    await action("delete_email", {
      bucket_id: "bkt_1",
      email_id: "eml_1",
      confirm: true,
      reason: "Requested removal",
    }),
  ).toEqual({ id: "eml_1", deleted: true });
});

test.each(["delete_email", "delete_bucket_file", "archive_bucket"])(
  "%s requires confirmation before a request",
  async (key) => {
    await expect(
      action(key, {
        bucket_id: "bkt_1",
        email_id: "eml_1",
        file_id: "df_1",
        confirm: false,
      }),
    ).rejects.toThrow(/Confirm/);
  },
);

test("direct upload succeeds with reason and no API key on object storage", async () => {
  const crypto = require("node:crypto");
  api()
    .post("/v1/direct_uploads", {
      account_id: "acct_client",
      bucket_id: "bkt_1",
      path: "note.txt",
      reason: "Save invoice",
      blob: {
        filename: "note.txt",
        byte_size: 4,
        checksum: crypto.createHash("md5").update("note").digest("base64"),
        sha256: crypto.createHash("sha256").update("note").digest("hex"),
        content_type: "text/plain",
        purpose: "bucket_file",
      },
    })
    .reply(
      201,
      ok({
        signed_id: "signed",
        direct_upload: {
          url: "https://storage.example.com/object",
          headers: { "Content-Type": "text/plain" },
        },
      }),
    );
  nock("https://storage.example.com", { badheaders: ["authorization"] })
    .put("/object", "note")
    .reply(200);
  api()
    .post("/v1/buckets/bkt_1/files", {
      account_id: "acct_client",
      signed_blob_id: "signed",
      path: "note.txt",
      name: "note.txt",
      role: "artifact",
      reason: "Save invoice",
    })
    .reply(201, ok({ file, created: true }));
  expect(
    await action("upload_bucket_file", {
      bucket_id: "bkt_1",
      content: "note",
      filename: "note.txt",
      reason: "Save invoice",
    }),
  ).toMatchObject({ file: { id: "df_1" }, created: true });
});

test("identical upload returns the existing file without a PUT or attachment request", async () => {
  api()
    .post("/v1/direct_uploads")
    .reply(200, ok({ skipped: true, duplicate: true, file }));
  expect(
    await action("upload_bucket_file", { bucket_id: "bkt_1", content: "note" }),
  ).toMatchObject({ skipped: true, file: { id: "df_1" } });
});

test("empty text is a valid zero-byte upload", async () => {
  const value = await bufferFromUploadInput(
    {},
    bundle({ content: "", path: "notes/empty.txt" }),
  );
  expect(value.buffer.length).toBe(0);
  expect(value.filename).toBe("empty.txt");
});

test("file input has no bearer header and tolerates malformed filename encoding", async () => {
  nock("https://files.example.com", { badheaders: ["authorization"] })
    .get("/input")
    .reply(200, "note", {
      "Content-Disposition":
        "attachment; filename*=UTF-8''%ZZ; filename=note.txt",
    });
  api()
    .post("/v1/direct_uploads")
    .reply(200, ok({ skipped: true, file }));
  expect(
    await action("upload_bucket_file", {
      bucket_id: "bkt_1",
      file: "https://files.example.com/input",
    }),
  ).toMatchObject({ skipped: true });
});

test("email hydration gets a fresh link then downloads without authentication", async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({
      status: 200,
      data: ok({
        download: {
          url: "https://storage.example.com/fresh",
          authentication: "none",
          filename: "invoice.pdf",
          size_bytes: 3,
          content_type: "application/pdf",
        },
      }),
    })
    .mockResolvedValueOnce({ body: Buffer.from("pdf") });
  const stashFile = jest.fn().mockResolvedValue("stashed");
  expect(
    await downloadEmailFile(
      { request, stashFile },
      bundle({ bucket_id: "bkt_1", email_id: "eml_1", attachment_id: "df_1" }),
    ),
  ).toBe("stashed");
  expect(request.mock.calls[0][0].url).toBe(
    `${origin}/v1/buckets/bkt_1/emails/eml_1/attachments/df_1`,
  );
  expect(request.mock.calls[1][0]).toEqual({
    url: "https://storage.example.com/fresh",
    raw: true,
  });
  expect(stashFile).toHaveBeenCalledWith(
    Buffer.from("pdf"),
    3,
    "invoice.pdf",
    "application/pdf",
  );
});

test("file hydration follows the redirect without forwarding the bearer key", async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({
      status: 302,
      headers: { location: "https://storage.example.com/file" },
    })
    .mockResolvedValueOnce({
      body: Buffer.from("data"),
      headers: { "content-length": "4", "content-type": "text/plain" },
    });
  const stashFile = jest.fn().mockResolvedValue("stashed");
  await downloadBucketFile(
    { request, stashFile },
    bundle({ bucket_id: "bkt_1", file_id: "df_1", filename: "note.txt" }),
  );
  expect(request.mock.calls[0][0].redirect).toBe("manual");
  expect(request.mock.calls[1][0]).toEqual({
    url: "https://storage.example.com/file",
    raw: true,
  });
});

test("retired website and login-link actions are absent", () => {
  expect(Object.keys(App.creates)).not.toEqual(
    expect.arrayContaining(["publish_bucket"]),
  );
  expect(App.triggers.new_form_submission).toBeUndefined();
  expect(App.creates.browser_login_link).toBeUndefined();
  expect(App.authentication.type).toBe("custom");
});
