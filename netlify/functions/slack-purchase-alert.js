// Netlify Function for Slack Purchase Alerts
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

    // Package and amount - manually set in each GHL webhook
    const packagePurchased = data.package || data.package_purchased || 'Not specified';
    const orderAmount = data.amount || '';

    // Assigned rep from GHL
    const assignedTo = data.assigned_to || data.assignedTo || contact.assigned_to || 'Unassigned';

    // Build Slack message
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '💰 New Purchase Alert!',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${firstName} ${lastName}* just made a purchase!`,
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Customer:*\n${firstName} ${lastName}` },
            { type: 'mrkdwn', text: `*Email:*\n${email}` },
          ],
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Phone:*\n${phone}` },
            { type: 'mrkdwn', text: `*Package:*\n${packagePurchased}` },
          ],
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Amount:*\n${orderAmount ? `$${orderAmount}` : 'N/A'}` },
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
          text: `Purchase completed: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
        },
      ],
    });

    // Send to Slack
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_PURCHASE || process.env.SLACK_WEBHOOK_URL;

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
      body: JSON.stringify({ success: true, message: 'Purchase alert sent to Slack' }),
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
