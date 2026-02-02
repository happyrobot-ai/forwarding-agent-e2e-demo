// HappyRobot Integration Helper Functions

export const HAPPYROBOT_API_BASE = 'https://platform.happyrobot.ai/api/v1';

// Helper to generate run URLs for the HappyRobot Platform UI
export function getHappyRobotRunUrl(runId: string): string {
  // Use workflow hook ID from webhook URL to construct platform URL
  const webhookUrl = process.env.HAPPYROBOT_WEBHOOK_URL;

  if (webhookUrl) {
    // Extract workflow ID from webhook URL like: https://workflows.platform.happyrobot.ai/hooks/8zpbonp7nzbp
    const match = webhookUrl.match(/\/hooks\/([^/?]+)/);
    if (match) {
      const workflowId = match[1];
      return `https://v2.platform.happyrobot.ai/globallogisticspod/workflow/${workflowId}/runs`;
    }
  }

  return `${HAPPYROBOT_API_BASE}/runs/${runId}`;
}

// Trigger a HappyRobot workflow
export async function triggerHappyRobotWorkflow(payload: Record<string, any>) {
  const webhookUrl = process.env.HAPPYROBOT_WEBHOOK_URL;
  const apiKey = process.env.HAPPYROBOT_X_API_KEY;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!webhookUrl) {
    throw new Error('HAPPYROBOT_WEBHOOK_URL not configured');
  }

  // Add callback URL to payload
  const fullPayload = {
    callback_url: `${appUrl}/api/webhooks/happyrobot`,
    ...payload,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'X-API-KEY': apiKey }),
    },
    body: JSON.stringify(fullPayload),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`HappyRobot trigger failed: ${error}`);
  }

  const result = await response.json();
  return result.queued_run_ids || [];
}

// Query HappyRobot Platform API for run status
export async function getHappyRobotRunStatus(runId: string) {
  const apiKey = process.env.HAPPYROBOT_API_KEY;
  const orgId = process.env.HAPPYROBOT_ORG_ID;

  if (!apiKey || !orgId) {
    return null; // Fall back to database status
  }

  try {
    const response = await fetch(`${HAPPYROBOT_API_BASE}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Organization-Id': orgId,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to query HappyRobot API:', error);
    return null;
  }
}

// Map HappyRobot status to our database status
export function mapHappyRobotStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'PENDING',
    'running': 'RUNNING',
    'completed': 'COMPLETED',
    'failed': 'FAILED',
    'canceled': 'CANCELED',
  };
  return statusMap[status.toLowerCase()] || 'PENDING';
}
