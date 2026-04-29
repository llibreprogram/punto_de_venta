import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const mdPath = path.join(process.cwd(), 'MANUAL_DE_USUARIO.md');
    const content = fs.readFileSync(mdPath, 'utf8');
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo leer el manual' }, { status: 500 });
  }
}
