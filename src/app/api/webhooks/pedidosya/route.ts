import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Token/Secret para PedidosYa
const PEDIDOSYA_WEBHOOK_SECRET = process.env.PEDIDOSYA_WEBHOOK_SECRET || 'test_secret';

export async function POST(req: NextRequest) {
  try {
    // Validación de Token (OAuth2) o firma
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.includes(PEDIDOSYA_WEBHOOK_SECRET)) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); // Comentado para simulación
    }

    const body = await req.json();

    // DeliveryHero / PedidosYa payload format
    if (body.event === 'order_received') {
      const externalOrderId = body.order_id;
      
      const localOrderNumber = Math.floor(Math.random() * 10000) + 60000;

      const newPedido = await prisma.pedido.create({
        data: {
          numero: localOrderNumber,
          estado: 'ABIERTO',
          platform: 'pedidosya',
          platformOrderId: externalOrderId,
          externalStatus: 'RECEIVED',
          subtotalCents: 85000, // $850.00
          totalCents: 85000,
          notas: "Orden simulada desde Webhook de PedidosYa",
        }
      });

      console.log(`[WEBHOOK] Nueva orden de PedidosYa recibida: ${externalOrderId} -> POS ID: ${newPedido.id}`);
      return NextResponse.json({ status: 'ACKNOWLEDGED' }, { status: 200 });
    }

    return NextResponse.json({ status: 'IGNORED' }, { status: 200 });

  } catch (error) {
    console.error('[WEBHOOK ERROR] PedidosYa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
