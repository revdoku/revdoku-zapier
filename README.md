# Revdoku for Zapier

Connect incoming email and private files to Slack, Google Sheets and other apps.

[Request Zapier access from support@revdoku.com](mailto:support@revdoku.com?subject=Revdoku%20Zapier%20access), including the email you use for Zapier. Support will confirm availability and provide setup access.

## Start

1. Accept the invitation, then [create an API key and connect](USAGE.md#connect).
2. Choose **New Email** and a source mailbox.
3. Follow a [short tutorial](TUTORIAL.md) to notify Slack, append a Sheets row or back up email.

[Supported steps](USAGE.md) · [Revdoku API](https://revdoku.com/api.md)

## Develop

Use Node 22:

```sh
npm ci
npm test
npm run validate
```

Source checkout does not install the integration in Zapier. Maintainers publish through the linked Zapier app.

[Contribute](CONTRIBUTING.md) · [MIT license](LICENSE) · support@revdoku.com
