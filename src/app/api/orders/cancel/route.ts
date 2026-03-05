import connectToDB from "@/app/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import PolygonOrderModel from "@/app/models/PolygonOrder.model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function DELETE(req: NextRequest) {
  try {
    await connectToDB();

    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderId } = body;

    // Validation: Required fields
    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    // Find order
    const order = await PolygonOrderModel.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (order.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this order" },
        { status: 403 }
      );
    }

    // Check if order can be cancelled
    if (order.status === 'FILLED') {
      return NextResponse.json(
        { error: "Cannot cancel filled order" },
        { status: 400 }
      );
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: "Order already cancelled" },
        { status: 400 }
      );
    }

    // Cancel order
    order.status = 'CANCELLED';
    await order.save();

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order._id,
          status: order.status,
          cancelledAt: order.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to cancel order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
