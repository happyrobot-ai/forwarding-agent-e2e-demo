import { NextRequest, NextResponse } from 'next/server';

// Trigger outbound call workflow when user clicks "Proceed to Call"
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { shipmentId, phoneNumber, customerName, issue } = data;

    // TODO: Replace with your HappyRobot workflow trigger endpoint
    const workflowUrl = process.env.HAPPYROBOT_WORKFLOW_URL;

    if (!workflowUrl) {
      console.warn('[Call Workflow] HAPPYROBOT_WORKFLOW_URL not configured');

      // For demo purposes, simulate success
      return NextResponse.json({
        success: true,
        callId: `CALL-${Date.now()}`,
        status: 'initiated',
        message: 'Demo mode: Call would be initiated',
      });
    }

    // Trigger HappyRobot workflow
    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HAPPYROBOT_API_KEY}`,
      },
      body: JSON.stringify({
        shipmentId,
        phoneNumber,
        customerName,
        issue,
        context: {
          type: 'temperature_alert',
          severity: 'critical',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      callId: result.callId || `CALL-${Date.now()}`,
      status: result.status || 'initiated',
    });
  } catch (error) {
    console.error('[Call Workflow] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger call workflow' },
      { status: 500 }
    );
  }
}
