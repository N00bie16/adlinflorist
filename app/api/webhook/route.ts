// route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import midtransClient from "midtrans-client"; // Tambahkan ini
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("X-Midtrans-Signature") as string; // Ubah nama header sesuai dengan Midtrans

  const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY!,
    clientKey: process.env.MIDTRANS_CLIENT_KEY!,
  });

  let event: Midtrans.WebhookEvent;

  try {
    event = snap.webhook.constructEvent(body, signature);
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const transaction = event.transaction_status;
  const orderId = event.order_id;

  if (transaction === "capture") {
    // Pembayaran berhasil
    const order = await prismadb.order.update({
      where: {
        id: orderId,
      },
      data: {
        isPaid: true,
        // Tambahkan data lain yang ingin Anda perbarui
      },
      include: {
        orderItems: true,
      },
    });

    const productIds = order.orderItems.map((orderItem) => orderItem.productId);

    await prismadb.product.updateMany({
      where: {
        id: {
          in: [...productIds],
        },
      },
      data: {
        isArchived: true,
      },
    });
  } else if (transaction === "cancel" || transaction === "deny") {
    return new NextResponse(`Pembayaran dibatalkan: ${event.cancel_reason}`, {
      status: 400,
    });
  }

  return new NextResponse(null, { status: 200 });
}
