# Revdoku for Zapier

Connect incoming email and private file storage to Zaps. This source is version 2.0.0 of the existing Revdoku integration.

Follow the [short tutorials](TUTORIAL.md) to connect new email to Slack, Google Sheets, or another Revdoku bucket.

## Connect

1. Create an API key in [Revdoku Account → Access](https://app.revdoku.com/account/access).
2. Enter the key in the Zapier connection. Set an Account ID when using a shared or client account; otherwise the key's default account applies.
3. Test the connection, then select a bucket in the Zap step.

Version 2 uses an API key connection. Reconnect when migrating a version 1 Zap that used email verification. Choose a key with the permissions needed by the actions in that Zap.

## Supported steps

| Kind | Steps |
| --- | --- |
| Trigger | New Email |
| Email actions | List Emails, Get Email, Set Email Read Status, Delete Email, Download Email File (original or attachment) |
| Storage actions | Create Bucket, Upload File to Bucket, Delete Bucket File, Archive Bucket |
| Account and history | Get Account Status, Get Account Limits, List Bucket Versions, Get Bucket Version |
| Searches | Find Bucket, Find Bucket File |

New Email polls the latest 1,000 arrivals and uses stable message IDs for Zapier's deduplication. More than 1,000 arrivals between successful polls can be missed; use a shorter polling interval or a consumer that retains the API's arrival cursor for larger volumes. List Emails exposes that cursor explicitly. Filters must stay unchanged when reusing a cursor.

File outputs are Zapier file references. The integration obtains a fresh temporary download link when the file is used by a later step. Uploads accept a file URL or UTF-8 text, including empty text. Deletion and archiving require the action's confirmation field.

Version 2 removes the old website publication, form, leads, analytics and browser-login-link steps. Existing version 1 Zaps must be reviewed before migrating; those steps have no replacement in this integration.

## Development

Use Node 22:

```sh
npm ci
npm test
npm run validate
```

Tests use the real Zapier app runner and local HTTP fixtures. They cover account scope, permissions, pagination, rate limits, uploads, downloads and credential boundaries. They do not call a live Revdoku account.

Maintainers link the intended Zapier app with a local, ignored `.zapierapprc`. Publishing version 2 requires a separately approved `npx zapier-platform push`, then testing the installed version with a real connection before migrating users. Repository CI validates the source without publishing it.
