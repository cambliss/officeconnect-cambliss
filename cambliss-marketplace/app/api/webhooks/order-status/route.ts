import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook endpoint for Office Connect to sync order status updates
 * Called by Office Connect backend when order status changes
 * 
 * POST /api/webhooks/order-status
 * Body: { orderId: string; status: string; storeId?: string; totalAmount?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { orderId, status, storeId, totalAmount } = payload;

    // TODO: Implement real-time updates via WebSocket or server-sent events
    // For now, just log and return success
    console.log(`[Webhook] Order ${orderId} status updated to ${status}`);

    // In production, you would:
    // 1. Store this in a database
    // 2. Emit to vendor via WebSocket/SSE
    // 3. Update order cache in marketplace
    // 4. Trigger vendor notifications (email/SMS)

    return NextResponse.json(
      {
        success: true,
        orderId,
        message: "Order status updated",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}

/**
 * Webhook verification endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "webhook-ready",
    endpoint: "/api/webhooks/order-status",
    methods: ["POST"],
    description: "Receives order status updates from Office Connect",
  });
}
