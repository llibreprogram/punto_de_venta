const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Verificando cuentas de impuestos por adelantar...');
    
    // Buscar padre de activos corrientes '1.1'
    const padreCorrientes = await prisma.cuentaContable.findUnique({
      where: { codigo: '1.1' }
    });

    if (!padreCorrientes) {
      console.error('No se encontró la cuenta 1.1 - Activos Corrientes.');
      return;
    }

    // Verificar o crear 1.1.03 (Impuestos por Adelantar)
    let cuentaImpuestosAdelantar = await prisma.cuentaContable.findUnique({
      where: { codigo: '1.1.03' }
    });

    if (!cuentaImpuestosAdelantar) {
      cuentaImpuestosAdelantar = await prisma.cuentaContable.create({
        data: {
          codigo: '1.1.03',
          nombre: 'Impuestos por Adelantar',
          tipo: 'ACTIVO',
          naturaleza: 'DEBITO',
          padreId: padreCorrientes.id
        }
      });
      console.log('Cuenta 1.1.03 creada.');
    } else {
      console.log('Cuenta 1.1.03 ya existe.');
    }

    // Verificar o crear 1.1.03.01 (ITBIS Adelantado / Crédito Fiscal)
    let cuentaItbisAdelantado = await prisma.cuentaContable.findUnique({
      where: { codigo: '1.1.03.01' }
    });

    if (!cuentaItbisAdelantado) {
      cuentaItbisAdelantado = await prisma.cuentaContable.create({
        data: {
          codigo: '1.1.03.01',
          nombre: 'ITBIS Adelantado / Crédito Fiscal',
          tipo: 'ACTIVO',
          naturaleza: 'DEBITO',
          padreId: cuentaImpuestosAdelantar.id
        }
      });
      console.log('Cuenta 1.1.03.01 creada.');
    } else {
      console.log('Cuenta 1.1.03.01 ya existe.');
    }

    // También verificamos si existe la cuenta 3.1.02 de Utilidades Retenidas / Resultados Acumulados
    // para el cierre de periodos
    const padrePatrimonio = await prisma.cuentaContable.findUnique({
      where: { codigo: '3' }
    });
    if (padrePatrimonio) {
      let cuentaResultados = await prisma.cuentaContable.findUnique({
        where: { codigo: '3.1.02' }
      });
      if (!cuentaResultados) {
        cuentaResultados = await prisma.cuentaContable.create({
          data: {
            codigo: '3.1.02',
            nombre: 'Resultados Acumulados / Utilidad Retenida',
            tipo: 'PATRIMONIO',
            naturaleza: 'CREDITO',
            padreId: padrePatrimonio.id
          }
        });
        console.log('Cuenta 3.1.02 creada.');
      } else {
        console.log('Cuenta 3.1.02 ya existe.');
      }
    }

    console.log('Verificación completada.');
  } catch (error) {
    console.error('Error al verificar cuentas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
