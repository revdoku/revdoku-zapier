# Revdoku for Zapier

Send the support requests of your Revdoku docs site to Slack, Google Sheets and other apps, and answer them from a Zap.

[Request Zapier access from support@revdoku.com](mailto:support@revdoku.com?subject=Revdoku%20Zapier%20access), including the email you use for Zapier. Support will confirm availability and provide setup access.

## Start

1. Accept the invitation, then [create an API key and connect](USAGE.md#connect).
2. Choose **New Support Request** and the project of your docs site.
3. Follow a [short tutorial](TUTORIAL.md) to notify Slack or to keep a sheet of requests.

[Steps and limits](USAGE.md) · [Revdoku API](https://support.revdoku.com/docs/api)

## Develop

Use Node 22:

```sh
npm ci
npm test
npm run validate
```

Source checkout does not install the integration in Zapier. Maintainers publish through the linked Zapier app.

[Contribute](CONTRIBUTING.md) · [MIT license](LICENSE) · support@revdoku.com
