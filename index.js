const { version } = require("./package.json");
const { downloadBucketFile, downloadEmailFile } = require("./lib/revdoku");
const definitions = (modules) =>
  Object.fromEntries(modules.map((definition) => [definition.key, definition]));

module.exports = {
  version,
  platformVersion: require("zapier-platform-core").version,
  authentication: require("./authentication"),
  flags: { cleanInputData: false },
  hydrators: { downloadBucketFile, downloadEmailFile },
  triggers: definitions([
    require("./triggers/new_email"),
    require("./triggers/buckets"),
    require("./triggers/bucket_files"),
    require("./triggers/tags"),
  ]),
  searches: definitions([
    require("./searches/find_bucket"),
    require("./searches/find_bucket_file"),
  ]),
  creates: definitions([
    require("./creates/create_bucket"),
    require("./creates/upload_bucket_file"),
    require("./creates/delete_bucket_file"),
    require("./creates/archive_bucket"),
    require("./creates/list_bucket_versions"),
    require("./creates/get_bucket_version"),
    require("./creates/account_status"),
    require("./creates/account_limits"),
    require("./creates/list_emails"),
    require("./creates/get_email"),
    require("./creates/update_email"),
    require("./creates/delete_email"),
    require("./creates/download_email_file"),
  ]),
};
