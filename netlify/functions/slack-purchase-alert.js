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
    const firstName = contact.first_name || contact.firstName || contact.name?.split(' ')[0] || 'Unknown';
    const lastName = contact.last_name || contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '';
    const email = contact.email || 'No email provided';
    const phone = contact.phone || contact.phoneNumber || 'No phone provided';

    // Extract purchase/order info
    const orderAmount = data.amount || data.order_amount || data.orderAmount || data.payment_amount || data.total || '';
    const productName = data.product_name || data.productName || data.product || data.order_name || '';
    const orderId = data.order_id || data.orderId || data.transaction_id || data.transactionId || '';
    const paymentStatus = data.payment_status || data.paymentStatus || data.status || 'Completed';

    const packagePurchased = extractPackagePurchased(contact.tags || data.tags || [], productName);

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
            { type: 'mrkdwn', text: `*Status:*\n✅ ${paymentStatus}` },
          ],
        },
      ],
    };

    // Add order details
    const orderFields = [];
    if (packagePurchased || productName) {
      orderFields.push({
        type: 'mrkdwn',
        text: `*Package/Product:*\n${packagePurchased || productName}`,
      });
    }
    if (orderAmount) {
      orderFields.push({
        type: 'mrkdwn',
        text: `*Amount:*\n$${parseFloat(orderAmount).toLocaleString()}`,
      });
    }
    if (orderFields.length > 0) {
      slackMessage.blocks.push({ type: 'section', fields: orderFields });
    }

    // Add order ID if available
    if (orderId) {
      slackMessage.blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Order ID: ${orderId}` }],
      });
    }

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

function extractPackagePurchased(tags, productName) {
  if (Array.isArray(tags)) {
    const purchaseTags = {
      'purchased-gold': 'Gold Package ($797)',
      'purchased-vip': 'VIP Package ($2,497)',
      'purchased-elite': 'Elite Package ($7,397)',
      'gold-purchased': 'Gold Package ($797)',
      'vip-purchased': 'VIP Package ($2,497)',
      'elite-purchased': 'Elite Package ($7,397)',
    };

    for (const tag of tags) {
      const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-');
      if (purchaseTags[normalizedTag]) {
        return purchaseTags[normalizedTag];
      }
    }
  }

  if (productName) {
    const lowerProduct = productName.toLowerCase();
    if (lowerProduct.includes('elite')) return 'Elite Package';
    if (lowerProduct.includes('vip')) return 'VIP Package';
    if (lowerProduct.includes('gold')) return 'Gold Package';
  }

  return null;
}
