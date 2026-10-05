const { version } = require("./package.json");
const { downloadMailboxFile, downloadEmailFile } = require("./lib/revdoku");
const definitions = (modules) =>
  Object.fromEntries(modules.map((definition) => [definition.key, definition]));

module.exports = {
  version,
  platformVersion: require("zapier-platform-core").version,
  authentication: require("./authentication"),
  flags: { cleanInputData: false },
  hydrators: { downloadMailboxFile, downloadEmailFile },
  triggers: definitions([
    require("./triggers/new_email"),
    require("./triggers/mailboxes"),
    require("./triggers/mailbox_files"),
    require("./triggers/tags"),
  ]),
  searches: definitions([
    require("./searches/find_mailbox"),
    require("./searches/find_mailbox_file"),
  ]),
  creates: definitions([
    require("./creates/create_mailbox"),
    require("./creates/upload_mailbox_file"),
    require("./creates/delete_mailbox_file"),
    require("./creates/archive_mailbox"),
    require("./creates/list_mailbox_versions"),
    require("./creates/get_mailbox_version"),
    require("./creates/account_status"),
    require("./creates/account_limits"),
    require("./creates/list_emails"),
    require("./creates/get_email"),
    require("./creates/update_email"),
    require("./creates/delete_email"),
    require("./creates/download_email_file"),
  ]),
};
