import { NextResponse } from "next/server";
import { sha512 } from "js-sha512";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
    } = data;

    const hashed = sha512(order_id + status_code + gross_amount + serverKey);
    if (hashed == signature_key) {
      if (transaction_status == "settlement") {
        const order = await prismadb.order.update({
          where: {
            id: order_id,
          },
          data: {
            isPaid: true,
          },
          include: {
            orderItems: true,
          },
        });
        console.log(order);
      }
    }

    return NextResponse.json({ data: data }, { status: 201 });
  } catch (error) {
    NextResponse.json({ error: error }, { status: 500 });
  }
}
