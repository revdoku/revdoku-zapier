# Revdoku for Zapier

For a person who runs a docs site on Revdoku and wants its support requests in other tools. The [tutorials](TUTORIAL.md) show two Zaps.

## Connect

1. [Request Zapier access](mailto:support@revdoku.com?subject=Revdoku%20Zapier%20access) with the email you use for Zapier. Accept the invitation from support.
2. Create an API key in [Account → Access](https://app.revdoku.com/account/access). The trigger and Find Ticket need read access to the project. Reply to Ticket and Solve or Reopen Ticket need write access.
3. Enter the key in the Zapier connection. Leave **Account ID** empty, unless the key reaches another account that you want to use.
4. Test the connection. Then choose your project by its name in each step.

## Steps

| Kind | Step | What it does |
| --- | --- | --- |
| Trigger | New Support Request | Starts the Zap for each new message from a person: the first message of a ticket and each later message that a person sends on it. |
| Action | Reply to Ticket | Sends a plain-text reply to the person who asked. |
| Action | Solve or Reopen Ticket | Sets the ticket to Solved or Open. |
| Search | Find Ticket | Finds a ticket by its ID or its number. |

### New Support Request

| Field | Content |
| --- | --- |
| Message ID | The ID of the message. Zapier uses it to start the Zap once for each message. |
| Ticket ID, Ticket Number | The ticket of the message. Use Ticket ID in the other steps. |
| New Ticket | True when this message opened the ticket. False for a later message on it. |
| Ticket Status | `open` or `solved`. |
| Channel | `chat` for a message left on the docs site, `email` for an email. Tickets from before 2026-11-12 can have `feedback`. |
| Requester Name, Requester Address | The person who asked. Empty for a `feedback` ticket. |
| Subject, Message Text | The message as plain text. |
| Message Text Status | `complete`, `empty`, `truncated` or `unavailable`. |
| Received | The time Revdoku received the message. |
| Open in Revdoku | The address of the message in the Revdoku dashboard. |

Limits:

- A request appears when a person gives an email address: an email to the project, or **Leave a message** on the docs site. An Ask chat without a left message and page feedback do not start the Zap.
- Text only. The step gives no attachments and no HTML.
- Zapier asks Revdoku for new requests at the interval of your Zapier plan. A request arrives in the Zap after that interval, not at once.
- Revdoku checks a new message before integrations can read it. This can take about a minute; the message then arrives with the next poll. A message that Revdoku marks as Junk never starts the Zap.
- Each poll reads up to 100 tickets with the newest activity of the last 24 hours, and at most 200 messages of each ticket. A Zap that was off, or failed, for more than 24 hours does not get the messages of that time. More than 25 tickets with new messages between two polls can lose the oldest of them.
- Replies sent from Revdoku and drafts do not start the Zap.

### Reply to Ticket

Fields: Project, Ticket ID and Reply Text. The reply has no recipient field: it goes to the person who asked.

- The reply is sent at once.
- Uses credits; see [Pricing](https://app.revdoku.com/pricing).
- The step sends once. When Revdoku does not confirm the result, the step stops with "Revdoku did not confirm the result". Open the ticket in Revdoku before you run the step again.
- Revdoku refuses a reply to a ticket that has nobody to reply to, without enough credits, above the sending limit, while Revdoku works on the ticket, and to a message held as Junk. The step shows Revdoku's reason.

### Solve or Reopen Ticket

Fields: Project, Ticket ID and Status (Solved or Open). A new message from the person opens a solved ticket again.

### Find Ticket

Enter a Ticket ID, or a Ticket Number such as 12 for `[#12]` in a reply's subject. The API has no search by number, so the step looks in the 600 tickets with the newest activity. The number search skips tickets held as Junk.

## Development

Use Node 22:

```sh
npm ci
npm test
npm run validate
```

Tests use the real Zapier app runner and local HTTP fixtures. They do not call a live Revdoku account.

Maintainers link the intended Zapier app with a local, ignored `.zapierapprc`. Publishing is a separate, approved step. Repository CI validates the source without publishing it.
