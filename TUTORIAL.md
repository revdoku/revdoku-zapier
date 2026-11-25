# Two short Revdoku Zaps

First [request Zapier access](mailto:support@revdoku.com?subject=Revdoku%20Zapier%20access), including the email you use for Zapier. Accept the invitation from support. The source checkout alone does not install Revdoku in Zapier.

## Connect once

1. Create a key in [Revdoku Account → Access](https://app.revdoku.com/account/access). The second Zap needs write access to the project.
2. Create a Zap and choose **Revdoku → New Support Request** as the trigger.
3. Connect your API key. Leave **Account ID** empty.
4. Choose the **Project** of your docs site, then **Test trigger**. Without an earlier request, use **Leave a message** on your docs site with your own email address, wait a minute and test again.

## 1. New support request → Slack message

**Revdoku: New Support Request → Slack: Send Channel Message**

1. Add **Slack → Send Channel Message** and choose the channel.
2. In **Message Text**, type `#`, insert **Ticket Number**, type ` from `, insert **Requester Address**, then a new line and **Message Text**.
3. Test the action, read the message in Slack, then publish the Zap.

To post only new tickets, add **Filter by Zapier** before Slack: continue only if **New Ticket** is true.

## 2. New support request → sheet row, then Solve

**Revdoku: New Support Request → Google Sheets: Create Spreadsheet Row → Revdoku: Solve or Reopen Ticket**

1. Create a sheet with the headers `Ticket`, `From`, `Subject`, `Message`, `Received`, `Message ID`.
2. Add **Google Sheets → Create Spreadsheet Row**. Map the columns to **Ticket Number**, **Requester Address**, **Subject**, **Message Text**, **Received** and **Message ID**.
3. Add **Revdoku → Solve or Reopen Ticket**. Choose the same Project, map **Ticket ID** from the trigger and set **Status** to Solved.
4. Test both actions, then publish the Zap.

Use this Zap when the sheet is where your team works on requests: the ticket leaves the open list in Revdoku. A new message from the same person opens the ticket again and adds a row.

## Good to know

- A request starts the Zap when the person gave an email address: an email to the project, or Leave a message on the docs site. An Ask chat without a left message and page feedback do not.
- The steps carry text only, no attachments.
- Zapier looks for new requests at the interval of your Zapier plan.
- **Reply to Ticket** sends a reply to the person who asked. Uses credits; see [Pricing](https://app.revdoku.com/pricing).

[All steps and limits](USAGE.md)
