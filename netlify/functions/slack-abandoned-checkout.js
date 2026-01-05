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

    // Extract contact info from GHL webhook payload
    const contact = data.contact || data;
    const firstName = contact.first_name || contact.firstName || data.first_name || data.firstName || 'Unknown';
    const lastName = contact.last_name || contact.lastName || data.last_name || data.lastName || '';
    const email = contact.email || data.email || 'No email provided';
    const phone = contact.phone || contact.phoneNumber || data.phone || 'No phone provided';

    // Package - manually set in each GHL webhook
    const packageInterest = data.package || data.package_interest || 'Not specified';

    // Assigned rep from GHL
    const assignedTo = data.assigned_to || data.assignedTo || contact.assigned_to || 'Unassigned';

    // Build Slack message
    const slackMessage = {
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
            { type: 'mrkdwn', text: `*Package:*\n${packageInterest}` },
          ],
        },
        {
          type: 'section',
          fields: [
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
