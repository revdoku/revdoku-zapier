# Revdoku for Zapier

Connect incoming email and private files to Slack, Google Sheets and other apps.

## Start

1. Get access to **Revdoku v2** in Zapier and connect an API key.
2. Choose **New Email** and a source bucket.
3. Follow a [short tutorial](TUTORIAL.md) to notify Slack, append a Sheets row or back up email.

[Supported steps and migration](USAGE.md) · [Revdoku API](https://revdoku.com/api.md)

## Develop

Use Node 22:

```sh
npm ci
npm test
npm run validate
```

Source checkout does not install the integration in Zapier. Maintainers publish through the linked Zapier app.

[Contribute](CONTRIBUTING.md) · [MIT license](LICENSE) · support@revdoku.com
