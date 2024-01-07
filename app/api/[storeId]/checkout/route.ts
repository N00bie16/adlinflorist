import { NextResponse } from "next/server";
import Midtrans from "midtrans-client"; // Import Midtrans Client Library
import prismadb from "@/lib/prismadb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface Parameter {
  item_details: any;
  transaction_details?: Object;
  customer_details?: Object;
}

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  const { productIds, formData } = await req.json();
  // console.log(formData);

  if (!productIds || productIds.length === 0) {
    return new NextResponse("Product ids are required", { status: 400 });
  }

  const products = await prismadb.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
  });

  const order = await prismadb.order.create({
    data: {
      storeId: params.storeId,
      isPaid: false,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.alamat,
      orderItems: {
        create: productIds.map((productId: string) => ({
          product: {
            connect: {
              id: productId,
            },
          },
        })),
      },
    },
  });

  // Buat instance Snap
  let snap = new Midtrans.Snap({
    isProduction: false, // Ganti dengan false jika masih dalam tahap pengembangan
    serverKey: process.env.MIDTRANS_SERVER_KEY, // Ganti dengan server key Midtrans Anda
    clientKey: process.env.MIDTRANS_CLIENT_KEY, // Ganti dengan client key Midtrans Anda
  });

  const totalPrice = products.reduce((total, product) => {
    return total + product.price.toNumber();
  }, 0);

  // products.forEach((product) => {
  //   parameter.item_details.push({
  //     id: product.id,
  //     price: product.price.toNumber(),
  //     name: product.name,
  //   });
  // });

  let parameter = {
    transaction_details: {
      order_id: order.id, // Ganti dengan ID pesanan Anda
      gross_amount: totalPrice,
    },
    customer_details: {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.alamat,
    },
  };

  const token = await snap.createTransactionToken(parameter);

  return NextResponse.json({ token }, { headers: corsHeaders });
}
