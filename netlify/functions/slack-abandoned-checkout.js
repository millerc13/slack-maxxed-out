// Netlify Function for Slack Abandoned Checkout Alerts
// Receives webhook from GoHighLevel and sends notification to Slack

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Extract contact info from GHL webhook payload (fields are at root level)
    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || '';
    const email = data.email || 'No email provided';
    const phone = data.phone || 'No phone provided';

    // Assigned rep from GHL user object
    const user = data.user || {};
    const assignedTo = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unassigned';

    // Build Slack message
    const slackMessage = {
      text: `Abandoned Checkout: ${firstName} ${lastName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🛒 Abandoned Checkout Alert',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Name:*\n${firstName} ${lastName}` },
            { type: 'mrkdwn', text: `*Email:*\n${email}` },
          ],
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Phone:*\n${phone}` },
            { type: 'mrkdwn', text: `*Assigned Rep:*\n${assignedTo}` },
          ],
        },
      ],
    };

    // Add timestamp
    slackMessage.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Abandoned at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
        },
      ],
    });

    // Send to Slack
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_ABANDONED_CHECKOUT || process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      console.error('Slack webhook URL not configured');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Slack webhook not configured' }),
      };
    }

    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error('Slack API Error:', errorText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to send Slack notification' }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: 'Abandoned checkout alert sent to Slack' }),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
