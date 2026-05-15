import { generarSugerenciasCompra } from './src/lib/inventoryPredictor'

async function run() {
  try {
    const s = await generarSugerenciasCompra()
    console.log(s)
  } catch (e) {
    console.error("Error:", e)
  }
}
run()
