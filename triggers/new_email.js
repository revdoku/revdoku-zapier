const { apiRequest, wrappedData } = require("../lib/revdoku");
const { mailboxField, emailPath, sample } = require("../lib/email");

const perform = async (z, bundle) => {
  const emails = [];
  let cursor;
  const seen = new Set();
  // Zapier deduplicates stable email IDs. Always start at the newest arrival;
  // received_at can predate arrival for delayed delivery.
  for (
    let page = 0;
    page < (bundle.meta?.isLoadingSample ? 1 : 10);
    page += 1
  ) {
    const data = wrappedData(
      await apiRequest(z, bundle, {
        path: emailPath(bundle.inputData),
        params: { order: "desc", limit: 100, ...(cursor ? { cursor } : {}) },
      }),
    );
    emails.push(...data.emails);
    if (!data.pagination.has_more) break;
    const next = data.pagination.next_cursor;
    if (!next || seen.has(next))
      throw new z.errors.Error(
        "Email pagination did not advance.",
        "InvalidPagination",
      );
    seen.add(next);
    cursor = next;
  }
  return emails;
};

module.exports = {
  key: "new_email",
  noun: "Email",
  display: {
    label: "New Email",
    description: "Triggers when an email arrives in a Revdoku mailbox.",
  },
  operation: { inputFields: [mailboxField], perform, sample },
};
