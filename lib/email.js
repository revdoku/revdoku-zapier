const bucketField = {
  key: "bucket_id",
  label: "Bucket",
  dynamic: "buckets.id.name",
  required: true,
};
const emailField = { key: "email_id", label: "Email ID", required: true };
const reasonField = { key: "reason", label: "Reason", required: false };
const emailPath = (input) =>
  `/buckets/${encodeURIComponent(input.bucket_id)}/emails${input.email_id ? `/${encodeURIComponent(input.email_id)}` : ""}`;
const sample = {
  id: "eml_sample",
  conversation_id: "eml_sample",
  subject: "Invoice",
  from: "person@example.com",
  to: "invoices@revdokumail.com",
  received_at: "2026-10-01T12:00:00Z",
  attachment_count: 1,
  read: false,
  read_at: null,
  read_by: null,
  read_by_api_key: null,
};
module.exports = { bucketField, emailField, reasonField, emailPath, sample };
