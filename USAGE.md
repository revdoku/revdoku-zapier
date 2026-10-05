# Revdoku for Zapier

Connect incoming email and private file storage to Zaps.

Follow the [short tutorials](TUTORIAL.md) to connect new email to Slack, Google Sheets, or another Revdoku mailbox.

## Connect

1. [Request Zapier access](mailto:support@revdoku.com?subject=Revdoku%20Zapier%20access) with the email you use for Zapier. Support will confirm availability and provide an invitation. Accept it before continuing.
2. Sign up or sign in to Revdoku and create an API key in [Account → Access](https://app.revdoku.com/account/access). Signup creates a starter mailbox. A mailbox is an mailbox with its own receiving address and private file storage.
3. Enter the key in the Zapier connection. Set an Account ID when using another granted account; otherwise the key's default account applies. Discover account IDs with the [account list API](https://revdoku.com/api.md#accounts). Selecting an account in the dashboard does not change the connection.
4. Test the connection, then select a mailbox in the Zap step. If no mailbox appears, check the key's account and mailbox grants.

Read access covers New Email, List/Get Email and downloads. Uploading and changing read status require mailbox write access; deleting email requires mailbox admin. Create Mailbox requires account-wide admin access, so a key restricted to selected mailboxes cannot run that action.

## Supported steps

| Kind | Steps |
| --- | --- |
| Trigger | New Email |
| Email actions | List Emails, Get Email, Set Email Read Status, Delete Email, Download Email File (original or attachment) |
| Storage actions | Create Mailbox, Upload File to Mailbox, Delete Mailbox File, Archive Mailbox |
| Account and history | Get Account Status, Get Account Limits, List Mailbox Versions, Get Mailbox Version |
| Searches | Find Mailbox, Find Mailbox File |

New Email polls the latest 1,000 arrivals and uses stable message IDs for Zapier's deduplication. More than 1,000 arrivals between successful polls can be missed; use a shorter polling interval or a consumer that retains the API's arrival cursor for larger volumes. List Emails exposes that cursor explicitly. Filters must stay unchanged when reusing a cursor.

File outputs are Zapier file references. The integration obtains a fresh temporary download link when the file is used by a later step. Uploads accept a file URL or UTF-8 text, including empty text. Deletion and archiving require the action's confirmation field.

New Email returns headers and IDs. Use Get Email for `body_text`, `body_status` and attachment metadata. For one attachment, map that email's `id` into Email ID and an entry's `attachments[].id` into Attachment ID. Map Download Email File's **File** output to a later file input. Leaving Attachment ID blank downloads the original EML, including its original attachments.

Reading and downloading do not mark an email read. Read status is shared across the dashboard and integrations; it is separate from Zapier's trigger deduplication. [Compare SDK, n8n, CLI and MCP behavior](https://github.com/revdoku/revdoku/blob/main/guides/api-packages.md).

If Create Mailbox fails with `EMAIL_NOT_READY` or times out, inspect the account's mailbox list before running it again. A mailbox may already exist. Do not configure blind creation retries; each creation consumes capacity.

## Development

Use Node 22:

```sh
npm ci
npm test
npm run validate
```

Tests use the real Zapier app runner and local HTTP fixtures. They cover account scope, permissions, pagination, rate limits, uploads, downloads and credential boundaries. They do not call a live Revdoku account.

Maintainers link the intended Zapier app with a local, ignored `.zapierapprc`. Publishing requires a separately approved `npx zapier-platform push`, then testing the installed integration with a real connection. Repository CI validates the source without publishing it.
