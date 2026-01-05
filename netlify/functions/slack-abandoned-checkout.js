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
    const firstName = contact.first_name || contact.firstName || contact.name?.split(' ')[0] || 'Unknown';
    const lastName = contact.last_name || contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '';
    const email = contact.email || 'No email provided';
    const phone = contact.phone || contact.phoneNumber || 'No phone provided';

    // Try to get package/product info
    const packageInterest = extractPackageInterest(contact.tags || data.tags || []);
    const cartValue = data.cart_value || data.cartValue || data.amount || contact.cart_value || '';
    const productName = data.product_name || data.productName || data.product || '';

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
            { type: 'mrkdwn', text: `*Package Interest:*\n${packageInterest || 'Not specified'}` },
          ],
        },
      ],
    };

    // Add cart value if available
    if (cartValue || productName) {
      slackMessage.blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Product:*\n${productName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Cart Value:*\n${cartValue ? `$${cartValue}` : 'N/A'}` },
        ],
      });
    }

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

function extractPackageInterest(tags) {
  if (!Array.isArray(tags)) return null;

  const packageTags = {
    'package-interest-gold': 'Gold ($797)',
    'package-interest-vip': 'VIP ($2,497)',
    'package-interest-elite': 'Elite ($7,397)',
    'gold': 'Gold',
    'vip': 'VIP',
    'elite': 'Elite',
  };

  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-');
    if (packageTags[normalizedTag]) {
      return packageTags[normalizedTag];
    }
  }

  return null;
}
