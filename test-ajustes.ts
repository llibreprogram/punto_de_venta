import prisma from "./src/lib/db"; async function main() { const a = await prisma.ajustes.findUnique({where:{id:1}}); console.log(a); } main();
