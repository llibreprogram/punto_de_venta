import sys
import json
import xlrd
from xlutils.copy import copy
import os

def fill_excel(tipo, periodo, rnc_empresa, json_data_path, output_path):
    # Determine template path
    template_dir = "/home/llibre/punto_de_venta/templates"
    if tipo == '606':
        template_name = "606_template.xls"
        sheet_index = 1
    elif tipo == '607':
        template_name = "607_template.xls"
        sheet_index = 0
    elif tipo == '608':
        template_name = "608_template.xls"
        sheet_index = 0
    else:
        raise ValueError(f"Tipo no soportado: {tipo}")
        
    template_path = os.path.join(template_dir, template_name)
    
    # Load JSON data
    with open(json_data_path, 'r', encoding='utf-8') as f:
        records = json.load(f)
        
    # Open template and copy
    rb = xlrd.open_workbook(template_path, formatting_info=True)
    wb = copy(rb)
    sheet = wb.get_sheet(sheet_index)
    
    # Fill headers
    periodo_int = int(periodo)
    cantidad = len(records)
    
    if tipo == '606':
        sheet.write(3, 2, rnc_empresa)       # RNC (C4)
        sheet.write(4, 2, periodo_int)     # Periodo (C5)
        sheet.write(5, 2, cantidad)        # Cantidad (C6)
        
        for idx, rec in enumerate(records):
            r = 11 + idx
            sheet.write(r, 1, rec.get('rncProveedor', ''))
            sheet.write(r, 2, int(rec['tipoId']) if rec.get('tipoId') else '')
            sheet.write(r, 3, rec.get('tipoGasto', ''))
            sheet.write(r, 4, rec.get('ncf', ''))
            sheet.write(r, 5, rec.get('ncfModificado', ''))
            sheet.write(r, 6, rec.get('fechaComprobante', ''))
            sheet.write(r, 8, rec.get('fechaPago', ''))
            
            # Montos
            sheet.write(r, 10, float(rec.get('montoServicios', 0.0)))
            sheet.write(r, 11, float(rec.get('montoBienes', 0.0)))
            sheet.write(r, 12, float(rec.get('totalMonto', 0.0)))
            sheet.write(r, 13, float(rec.get('itebisFacturado', 0.0)))
            sheet.write(r, 14, float(rec.get('itebisRetenido', 0.0)))
            sheet.write(r, 15, float(rec.get('itebisSujetoProp', 0.0)))
            sheet.write(r, 16, float(rec.get('itebisLlevadoCosto', 0.0)))
            sheet.write(r, 17, float(rec.get('itebisAdelantar', 0.0)))
            sheet.write(r, 18, float(rec.get('itebisPercibido', 0.0)))
            
            sheet.write(r, 19, int(rec['tipoRetIsr']) if rec.get('tipoRetIsr') else '')
            sheet.write(r, 20, float(rec.get('montoRetIsr', 0.0)))
            sheet.write(r, 21, float(rec.get('isrPercibido', 0.0)))
            sheet.write(r, 22, float(rec.get('isc', 0.0)))
            sheet.write(r, 23, float(rec.get('otrosImp', 0.0)))
            sheet.write(r, 24, float(rec.get('propina', 0.0)))
            sheet.write(r, 25, int(rec['formaPago']) if rec.get('formaPago') else '')
            
    elif tipo == '607':
        sheet.write(3, 2, rnc_empresa)       # RNC (C4)
        sheet.write(4, 2, periodo_int)     # Periodo (C5)
        sheet.write(5, 2, cantidad)        # Cantidad (C6)
        
        for idx, rec in enumerate(records):
            r = 11 + idx
            sheet.write(r, 1, rec.get('rncCliente', ''))
            sheet.write(r, 2, int(rec['tipoId']) if rec.get('tipoId') else '')
            sheet.write(r, 3, rec.get('ncf', ''))
            sheet.write(r, 4, rec.get('ncfModificado', ''))
            sheet.write(r, 5, rec.get('tipoIngreso', '01'))
            sheet.write(r, 6, rec.get('fechaComprobante', ''))
            sheet.write(r, 7, rec.get('fechaRetencion', ''))
            
            sheet.write(r, 8, float(rec.get('montoFacturado', 0.0)))
            sheet.write(r, 9, float(rec.get('itebisFacturado', 0.0)))
            sheet.write(r, 10, float(rec.get('itebisRetenido', 0.0)))
            sheet.write(r, 11, float(rec.get('itebisPercibido', 0.0)))
            sheet.write(r, 12, float(rec.get('retencionRenta', 0.0)))
            sheet.write(r, 13, float(rec.get('isrPercibido', 0.0)))
            sheet.write(r, 14, float(rec.get('isc', 0.0)))
            sheet.write(r, 15, float(rec.get('otrosImp', 0.0)))
            sheet.write(r, 16, float(rec.get('propina', 0.0)))
            
            sheet.write(r, 17, float(rec.get('efec', 0.0)))
            sheet.write(r, 18, float(rec.get('trans', 0.0)))
            sheet.write(r, 19, float(rec.get('tarj', 0.0)))
            sheet.write(r, 20, float(rec.get('cred', 0.0)))
            sheet.write(r, 21, float(rec.get('bonos', 0.0)))
            sheet.write(r, 22, float(rec.get('permuta', 0.0)))
            sheet.write(r, 23, float(rec.get('otras', 0.0)))
            
    elif tipo == '608':
        sheet.write(4, 2, rnc_empresa)       # RNC (C5)
        sheet.write(5, 2, periodo_int)     # Periodo (C6)
        sheet.write(6, 2, cantidad)        # Cantidad (C7)
        
        for idx, rec in enumerate(records):
            r = 11 + idx
            sheet.write(r, 1, rec.get('ncf', ''))
            sheet.write(r, 3, rec.get('fechaComprobante', ''))
            sheet.write(r, 4, rec.get('tipoAnulacion', ''))
            
    # Save the output file
    wb.save(output_path)
    print("SUCCESS")

if __name__ == '__main__':
    if len(sys.argv) < 6:
        print("Uso: python3 scripts/fill_dgii_excel.py <tipo> <periodo> <rnc_empresa> <json_data_path> <output_path>")
        sys.exit(1)
    try:
        fill_excel(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
    except Exception as ex:
        print(f"ERROR: {str(ex)}")
        sys.exit(2)
