# Three short Revdoku Zaps

Use **Revdoku v2** with an API-key connection. If v2 is not in your Zapier account, ask the integration owner for access to the approved private version. The source checkout alone does not install it in Zapier.

## Connect once

1. Create a Zap and choose **Revdoku → New Email** as the trigger.
2. Connect your Revdoku API key. Set **Account ID** for a shared/client account, or leave it empty for the key's default account.
3. Choose the source **Bucket**, then **Test trigger**. Select a real email. If the inbox is empty, send it a message from your normal email app and test again. Zapier's [trigger guide](https://help.zapier.com/hc/en-us/articles/8496288188429-Set-up-your-Zap-trigger) shows this setup flow.

Choose one recipe below. Insert values using Zapier's field picker; field names below refer to the **New Email** output.

## 1. Notify a Slack channel

**Revdoku: New Email → Slack: Send Channel Message**

1. Add **Slack → Send Channel Message**, connect Slack, and choose **Channel**.
2. In **Message Text**, type `New email: `, insert **Subject** (`subject`), then type ` from ` and insert **From** (`from`).
3. Test the action, confirm the message in your channel, then publish the Zap.

This recipe uses headers from the trigger. To include the body, insert **Revdoku → Get Email** between the two steps: use the same Bucket and map **Email ID** to the trigger's **ID** (`id`). Then map **Body Text** (`body_text`) from Get Email into Slack. Check `body_status` when full text is required. Slack's [available actions](https://zapier.com/apps/slack/integrations) include Send Channel Message.

## 2. Record incoming mail in Google Sheets

**Revdoku: New Email → Google Sheets: Create Spreadsheet Row**

1. Create a sheet with headers `Email ID`, `From`, `Subject`, `Received at`.
2. Add **Google Sheets → Create Spreadsheet Row**, connect Google, and choose that spreadsheet and worksheet.
3. Map the four columns to **ID** (`id`), **From** (`from`), **Subject** (`subject`) and **Received At** (`received_at`) from New Email.
4. Test the action, check the row, then publish the Zap. Keep Email ID as a stable reference when handling repeated executions.

The [Google Sheets integration](https://zapier.com/apps/google-sheets/integrations) lists Create Spreadsheet Row. Replaying an action can append another row; the ID column makes those rows identifiable.

## 3. Save the original email in another Revdoku bucket

**New Email → Download Email File → Upload File to Bucket**

1. Add **Revdoku → Download Email File**. Select the source Bucket, map **Email ID** to New Email's **ID**, and leave **Attachment ID** empty to download the original `.eml`.
2. Add **Revdoku → Upload File to Bucket**. Choose the destination Bucket using a connection authorized to write there.
3. Map **File URL** to **File** (`file`) from Download Email File. Leave **Text content** empty. Set **Filename** to the trigger's ID followed by `.eml`, and **Bucket path** to `email-backups/` followed by that ID and `.eml`. Set **Content type** to `message/rfc822`.
4. Test the upload and open the saved EML file, then publish the Zap. The download step obtains a fresh signed URL when its File output is used.

To save one attachment instead, insert **Get Email** and choose an actual attachment's `id` from its metadata for **Attachment ID**. Each attachment needs its own download/upload run.

## Check the result

Test actions perform real writes in the connected apps. Reading and downloading leave email read status unchanged. Add **Set Email Read Status** with **Read = true**, the source Bucket and the trigger's Email ID after a successful final action if you want to mark processed mail read.

New Email polls the latest 1,000 arrivals. More than 1,000 arrivals between successful polls can be missed; use the cursor-based API or n8n trigger for larger backlogs. See [integration behavior](USAGE.md#supported-steps) for migration and polling details. These tutorials have automated Revdoku field/operation checks; test your actual connected Slack, Sheets or storage destination before publishing a Zap.
