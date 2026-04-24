import prisma from "./src/lib/db"; async function main() { const p = await prisma.pedido.findMany({orderBy:{id:"desc"}, take:2}); console.log(p); } main();
