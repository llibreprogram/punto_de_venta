import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const mdPath = path.join(process.cwd(), 'COMPARATIVO_VS_LOYVERSE.md');
    const content = fs.readFileSync(mdPath, 'utf8');
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo leer el comparativo' }, { status: 500 });
  }
}
