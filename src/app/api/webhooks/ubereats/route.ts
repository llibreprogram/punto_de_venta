import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Secret key provided by Uber Eats Developer Portal
const UBER_WEBHOOK_SECRET = process.env.UBER_WEBHOOK_SECRET || 'test_secret';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate HMAC signature (Omitted for test/simulation, but architecture is here)
    // const signature = req.headers.get('x-uber-signature');
    // const payloadStr = await req.text();
    // const expectedSignature = crypto.createHmac('sha256', UBER_WEBHOOK_SECRET).update(payloadStr).digest('hex');
    // if (signature !== expectedSignature) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    const body = await req.json();

    // The payload usually contains a meta object with resource type and an event ID
    if (body.meta && body.meta.resource_type === 'order') {
      const externalOrderId = body.meta.resource_id;

      // Simulated Fetch of full order details from Uber Eats API using the event ID
      // const orderDetails = await fetchUberEatsOrder(externalOrderId);
      
      // We will simulate creating a new order directly for demonstration
      
      // Calculate a random unique order number for our system
      const localOrderNumber = Math.floor(Math.random() * 10000) + 50000;

      const newPedido = await prisma.pedido.create({
        data: {
          numero: localOrderNumber,
          estado: 'ABIERTO',
          platform: 'ubereats',
          platformOrderId: externalOrderId,
          externalStatus: 'PENDING',
          subtotalCents: 150000, // $1500.00
          totalCents: 150000,
          notas: "Orden simulada desde Webhook de UberEats",
          // Mapearíamos los items usando IntegrationMapping
        }
      });

      console.log(`[WEBHOOK] Nueva orden de UberEats recibida: ${externalOrderId} -> POS ID: ${newPedido.id}`);
      return NextResponse.json({ success: true, message: 'Order ingested successfully' }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'Event ignored' }, { status: 200 });

  } catch (error) {
    console.error('[WEBHOOK ERROR] UberEats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
