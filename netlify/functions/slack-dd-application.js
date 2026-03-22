// Netlify Function for Slack DD Application Submitted Alerts
// Receives webhook from GoHighLevel when "DD Application Submitted" tag is added

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

    console.log('GHL Payload:', JSON.stringify(data, null, 2));

    const firstName = data.first_name || 'Unknown';
    const lastName = data.last_name || '';
    const email = data.email || 'No email provided';
    const phone = data.phone || 'No phone provided';

    const slackMessage = {
      text: `DD Application Submitted: ${firstName} ${lastName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 DD Application Submitted!',
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
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
            },
          ],
        },
      ],
    };

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_DD_APPLICATION;

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
      body: JSON.stringify({ success: true, message: 'DD application alert sent to Slack' }),
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
