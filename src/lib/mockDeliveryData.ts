export type DeliveryPlatform = 'ubereats' | 'pedidosya' | 'local';
export type DeliveryStatus = 'new' | 'preparing' | 'ready' | 'in_transit' | 'delivered';

export interface DeliveryOrder {
  id: string;
  platformId: string; // The ID shown to the customer/platform (e.g., #5B4F)
  platform: DeliveryPlatform;
  status: DeliveryStatus;
  customerName: string;
  items: Array<{ name: string; quantity: number }>;
  total: number;
  createdAt: string; // ISO date string
  driverName?: string;
  driverEta?: number; // In minutes
}

export const initialMockOrders: DeliveryOrder[] = [
  {
    id: '1',
    platformId: '#U-8821',
    platform: 'ubereats',
    status: 'new',
    customerName: 'Juan Pérez',
    items: [
      { name: 'Hamburguesa Doble', quantity: 2 },
      { name: 'Papas Fritas L', quantity: 1 }
    ],
    total: 850.00,
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(), // 2 mins ago
  },
  {
    id: '2',
    platformId: '#PY-1094',
    platform: 'pedidosya',
    status: 'preparing',
    customerName: 'María Gómez',
    items: [
      { name: 'Pizza Pepperoni Familiar', quantity: 1 },
      { name: 'Refresco 2L', quantity: 1 }
    ],
    total: 1200.00,
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(), // 12 mins ago
    driverName: 'Carlos R.',
    driverEta: 5,
  },
  {
    id: '3',
    platformId: '#U-9923',
    platform: 'ubereats',
    status: 'ready',
    customerName: 'Pedro Luis',
    items: [
      { name: 'Combo Pollo Frito', quantity: 1 }
    ],
    total: 450.00,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(), // 25 mins ago
    driverName: 'Jose M.',
    driverEta: 2,
  },
  {
    id: '4',
    platformId: '#PY-1102',
    platform: 'pedidosya',
    status: 'new',
    customerName: 'Ana Belén',
    items: [
      { name: 'Ensalada César', quantity: 1 }
    ],
    total: 350.00,
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // 1 min ago
  },
  {
    id: '5',
    platformId: '#L-001',
    platform: 'local',
    status: 'in_transit',
    customerName: 'Cliente Local',
    items: [
      { name: 'Burrito Mixto', quantity: 2 }
    ],
    total: 600.00,
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(), // 40 mins ago
    driverName: 'Miguel A. (Local)',
  }
];
