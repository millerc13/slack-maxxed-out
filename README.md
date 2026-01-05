# Slack Maxxed Out Webhooks

Netlify Functions that receive webhooks from GoHighLevel and send notifications to Slack.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/.netlify/functions/slack-abandoned-checkout` | Abandoned checkout alerts |
| `/.netlify/functions/slack-purchase-alert` | Purchase notifications |

## Setup

### 1. Create Slack Incoming Webhook

1. Go to https://api.slack.com/apps
2. Create new app → From scratch
3. Enable **Incoming Webhooks**
4. Click **Add New Webhook to Workspace**
5. Select your channel and authorize
6. Copy the webhook URL

### 2. Deploy to Netlify

1. Push this repo to GitHub
2. Connect to Netlify
3. Add environment variable:
   - `SLACK_WEBHOOK_URL` = your Slack webhook URL

### 3. Configure GoHighLevel

1. Go to **Automation → Workflows**
2. Create workflow with trigger (e.g., "Order Form Submission Abandoned")
3. Add **Webhook** action
4. Set URL to: `https://your-site.netlify.app/.netlify/functions/slack-abandoned-checkout`
5. Method: POST

Repeat for purchase alerts using the `slack-purchase-alert` endpoint.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_WEBHOOK_URL` | Yes | Default Slack webhook URL |
| `SLACK_WEBHOOK_ABANDONED_CHECKOUT` | No | Override for abandoned checkout channel |
| `SLACK_WEBHOOK_PURCHASE` | No | Override for purchase channel |

## Local Development

```bash
npm install
npm run dev
```

Test with curl:
```bash
curl -X POST http://localhost:8888/.netlify/functions/slack-purchase-alert \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","phone":"555-1234","amount":"797","product_name":"Gold Package"}'
```
