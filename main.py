import mysql.connector
import calendar
import eel
import logging
from datetime import datetime, timedelta
import datetime as dt
import qrcode
import io
import base64
import os

import sqlite3
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageWin

import json
from modulos.database import get_mysql_connection,get_stock
import modulos.database
import modulos.generadorqr
from bottle import route, run, response, request
from http.server import BaseHTTPRequestHandler, HTTPServer
# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')



logging.getLogger('mysql.connector').setLevel(logging.WARNING)
###descaativar al terminar



from bottle import Bottle, static_file, abort
# Inicializar Eel y Bottle
app = Bottle()

##################PRODUCTOS##################
"""@eel.expose
def get_products():
    conn = get_mysql_connection()
    c = conn.cursor()
    
    c.execute("SELECT p.id, p.name, p.price, e.id, e.name, e.price FROM productos p LEFT JOIN extras e ON p.id = e.product_id WHERE p.active = 1 AND (e.id IS NULL OR e.active = 1)")
    rows = c.fetchall()
    
    products = {}
    for row in rows:
        product_id, product_name, product_price, extra_id, extra_name, extra_price = row
        if product_id not in products:
            products[product_id] = {
                'id': product_id,
                'name': product_name,
                'price': product_price,
                'extras': []
            }
        if extra_id:
            products[product_id]['extras'].append({
                'id': extra_id,
                'name': extra_name,
                'price': extra_price
            })
    
    conn.close()
    return list(products.values())
"""

@eel.expose
def get_products():
    conn = get_mysql_connection()
    c = conn.cursor()

    c.execute("""
        SELECT p.id, p.name, p.price, p.active, e.id, e.name, e.price, e.active 
        FROM productos p 
        LEFT JOIN extras e ON p.id = e.product_id 
        ORDER BY p.active DESC, p.id
    """)
    rows = c.fetchall()

    products = {}
    for row in rows:
        product_id, product_name, product_price, product_active, extra_id, extra_name, extra_price, extra_active = row
        if product_id not in products:
            products[product_id] = {
                'id': product_id,
                'name': product_name,
                'price': product_price,
                'active': product_active,
                'extras': []
            }
        if extra_id:
            products[product_id]['extras'].append({
                'id': extra_id,
                'name': extra_name,
                'price': extra_price,
                'active': extra_active
            })

    conn.close()
    return list(products.values())

@eel.expose
def get_products2():
    conn = get_mysql_connection()
    c = conn.cursor()

    # Filtrar solo productos activos y extras activos
    c.execute("""
        SELECT p.id, p.name, p.price, p.active, e.id, e.name, e.price, e.active 
        FROM productos p 
        LEFT JOIN extras e ON p.id = e.product_id AND e.active = 1
        WHERE p.active = 1
        ORDER BY p.id
    """)
    rows = c.fetchall()

    products = {}
    for row in rows:
        product_id, product_name, product_price, product_active, extra_id, extra_name, extra_price, extra_active = row
        if product_id not in products:
            products[product_id] = {
                'id': product_id,
                'name': product_name,
                'price': product_price,
                'active': product_active,
                'extras': []
            }
        if extra_id:
            products[product_id]['extras'].append({
                'id': extra_id,
                'name': extra_name,
                'price': extra_price,
                'active': extra_active
            })

    conn.close()
    return list(products.values())

@eel.expose
def toggle_product_active(product_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute("UPDATE productos SET active = NOT active WHERE id = %s", (product_id,))
        conn.commit()
        conn.close()
    except mysql.connector.Error as err:
        logging.error(f"Error toggling product active state: {err}")
@eel.expose
def toggle_extra_active(extra_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute("UPDATE extras SET active = NOT active WHERE id = %s", (extra_id,))
        conn.commit()
        conn.close()
    except mysql.connector.Error as err:
        logging.error(f"Error toggling extra active state: {err}")

@eel.expose
def get_product_by_id(product_id):
    conn = get_mysql_connection()
    c = conn.cursor()
    
    c.execute("SELECT p.id, p.name, p.price, e.id, e.name, e.price, e.active FROM productos p LEFT JOIN extras e ON p.id = e.product_id WHERE p.id = %s", (product_id,))
    rows = c.fetchall()
    
    product = None
    extras = []
    for row in rows:
        if not product:
            product = {
                'id': row[0],
                'name': row[1],
                'price': row[2],
                'extras': []
            }
        if row[3]:
            extras.append({
                'id': row[3],
                'name': row[4],
                'price': row[5],
                'active': row[6]
            })
    
    if product:
        product['extras'] = extras
    
    conn.close()
    return product

@eel.expose
def update_extra_active(extra_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        # Obtener el estado actual del extra
        c.execute("SELECT active FROM extras WHERE id = %s", (extra_id,))
        current_active = c.fetchone()[0]
        
        # Alternar el estado
        new_active = 0 if current_active == 1 else 1
        
        # Actualizar el estado del extra
        c.execute("UPDATE extras SET active = %s WHERE id = %s", (new_active, extra_id))
        conn.commit()
        conn.close()
    except mysql.connector.Error as err:
        logging.error(f"Error updating extra active status: {err}")

@eel.expose
def add_product(name, price, extras):
    conn = get_mysql_connection()
    c = conn.cursor()
    
    c.execute("INSERT INTO productos (name, price) VALUES (%s, %s)", (name, price))
    product_id = c.lastrowid
    
    for extra in extras:
        c.execute("INSERT INTO extras (product_id, name, price) VALUES (%s, %s, %s)", (product_id, extra['name'], extra['price']))
    
    conn.commit()
    conn.close()


@eel.expose
def update_product(product_id, name, price, extras):
    conn = get_mysql_connection()
    c = conn.cursor()
    
    # Actualizar el producto
    c.execute("UPDATE productos SET name = %s, price = %s WHERE id = %s", (name, price, product_id))
    
    # Actualizar los extras
    for extra in extras:
        if 'id' in extra:  # Verificar si el extra ya existe
            c.execute("UPDATE extras SET name = %s, price = %s, active = %s WHERE id = %s", (extra['name'], extra['price'], extra['active'], extra['id']))
        else:  # Si no existe, añadir el nuevo extra
            c.execute("INSERT INTO extras (product_id, name, price, active) VALUES (%s, %s, %s, %s)", (product_id, extra['name'], extra['price'], extra['active']))
    
    conn.commit()
    conn.close()



@eel.expose
def reactivate_product(product_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        # Reactivar el producto
        c.execute("UPDATE productos SET active = 1 WHERE id = %s", (product_id,))
        
        # Reactivar los extras asociados
        c.execute("UPDATE extras SET active = 1 WHERE product_id = %s", (product_id,))
        
        conn.commit()
        conn.close()
        return "Producto reactivado correctamente"
    except mysql.connector.Error as err:
        logging.error(f"Error reactivating product: {err}")
        return f"Error: {err}"
@eel.expose
def deactivate_product(product_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()

        # Actualizar el estado del producto a 2 (eliminado)
        c.execute("UPDATE productos SET active = 2 WHERE id = %s", (product_id,))
        
        conn.commit()
        conn.close()
        return "Producto eliminado correctamente"
    except mysql.connector.Error as err:
        logging.error(f"Error deleting product: {err}")
        return f"Error: {err}"
    
@eel.expose
def delete_product(product_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        # Poner el producto en active = 2 (eliminado)
        c.execute("UPDATE productos SET active = 2 WHERE id = %s", (product_id,))
        
        # Poner todos los extras asociados al producto en active = 2 (eliminados)
        c.execute("UPDATE extras SET active = 2 WHERE product_id = %s", (product_id,))
        
        conn.commit()
        conn.close()
        return "Producto y sus extras eliminados correctamente"
    except mysql.connector.Error as err:
        logging.error(f"Error deleting product and its extras: {err}")
        return f"Error: {err}"


@eel.expose
def deactivate_extra(extra_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        # Desactivar el extra
        c.execute("UPDATE extras SET active = 2 WHERE id = %s", (extra_id,))
        
        conn.commit()
        conn.close()
        return "Extra desactivado correctamente"
    except mysql.connector.Error as err:
        logging.error(f"Error deactivating extra: {err}")
        return f"Error: {err}"

@eel.expose
def delete_extra(extra_id):
    return deactivate_extra(extra_id)

####################FIN PRODUCTOS#############


######################STOCK""####################
@eel.expose
def get_products_for_qr():
    return modulos.generadorqr.get_products()

@eel.expose
def get_stock_exposed():
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        c.execute('''
            SELECT p.id, p.name, s.cantidad_disponible
            FROM productos p
            LEFT JOIN stock s ON p.id = s.producto_id
            WHERE p.active = 1
        ''')
        rows = c.fetchall()
        
        stock = [{'id': row[0], 'name': row[1], 'quantity': row[2] if row[2] is not None else 0} for row in rows]
        
        conn.close()
        return stock
    except mysql.connector.Error as err:
        logging.error(f"Error fetching stock: {err}")
        return []

    
@eel.expose
def generate_qr_for_product(product_id, quantity):
    return modulos.generadorqr.generate_qr_codes(product_id, quantity)

@eel.expose
def print_qr_for_product(product_id, qr_codes):
    return modulos.generadorqr.print_qr_codes(product_id, qr_codes)
@eel.expose
def print_qr_for_product_no_stock(product_id, qr_codes):
    return modulos.generadorqr.print_qr_codes_no_stock(product_id, qr_codes)

AUTHORIZATION_CODE = "23deenerode1996"
@eel.expose
def reduce_stock(product_id, quantity, authorization_code):
    if authorization_code != AUTHORIZATION_CODE:
        return False

    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute('SELECT cantidad_disponible FROM stock WHERE producto_id = %s', (product_id,))
        result = c.fetchone()
        if result is None or result[0] < quantity:
            conn.close()
            return False

        new_quantity = result[0] - quantity
        c.execute('UPDATE stock SET cantidad_disponible = %s WHERE producto_id = %s', (new_quantity, product_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logging.error(f"Error reducing stock: {e}")
        return False
    

@eel.expose
def add_to_stock(product_id):
    return modulos.generadorqr.add_to_stock(product_id)


def get_product_by_id_ventas(product_id):
    conn = get_mysql_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, price FROM productos WHERE id = %s', (product_id,))
    product = cursor.fetchone()
    conn.close()
    if product:
        return {'id': product[0], 'name': product[1], 'price': product[2]}
    return None
@eel.expose
def get_product_by_id_exposed_ventas(product_id):
    return get_product_by_id_ventas(product_id)
##################FIN STOCK #######################

#################-VENTAS-#######################
def get_product_by_id_ventas2(product_id):
    conn = get_mysql_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('''
        SELECT p.id, p.name, p.price, COALESCE(SUM(e.price), 0) as extras_price
        FROM productos p
        LEFT JOIN extras e ON p.id = e.product_id
        WHERE p.id = %s
        GROUP BY p.id
    ''', (product_id,))
    
    product = cursor.fetchone()
    conn.close()
    
    if product:
        return {
            'id': product['id'],
            'name': product['name'],
            'price': product['price'] + product['extras_price']
        }
    return None

@eel.expose
def get_product_by_id_exposed_ventas2(product_id):
    return get_product_by_id_ventas(product_id)

@eel.expose
def complete_sale(products, total, payment_method):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        
        
        # Actualizar el stock
        for product in products:
            
            c.execute('UPDATE stock SET cantidad_disponible = cantidad_disponible - %s WHERE producto_id = %s', 
                      (product['quantity'], product['id']))
        
        # Registrar la venta en la tabla ventas
        sale_date = datetime.now().strftime("%Y-%m-%d")
        c.execute('INSERT INTO ventas (total_price, sale_date, payment_method) VALUES (%s, %s, %s)', 
                  (total, sale_date, payment_method))
        venta_id = c.lastrowid
    
        
        # Registrar cada producto de la venta en venta_productos
        for product in products:
           
            c.execute('INSERT INTO venta_productos (venta_id, product_id, quantity, price) VALUES (%s, %s, %s, %s)', 
                      (venta_id, product['id'], product['quantity'], product['price']))
        
        conn.commit()
        conn.close()
        return True
    except mysql.connector.Error as err:
        print(f"Error al completar la venta (MySQL error): {err}")
        conn.rollback()
        conn.close()
        return False
    except Exception as e:
        print(f"Error al completar la venta (General error): {e}")
        conn.rollback()
        conn.close()
        return False
    

        ##VENTAS ADMIN##

def get_sales():
    conn = get_mysql_connection()
    c = conn.cursor()
    query = '''
        SELECT v.id, p.id, p.name, vp.quantity, vp.price, v.total_price, v.sale_date, v.payment_method
        FROM ventas v
        JOIN venta_productos vp ON v.id = vp.venta_id
        JOIN productos p ON vp.product_id = p.id
        ORDER BY v.sale_date DESC
    '''
    c.execute(query)
    sales = c.fetchall()
    conn.close()
    
    sales_dict = {}
    for sale in sales:
        sale_id = sale[0]
        product_id = sale[1]
        product_name = sale[2]
        quantity = sale[3]
        product_price = sale[4]
        total_price = sale[5]
        sale_date = sale[6]
        payment_method = sale[7]
        
        if sale_id not in sales_dict:
            sales_dict[sale_id] = {
                "id": sale_id,
                "products": [],
                "total_price": total_price,
                "sale_date": sale_date.strftime('%Y-%m-%d'),  # Asegúrate de formatear la fecha como string
                "payment_method": payment_method
            }
        sales_dict[sale_id]["products"].append({"productId": product_id, "product": product_name, "quantity": quantity, "price": product_price})
    
    return list(sales_dict.values())

@eel.expose
def get_sales_exposed():
    try:
        return get_sales()
    except Exception as e:
        logging.error(f"Error in get_sales_exposed: {e}")
        return []


@eel.expose
def get_product_names_exposed():
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute('SELECT name FROM productos')
        product_names = c.fetchall()
        conn.close()
        return [name[0] for name in product_names]
    except Exception as e:
        logging.error(f"Error fetching product names: {e}")
        return []

@eel.expose
def delete_sale_exposed(sale_id, authorization_code):
    AUTHORIZATION_CODE = "23deenerode1996"
    if authorization_code != AUTHORIZATION_CODE:
        return False

    try:
        conn = get_mysql_connection()
        c = conn.cursor()

        # Obtener los productos y sus cantidades de la venta antes de eliminarla
        c.execute('SELECT product_id, quantity FROM venta_productos WHERE venta_id = %s', (sale_id,))
        sale_products = c.fetchall()
        if not sale_products:
            conn.close()
            return False

        # Actualizar el stock para cada producto en la venta
        for product_id, quantity in sale_products:
            c.execute('UPDATE stock SET cantidad_disponible = cantidad_disponible + %s WHERE producto_id = %s', (quantity, product_id))

        # Eliminar los productos de la venta
        c.execute('DELETE FROM venta_productos WHERE venta_id = %s', (sale_id,))

        # Eliminar la venta
        c.execute('DELETE FROM ventas WHERE id = %s', (sale_id,))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logging.error(f"Error deleting sale: {e}")
        return False

@eel.expose
def update_sale_exposed(sale_id, new_quantities, new_payment_method, authorization_code, new_total_price):
    AUTHORIZATION_CODE = "23deenerode1996"
    if authorization_code != AUTHORIZATION_CODE:
       
        return False

    try:
        conn = get_mysql_connection()
        c = conn.cursor()

        # Obtener la venta original
        c.execute('SELECT total_price, payment_method FROM ventas WHERE id = %s', (sale_id,))
        original_sale = c.fetchone()
        if not original_sale:
            
            conn.close()
            return False

        original_total_price, original_payment_method = original_sale

        # Obtener productos originales de la venta
        c.execute('SELECT product_id, quantity FROM venta_productos WHERE venta_id = %s', (sale_id,))
        original_products = c.fetchall()

        
        # Mapa de productos originales para actualizar stock y productos de venta
        original_products_dict = {product_id: quantity for product_id, quantity in original_products}

        # Actualizar stock
        for original_product in original_products:
            product_id, original_quantity = original_product
            new_quantity = next((item['quantity'] for item in new_quantities if item['productId'] == product_id), original_quantity)
            quantity_difference = new_quantity - original_quantity
            
            c.execute('UPDATE stock SET cantidad_disponible = cantidad_disponible - %s WHERE producto_id = %s', (quantity_difference, product_id))

        # Actualizar productos de la venta
        for new_quantity in new_quantities:
            product_id = new_quantity['productId']
            quantity = new_quantity['quantity']
            if product_id in original_products_dict:
                
                c.execute('UPDATE venta_productos SET quantity = %s WHERE venta_id = %s AND product_id = %s', (quantity, sale_id, product_id))
            else:
                
                c.execute('INSERT INTO venta_productos (venta_id, product_id, quantity, price) VALUES (%s, %s, %s, (SELECT price FROM productos WHERE id = %s))', (sale_id, product_id, quantity, product_id))

        # Actualizar la venta
       
        c.execute('UPDATE ventas SET total_price = %s, payment_method = %s WHERE id = %s', (new_total_price, new_payment_method, sale_id))

        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        logging.error(f"Error updating sale: {e}")
        
        return False



@eel.expose
def get_filtered_sales_exposed_v2(filter_date, start_date, end_date, payment_method, product_name):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        query = '''
            SELECT v.id, vp.product_id, vp.quantity, p.name, vp.price, v.sale_date, v.payment_method
            FROM ventas v
            JOIN venta_productos vp ON v.id = vp.venta_id
            JOIN productos p ON vp.product_id = p.id
            WHERE 1=1
        '''
        params = []

        if filter_date:
            query += ' AND date(v.sale_date) = %s'
            params.append(filter_date)

        if start_date:
            query += ' AND date(v.sale_date) >= %s'
            params.append(start_date)

        if end_date:
            query += ' AND date(v.sale_date) <= %s'
            params.append(end_date)

        if payment_method and payment_method != 'all':
            query += ' AND v.payment_method = %s'
            params.append(payment_method)

        if product_name:
            query += ' AND p.name LIKE %s'
            params.append(f'%{product_name}%')

        query += ' ORDER BY v.sale_date DESC'

        c.execute(query, params)
        sales = c.fetchall()

        sales_dict = {}
        for sale in sales:
            sale_id, product_id, quantity, product_name, product_price, sale_date, payment_method = sale

            if sale_id not in sales_dict:
                sales_dict[sale_id] = {
                    'id': sale_id,
                    'products': [],
                    'total_price': 0,  # Inicializa en 0 para calcular el total filtrado
                    'sale_date': sale_date.strftime('%Y-%m-%d') if sale_date else None,
                    'payment_method': payment_method
                }
            sales_dict[sale_id]['products'].append({
                'productId': product_id,
                'product': product_name,
                'quantity': quantity,
                'price': product_price
            })
            sales_dict[sale_id]['total_price'] += product_price * quantity  # Suma el precio solo de los productos filtrados

        conn.close()
        return list(sales_dict.values())
    except Exception as e:
        logging.error(f"Error fetching filtered sales: {e}")
        return []


def apply_filters_to_query(query, params, start_date, end_date, payment_method, product_name):
    if start_date:
        query += ' AND date(v.sale_date) >= %s'
        params.append(start_date)

    if end_date:
        query += ' AND date(v.sale_date) <= %s'
        params.append(end_date)

    if payment_method and payment_method != 'all':
        query += ' AND v.payment_method = %s'
        params.append(payment_method)

    if product_name:
        query += '''
            AND vp.product_id IN (
                SELECT p.id
                FROM productos p
                WHERE p.name LIKE %s
            )
        '''
        params.append(f'%{product_name}%')

    return query, params



def calculate_total_price_for_product_filter(c, filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName):
    query = '''
        SELECT SUM(vp.quantity * vp.price)
        FROM ventas v
        JOIN venta_productos vp ON v.id = vp.venta_id
        JOIN productos p ON vp.product_id = p.id
        WHERE 1=1
    '''
    params = []

    if filterDate:
        query += ' AND date(v.sale_date) = %s'
        params.append(filterDate)

    query, params = apply_filters_to_query(query, params, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)

    c.execute(query, params)
    return c.fetchone()[0]

@eel.expose
def get_daily_sales_total_exposed_v2(filterDate=None, filterStartDate=None, filterEndDate=None, filterPaymentMethod=None, filterProductName=None):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        query = '''
            SELECT COALESCE(SUM(vp.price * vp.quantity), 0)
            FROM ventas v
            JOIN venta_productos vp ON v.id = vp.venta_id
            WHERE date(v.sale_date) = date(%s)
        '''
        params = [filterDate or datetime.now().strftime('%Y-%m-%d')]

        query, params = apply_filters_to_query(query, params, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)

        c.execute(query, params)
        total = c.fetchone()[0]
        conn.close()
        return total
    except Exception as e:
        logging.error(f"Error fetching daily sales total: {e}")
        return 0




@eel.expose
def get_weekly_sales_total_exposed_v2(filterDate=None, filterStartDate=None, filterEndDate=None, filterPaymentMethod=None, filterProductName=None):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        query = '''
            SELECT COALESCE(SUM(vp.price * vp.quantity), 0)
            FROM ventas v
            JOIN venta_productos vp ON v.id = vp.venta_id
            WHERE WEEK(v.sale_date, 1) = WEEK(%s, 1) AND YEAR(v.sale_date) = YEAR(%s)
        '''
        filter_date = filterDate or datetime.now().strftime('%Y-%m-%d')
        params = [filter_date, filter_date]

        query, params = apply_filters_to_query(query, params, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)

        c.execute(query, params)
        total = c.fetchone()[0]
        conn.close()
        return total
    except Exception as e:
        logging.error(f"Error fetching weekly sales total: {e}")
        return 0


@eel.expose
def get_monthly_sales_total_exposed_v2(filterDate=None, filterStartDate=None, filterEndDate=None, filterPaymentMethod=None, filterProductName=None):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        query = '''
            SELECT COALESCE(SUM(vp.price * vp.quantity), 0)
            FROM ventas v
            JOIN venta_productos vp ON v.id = vp.venta_id
            WHERE DATE_FORMAT(v.sale_date, '%Y-%m') = DATE_FORMAT(%s, '%Y-%m')
        '''
        params = [filterDate or datetime.now().strftime('%Y-%m-%d')]

        query, params = apply_filters_to_query(query, params, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)

        c.execute(query, params)
        total = c.fetchone()[0]
        conn.close()
        return total
    except Exception as e:
        logging.error(f"Error fetching monthly sales total: {e}")
        return 0



@eel.expose
def get_annual_sales_total_exposed_v2(filterDate=None, filterStartDate=None, filterEndDate=None, filterPaymentMethod=None, filterProductName=None):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        query = '''
            SELECT COALESCE(SUM(vp.price * vp.quantity), 0)
            FROM ventas v
            JOIN venta_productos vp ON v.id = vp.venta_id
            WHERE YEAR(v.sale_date) = YEAR(%s)
        '''
        params = [filterDate or datetime.now().strftime('%Y-%m-%d')]

        query, params = apply_filters_to_query(query, params, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)

        c.execute(query, params)
        total = c.fetchone()[0]
        conn.close()
        return total
    except Exception as e:
        logging.error(f"Error fetching annual sales total: {e}")
        return 0


@eel.expose
def get_total_sales_exposed_v2(filterDate=None, filterStartDate=None, filterEndDate=None, filterPaymentMethod=None, filterProductName=None):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        query = '''
            SELECT COALESCE(SUM(vp.price * vp.quantity), 0)
            FROM ventas v
            JOIN venta_productos vp ON v.id = vp.venta_id
            WHERE 1=1
        '''
        params = []

        if filterDate:
            query += ' AND date(v.sale_date) = %s'
            params.append(filterDate)

        query, params = apply_filters_to_query(query, params, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)

        c.execute(query, params)
        total = c.fetchone()[0]
        conn.close()
        return total
    except Exception as e:
        logging.error(f"Error fetching total sales: {e}")
        return 0



    """
    

eel.get_daily_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)
eel.get_weekly_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)
eel.get_monthly_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)
eel.get_annual_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)
eel.get_total_sales_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)
    """
###############-FIN-VENTAS########################

####################-PEDIDOS---#################
@eel.expose
def get_orders():
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM pedidos")
        orders = c.fetchall()
        conn.close()
        
        transformed_orders = []
        for order in orders:
            transformed_order = {
                'id': order[0],
                'customer_name': order[1],
                'customer_phone': order[2],
                'discount': order[3],
                'total_price': order[4],
                'down_payment': order[5],
                'balance_due': order[6],
                'start_date': order[7].strftime('%Y-%m-%d') if order[7] else None,
                'delivery_date': order[8].strftime('%Y-%m-%d') if order[8] else None,
                'delivery_method': order[9],
                'department': order[10],
                'address': order[11],
                'carnet': order[12],
                'branch': order[13],
                'payment_method': order[14],
                'completed': bool(order[15])
            }
            transformed_orders.append(transformed_order)
        
        logging.info(f"Fetched orders: {transformed_orders}")
        return transformed_orders if transformed_orders else []
    except Exception as e:
        logging.error(f"Error in get_orders: {e}")
        return []


    
@eel.expose
def delete_order(order_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        # Eliminar extras asociados a productos en el pedido
        delete_extras_query = '''
            DELETE pe
            FROM pedido_extras pe
            JOIN pedido_productos pp ON pe.pedido_producto_id = pp.id
            WHERE pp.pedido_id = %s
        '''
        c.execute(delete_extras_query, (order_id,))

        # Eliminar productos del pedido
        delete_products_query = 'DELETE FROM pedido_productos WHERE pedido_id = %s'
        c.execute(delete_products_query, (order_id,))

        # Eliminar el pedido
        delete_order_query = 'DELETE FROM pedidos WHERE id = %s'
        c.execute(delete_order_query, (order_id,))

        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"Error in delete_order: {e}")

"""@eel.expose
def get_order_by_id(order_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()

        # Obtener el pedido principal
        query_order = '''
            SELECT 
                p.id, p.customer_name, p.customer_phone, p.discount, p.total_price, p.down_payment, p.balance_due, 
                p.start_date, p.delivery_date, p.delivery_method, p.department, p.address, p.carnet, p.branch, 
                p.payment_method, p.completed
            FROM pedidos p
            WHERE p.id = %s
        '''
        c.execute(query_order, (order_id,))
        order = c.fetchone()

        if not order:
            conn.close()
            return None

        # Obtener los productos asociados al pedido
        query_products = '''
            SELECT 
                pp.product_id, pr.name, pp.quantity, pp.price
            FROM pedido_productos pp
            JOIN productos pr ON pp.product_id = pr.id
            WHERE pp.pedido_id = %s
        '''
        c.execute(query_products, (order_id,))
        products = c.fetchall()

        # Obtener los extras asociados a cada producto
        products_with_extras = []
        for product in products:
            product_id, product_name, quantity, price = product
            query_extras = '''
                SELECT 
                    pe.extra_id, e.name, pe.quantity, pe.price
                FROM pedido_extras pe
                JOIN extras e ON pe.extra_id = e.id
                WHERE pe.pedido_producto_id IN (
                    SELECT id FROM pedido_productos WHERE pedido_id = %s AND product_id = %s
                )
            '''
            c.execute(query_extras, (order_id, product_id))
            extras = c.fetchall()

            products_with_extras.append({
                'product_id': product_id,
                'product_name': product_name,
                'quantity': quantity,
                'price': price,
                'extras': [{'extra_id': e[0], 'name': e[1], 'quantity': e[2], 'price': e[3]} for e in extras]
            })

        order_data = {
            'id': order[0],
            'customer_name': order[1],
            'customer_phone': order[2],
            'discount': order[3],
            'total_price': order[4],
            'down_payment': order[5],
            'balance_due': order[6],
            'start_date': order[7].strftime('%Y-%m-%d') if order[7] else None,
            'delivery_date': order[8].strftime('%Y-%m-%d') if order[8] else None,
            'delivery_method': order[9],
            'department': order[10],
            'address': order[11],
            'carnet': order[12],
            'branch': order[13],
            'payment_method': order[14],
            'completed': bool(order[15]),
            'products': products_with_extras
        }

        conn.close()
        return order_data
    except Exception as e:
        logging.error(f"Error in get_order_by_id: {e}")
        return None

"""
@eel.expose
def get_order_by_id(order_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()

        # Obtener el pedido principal
        query_order = '''
            SELECT 
                p.id, p.customer_name, p.customer_phone, p.discount, p.total_price, p.down_payment, p.balance_due, 
                p.start_date, p.delivery_date, p.delivery_method, p.department, p.address, p.carnet, p.branch, 
                p.payment_method, p.completed
            FROM pedidos p
            WHERE p.id = %s
        '''
        c.execute(query_order, (order_id,))
        order = c.fetchone()

        if not order:
            conn.close()
            return None

        # Obtener los productos asociados al pedido
        query_products = '''
            SELECT 
                pp.id as pedido_producto_id, pp.product_id, pr.name, pp.quantity, pp.price
            FROM pedido_productos pp
            JOIN productos pr ON pp.product_id = pr.id
            WHERE pp.pedido_id = %s
        '''
        c.execute(query_products, (order_id,))
        products = c.fetchall()

        # Obtener los extras asociados a cada producto
        products_with_extras = []
        for product in products:
            pedido_producto_id, product_id, product_name, quantity, price = product
            query_extras = '''
                SELECT 
                    pe.extra_id, e.name, pe.quantity, pe.price
                FROM pedido_extras pe
                JOIN extras e ON pe.extra_id = e.id
                WHERE pe.pedido_producto_id = %s
            '''
            c.execute(query_extras, (pedido_producto_id,))
            extras = c.fetchall()

            products_with_extras.append({
                'product_id': product_id,
                'product_name': product_name,
                'quantity': quantity,
                'price': price,
                'extras': [{'extra_id': e[0], 'name': e[1], 'quantity': e[2], 'price': e[3]} for e in extras]
            })

        order_data = {
            'id': order[0],
            'customer_name': order[1],
            'customer_phone': order[2],
            'discount': order[3],
            'total_price': order[4],
            'down_payment': order[5],
            'balance_due': order[6],
            'start_date': order[7].strftime('%Y-%m-%d') if order[7] else None,
            'delivery_date': order[8].strftime('%Y-%m-%d') if order[8] else None,
            'delivery_method': order[9],
            'department': order[10],
            'address': order[11],
            'carnet': order[12],
            'branch': order[13],
            'payment_method': order[14],
            'completed': bool(order[15]),
            'products': products_with_extras
        }

        conn.close()
        return order_data
    except Exception as e:
        logging.error(f"Error in get_order_by_id: {e}")
        return None
@eel.expose
def toggle_order_completion(order_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        # Obtener el pedido principal
        c.execute('SELECT * FROM pedidos WHERE id = %s', (order_id,))
        order = c.fetchone()
        completed = order[-1]  # `completed` es el último campo en la tabla `pedidos`
        
        if completed:
            # Borrar de la tabla `pedidos_completados` utilizando `pedido_id`
            c.execute('DELETE FROM pedidos_completados WHERE pedido_id = %s', (order_id,))
        else:
            # Insertar en la tabla `pedidos_completados`
            c.execute('''INSERT INTO pedidos_completados (
                            customer_name, customer_phone, discount, total_price, 
                            down_payment, balance_due, start_date, delivery_date, 
                            delivery_method, department, address, carnet, branch, payment_method, 
                            pedido_id
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''', 
                      (order[1], order[2], order[3], order[4], order[5], order[6], order[7], order[8], 
                       order[9], order[10], order[11], order[12], order[13], order[14], order[0]))
        
        # Actualizar el estado del pedido en la tabla `pedidos`
        c.execute('UPDATE pedidos SET completed = NOT completed WHERE id = %s', (order_id,))
        conn.commit()
        conn.close()
        
        # Devolver los detalles del pedido
        return True, {"customer_name": order[1], "customer_phone": order[2], "delivery_date": order[8]}
    
    except Exception as e:
        logging.error(f"Error in toggle_order_completion: {e}")
        return False, str(e)
@eel.expose
def get_extras_by_product_name(product_name):
    conn = get_mysql_connection()
    c = conn.cursor()
    c.execute('''SELECT e.id, e.name, e.price FROM extras e
                 JOIN productos p ON e.product_id = p.id
                 WHERE p.name = %s AND e.active = 1 AND p.active = 1''', (product_name,))
    extras = c.fetchall()
    conn.close()
    return [{"extra_id": extra[0], "name": extra[1], "price": extra[2]} for extra in extras]


@eel.expose
def get_product_price_by_name(product_name):
    conn = get_mysql_connection()
    c = conn.cursor()
    c.execute('SELECT price FROM productos WHERE name = %s', (product_name,))
    price = c.fetchone()
    conn.close()
    if price:
        return price[0]
    return None

@eel.expose
def add_order(order_json):
    try:
        order = json.loads(order_json)
        logging.info(f"Order data received: {order}")
        conn = get_mysql_connection()
        cursor = conn.cursor()

        # Insertar el pedido en la tabla `pedidos`
        cursor.execute('''
            INSERT INTO pedidos (customer_name, customer_phone, discount, total_price, down_payment, balance_due, start_date, delivery_date, delivery_method, department, address, carnet, branch, payment_method, completed)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            order['customer_name'], order['customer_phone'], order['discount'], order['total_price'], order['down_payment'], order['balance_due'],
            order['start_date'], order['delivery_date'], order['delivery_method'], order['department'], order['address'], order['carnet'],
            order['branch'], order['payment_method'], order['completed']
        ))

        order_id = cursor.lastrowid

        # Insertar productos y extras en la tabla `pedido_productos` y `pedido_extras`
        for product in order['products']:
            cursor.execute('''
                INSERT INTO pedido_productos (pedido_id, product_id, quantity, price)
                VALUES (%s, %s, %s, %s)
            ''', (order_id, product['product_id'], product['quantity'], product['price']))

            pedido_producto_id = cursor.lastrowid

            for extra in product['extras']:
                if 'extra_id' not in extra or extra['extra_id'] is None:
                    logging.error(f"Missing extra_id for extra: {extra}")
                    raise ValueError("Missing extra_id for one of the extras")

                cursor.execute('''
                    INSERT INTO pedido_extras (pedido_producto_id, extra_id, quantity, price)
                    VALUES (%s, %s, %s, %s)
                ''', (pedido_producto_id, extra['extra_id'], extra['quantity'], extra['price']))

        conn.commit()
        conn.close()
        return order_id
    except Exception as e:
        logging.error(f"Error adding order: {e}")
        return None




def get_product_id_by_name(product_name):
    conn = get_mysql_connection()
    c = conn.cursor()
    c.execute('SELECT id FROM productos WHERE name = %s', (product_name,))
    product_id = c.fetchone()
    conn.close()
    return product_id[0] if product_id else None

def get_extra_id_by_name(extra_name):
    conn = get_mysql_connection()
    c = conn.cursor()
    c.execute('SELECT id FROM extras WHERE name = %s', (extra_name,))
    extra_id = c.fetchone()
    conn.close()
    return extra_id[0] if extra_id else None

@eel.expose
def update_order(order_json):
    try:
        order = json.loads(order_json)
        logging.info(f"Order data received for update: {order}")
        conn = get_mysql_connection()
        cursor = conn.cursor()

        # Poner el pedido en modo pendiente automáticamente
        order['completed'] = False

        # Eliminar el pedido de la tabla `pedidos_completados`
        cursor.execute('DELETE FROM pedidos_completados WHERE pedido_id = %s', (order['id'],))

        # Actualizar la tabla de pedidos
        cursor.execute('''
            UPDATE pedidos
            SET customer_name = %s, customer_phone = %s, discount = %s, total_price = %s,
                down_payment = %s, balance_due = %s, start_date = %s, delivery_date = %s,
                delivery_method = %s, department = %s, address = %s, carnet = %s,
                branch = %s, payment_method = %s, completed = %s
            WHERE id = %s
        ''', (
            order['customer_name'], order['customer_phone'], order['discount'], order['total_price'],
            order['down_payment'], order['balance_due'], order['start_date'], order['delivery_date'],
            order['delivery_method'], order['department'], order['address'], order['carnet'],
            order['branch'], order['payment_method'], order['completed'], order['id']
        ))

        # Eliminar productos y extras anteriores
        logging.info(f"Deleting previous extras and products for order ID: {order['id']}")
        cursor.execute('DELETE FROM pedido_extras WHERE pedido_producto_id IN (SELECT id FROM pedido_productos WHERE pedido_id = %s)', (order['id'],))
        cursor.execute('DELETE FROM pedido_productos WHERE pedido_id = %s', (order['id'],))

        # Insertar productos y extras actualizados
        for product in order['products']:
            logging.info(f"Processing product: {product}")
            cursor.execute('''
                INSERT INTO pedido_productos (pedido_id, product_id, quantity, price)
                VALUES (%s, %s, %s, %s)
            ''', (order['id'], product['product_id'], product['quantity'], product['price']))
            pedido_producto_id = cursor.lastrowid
            logging.info(f"Inserted product with ID: {pedido_producto_id}")

            for extra in product['extras']:
                logging.info(f"Processing extra: {extra}")
                # Asegurarse de que el ID del extra está presente y es válido
                if 'extra_id' not in extra or extra['extra_id'] is None or extra['extra_id'] == 'undefined':
                    raise ValueError(f"Missing or invalid extra_id for extra: {extra}")

                cursor.execute('''
                    INSERT INTO pedido_extras (pedido_producto_id, extra_id, quantity, price)
                    VALUES (%s, %s, %s, %s)
                ''', (pedido_producto_id, extra['extra_id'], extra['quantity'], extra['price']))

        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logging.error(f"Error updating order: {e}")
        return False







@eel.expose
def generate_qr_code(phone):
    qr_url = f"https://wa.me/+591{phone}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill="black", back_color="white")
    qr_bio = io.BytesIO()
    qr_img.save(qr_bio, format="PNG")
     # Ajustar el tamaño de la imagen QR
    qr_img = qr_img.resize((13, 13))  # Cambia el tamaño a 150x150 píxeles

    qr_bio.seek(0)
    qr_base64 = base64.b64encode(qr_bio.getvalue()).decode('utf-8')
    qr_url_data = f"data:image/png;base64,{qr_base64}"
    return qr_url_data

@eel.expose
def generate_qr_code2(order_id):
    try:
        #qr_data = f"PedidoEntregado=id:{order_id}"
        qr_data = f"PE=id:{order_id}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill="black", back_color="white")
        qr_bio = io.BytesIO()
        qr_img.save(qr_bio, format="PNG")
        qr_bio.seek(0)
        
        # Guardar el QR como un archivo temporal
        qr_filename = f"qr_pedido.png"
        qr_filepath = f"web/qrs/{qr_filename}"
        with open(qr_filepath, "wb") as qr_file:
            qr_file.write(qr_bio.getvalue())

        return qr_filepath
    except Exception as e:
        logging.error(f"Error generating QR code: {e}")
        return None

def get_product_name(product_id):
    conn = get_mysql_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM productos WHERE id = %s AND active = 1", (product_id,))
    product_name = cursor.fetchone()
    conn.close()
    return product_name[0] if product_name else None

def get_extras_for_product(pedido_producto_id):
    conn = get_mysql_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.name, pe.price
        FROM pedido_extras pe
        JOIN extras e ON pe.extra_id = e.id
        WHERE pe.pedido_producto_id = %s AND e.active = 1
    """, (pedido_producto_id,))
    extras = cursor.fetchall()
    conn.close()
    return [{"name": name, "price": price} for name, price in extras]


@eel.expose
def print_ticket(order_json):
    try:
        order = json.loads(order_json)
        logging.info(f"Order data: {order}")

        if not isinstance(order, dict):
            raise ValueError("Order data is not a dictionary")

        order_id = order.get('order_id', '')
        if not order_id:
            raise ValueError("Order ID is missing from the order data")

        customer_name = order.get('customer_name', '')
        customer_phone = order.get('customer_phone', '')
        total_price = order.get('total_price', 0)
        down_payment = order.get('down_payment', 0)
        balance_due = order.get('balance_due', 0)
        delivery_date = order.get('delivery_date', '')
        delivery_method = order.get('delivery_method', '')
        department = order.get('department', '') if 'department' in order else ""
        address = order.get('address', '') if 'address' in order else ""
        carnet = order.get('carnet', '') if 'carnet' in order else ""
        branch = order.get('branch', '') if 'branch' in order else ""

        conn = get_mysql_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, product_id, quantity, price FROM pedido_productos WHERE pedido_id = %s", (order_id,))
        pedido_productos = cursor.fetchall()
        conn.close()

        def get_acronym(text):
            return ''.join([word[0].upper() for word in text.split()])

        products_str = "\n".join([
            f"{get_product_name(p[1])} x{p[2]} - {p[3]} Bs ({' '.join(get_acronym(extra['name']) for extra in get_extras_for_product(p[0]))})"
            for p in pedido_productos
        ])

        # Generate QR code for the order
        qr_filepath = generate_qr_code2(order_id)
        qr_img = Image.open(qr_filepath).resize((220, 220))

        # WhatsApp QR code
        qr_phone_url = f"https://wa.me/+591{customer_phone}"
        qr_phone = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr_phone.add_data(qr_phone_url)
        qr_phone.make(fit=True)
        qr_phone_img = qr_phone.make_image(fill="black", back_color="white")

        ticket_content = f"""
        Precio Total: {total_price} Bs
        Adelanto: {down_payment} Bs
        Fecha de Entrega: {delivery_date}
        Método de Entrega: {delivery_method}
        """

        if delivery_method == "Envío":
            ticket_content += f"""
            Departamento: {department}
            Dirección: {address}
            Carnet: {carnet}
            Sucursal: {branch}
            """

        ticket_content += "\n------------------------------"

        # Create the ticket image
        dpi = 300
        image_width_cm = 7
        image_width_pixels = int((image_width_cm / 2.54) * dpi)
        image_height_pixels = 1200

        ticket_img = Image.new('RGB', (image_width_pixels, image_height_pixels), color='white')
        draw = ImageDraw.Draw(ticket_img)

        # Logo
        logo_path = "web/img/logo2.png"
        logo = Image.open(logo_path).resize((int(image_width_pixels * 0.5), int(image_width_pixels * 0.2)))
        ticket_img.paste(logo, (int(image_width_pixels * 0.05), 10))

        # Order QR code
        ticket_img.paste(qr_img, (image_width_pixels - int(image_width_pixels * 0.3), 10))

        # WhatsApp QR code
        qr_phone_img = qr_phone_img.resize((150, 150))

        # Information column
        font_bold_large = ImageFont.truetype("arial.ttf", 40)
        font_regular_small = ImageFont.truetype("arial.ttf", 30)
        font_bold_labels = ImageFont.truetype("arialbd.ttf", 36, index=0, encoding='unic')
        font_regular_data = ImageFont.truetype("arial.ttf", 36, index=0, encoding='unic')

        current_y = int(image_width_pixels * 0.2)
        margin = int(image_width_pixels * 0.05)

        def draw_multiline_text(draw, text, position, font, max_width):
            lines = []
            words = text.split()
            while words:
                line = ''
                while words and draw.textbbox((0, 0), line + ' ' + words[0], font=font)[2] <= max_width:
                    line = ' '.join([line, words.pop(0)]).strip()
                lines.append(line)
            y = position[1]
            for line in lines:
                draw.text((position[0], y), line, font=font, fill="black")
                y += font.getbbox(line)[3] + 5
            return y

        # Draw customer name and phone
        draw.text((margin, current_y), "Nombre del Cliente:", font=font_bold_labels, fill="black")
        current_y += 40
        current_y = draw_multiline_text(draw, customer_name, (margin, current_y), font_regular_data, image_width_pixels - margin * 2 - int(image_width_pixels * 0.3))
        current_y += 25

        draw.text((margin, current_y), "Celular:", font=font_bold_labels, fill="black")
        current_y += 40
        draw.text((margin, current_y), customer_phone, font=font_regular_data, fill="black")
        current_y += 40

        draw.text((margin, current_y), "------------------------------", font=font_regular_small, fill="black")
        current_y += 40
        draw.text((margin, current_y), "Productos:", font=font_regular_small, fill="black")
        current_y += 30

        for product in products_str.split('\n'):
            draw.text((margin, current_y), product, font=font_regular_small, fill="black")
            current_y += 30

        draw.text((margin, current_y), "------------------------------", font=font_regular_small, fill="black")
        current_y += 40

        for line in ticket_content.strip().split('\n'):
            draw.text((margin, current_y), line.strip(), font=font_regular_small, fill="black")
            current_y += 30

        current_y += 15

        balance_label_text = "Saldo:"
        balance_text = f"{balance_due} Bs"
        balance_font_label = ImageFont.truetype("arialbd.ttf", 48, index=0, encoding='unic')
        balance_font_data = ImageFont.truetype("arial.ttf", 48, index=0, encoding='unic')

        qr_whatsapp_x = int(image_width_pixels * 0.7) + 20
        qr_whatsapp_y = current_y - 100

        whatsapp_text = "WhatsApp"
        whatsapp_font = ImageFont.truetype("arial.ttf", 28, index=0, encoding='unic')
        whatsapp_text_width, whatsapp_text_height = draw.textbbox((0, 0), whatsapp_text, font=whatsapp_font)[2:]
        whatsapp_text_x = qr_whatsapp_x + (qr_phone_img.width - whatsapp_text_width) // 2
        whatsapp_text_y = qr_whatsapp_y + qr_phone_img.height + 5

        draw.text((whatsapp_text_x, whatsapp_text_y), whatsapp_text, font=whatsapp_font, fill="black")
        ticket_img.paste(qr_phone_img, (qr_whatsapp_x, qr_whatsapp_y))

        draw.text((margin, current_y), balance_label_text, font=balance_font_label, fill="black")
        draw.text((margin + 150, current_y), balance_text, font=balance_font_data, fill="black")

        def optimize_image_for_thermal_printer(image):
            image = image.convert("L")
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2)
            image = image.convert("1")
            return image

        # ticket_img = optimize_image_for_thermal_printer(ticket_img)

        public_dir = "web/public"
        if not os.path.exists(public_dir):
            os.makedirs(public_dir)
        temp_image_path = os.path.join(public_dir, "temp_ticket.png")
        ticket_img.save(temp_image_path, dpi=(300, 300))

        return f"/public/temp_ticket.png"

    except Exception as e:
        logging.error(f"Error in print_ticket: {e}")
        return None


@eel.expose
def print_delivery_ticket(order_json):
    try:
        order = json.loads(order_json)
        logging.info(f"Order data for delivery: {order}")

        if not isinstance(order, dict):
            raise ValueError("Order data is not a dictionary")

        customer_name = order.get('customer_name', '').upper()
        phone = order.get('customer_phone', '').upper()  # Make sure to get 'customer_phone'
        department = order.get('department', '').upper()
        address = order.get('address', '').upper()
        carnet = order.get('carnet', '').upper()
        branch = order.get('branch', '').upper()

        # Cargar la imagen base
        base_image_path = "web/img/ticket.jpg"
        base_image = Image.open(base_image_path)
        base_width, base_height = base_image.size

        # Crear una imagen temporal para calcular el tamaño del texto
        temp_image = Image.new('RGBA', (1000, 1000), (255, 255, 255, 0))
        draw = ImageDraw.Draw(temp_image)

        # Fuentes
        font_path = "arial.ttf"
        font_size_name = 80
        font_size_info = 60
        font_size_city = 90
        font_size_address = 60

        font_name = ImageFont.truetype(font_path, font_size_name)
        font_info = ImageFont.truetype(font_path, font_size_info)
        font_city = ImageFont.truetype(font_path, font_size_city)
        font_address = ImageFont.truetype(font_path, font_size_address)

        # Lógica para dividir el nombre si tiene más de dos elementos
        name_parts = customer_name.split()
        if len(name_parts) > 2:
            customer_name = ' '.join(name_parts[:2]) + "\n" + ' '.join(name_parts[2:])

        # Función para centrar el texto y calcular el tamaño de la imagen necesaria
        def calculate_text_size(draw, text, font, line_spacing=3):
            lines = text.split('\n')
            max_text_width = 0
            total_text_height = 0
            for line in lines:
                bbox = draw.textbbox((0, 0), line, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                max_text_width = max(max_text_width, text_width)
                total_text_height += text_height + line_spacing
            return max_text_width, total_text_height

        # Calcular el tamaño del texto
        max_width_name, height_name = calculate_text_size(draw, customer_name, font_name, line_spacing=3)
        max_width_carnet, height_carnet = calculate_text_size(draw, f"C.I.: {carnet}", font_info, line_spacing=3)
        max_width_phone, height_phone = calculate_text_size(draw, f"CEL.: {phone}", font_info, line_spacing=3)
        max_width_department, height_department = calculate_text_size(draw, department, font_city, line_spacing=3)
        max_width_address, height_address = calculate_text_size(draw, f"{address} {branch}", font_address, line_spacing=3)

        # Calcular el tamaño final de la imagen de texto
        final_text_width = max(max_width_name, max_width_carnet, max_width_phone, max_width_department, max_width_address) + 20
        final_text_height = height_name + height_carnet + height_phone + height_department + height_address + int(0.8 * temp_image.height / 100) + 30

        # Crear la imagen de texto final con el tamaño adecuado
        text_image = Image.new('RGBA', (final_text_width, final_text_height), (255, 255, 255, 0))
        draw = ImageDraw.Draw(text_image)

        # Función para centrar el texto y dibujarlo
        def draw_centered_text(draw, text, font, y, max_width, line_spacing=3, bold=False):
            lines = text.split('\n')
            for line in lines:
                bbox = draw.textbbox((0, 0), line, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                x = (max_width - text_width) // 2
                if bold:
                    draw.text((x, y), line, font=font, fill="black", stroke_width=1, stroke_fill="black")
                else:
                    draw.text((x, y), line, font=font, fill="black")
                y += text_height + line_spacing
            return y

        # Dibujar el texto en la imagen de texto final
        current_y = 0
        current_y = draw_centered_text(draw, customer_name, font_name, current_y, final_text_width, line_spacing=5, bold=True)
        current_y += int(0.4 * text_image.height / 100)
        current_y = draw_centered_text(draw, f"C.I.: {carnet}", font_info, current_y, final_text_width, line_spacing=5)
        current_y += int(0.1 * text_image.height / 100)
        current_y = draw_centered_text(draw, f"CEL.: {phone}", font_info, current_y, final_text_width, line_spacing=5)
        current_y += int(0.5 * text_image.height / 100)
        current_y = draw_centered_text(draw, department, font_city, current_y, final_text_width, line_spacing=5, bold=True)
        current_y += int(2 * text_image.height / 100)
        draw_centered_text(draw, f"{address} {branch}", font_address, current_y, final_text_width, line_spacing=5, bold=True)

        # Guardar la imagen de texto
        text_image_path = "web/public/text_image.png"
        text_image.save(text_image_path)

        # Cargar la imagen de texto y redimensionarla para ajustarla al área de los márgenes
        text_image = Image.open(text_image_path)
        margin_x = 150
        margin_y = 10
        margin_width = 670
        margin_height = 485
        text_image_resized = text_image.resize((margin_width, margin_height), Image.LANCZOS)

        # Dibujar un margen azul en la imagen base para la posición donde se pegará el texto
        draw_base = ImageDraw.Draw(base_image)
        draw_base.rectangle([margin_x, margin_y, margin_x + margin_width, margin_y + margin_height], outline="blue", width=3)

        # Pegar la imagen de texto redimensionada sobre la imagen base
        base_image.paste(text_image_resized, (margin_x, margin_y), text_image_resized)

        # Generar el código QR
        qr_url = f"https://wa.me/+591{phone}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill="black", back_color="white")

        # Convertir el código QR a un formato de imagen compatible
        qr_img_io = io.BytesIO()
        qr_img.save(qr_img_io, format="PNG")
        qr_img_io.seek(0)
        qr_img = Image.open(qr_img_io)

        # Redimensionar el código QR para que encaje en la esquina inferior izquierda
        qr_size_px = int(2.5 * 120 / 2.54)
        qr_img = qr_img.resize((qr_size_px, qr_size_px), Image.LANCZOS)

        # Pegar el código QR en la esquina inferior izquierda
        qr_x = 10
        qr_y = base_height - qr_size_px - 10
        base_image.paste(qr_img, (qr_x, qr_y))

        # Rotar la imagen combinada 90 grados
        rotated_image = base_image.rotate(90, expand=True)

        # Ajustar el tamaño de la imagen a 7 cm de ancho con una resolución de 300 ppi
        target_width_cm = 7
        target_dpi = 300
        target_width_px = int(target_width_cm / 2.54 * target_dpi)
        aspect_ratio = rotated_image.height / rotated_image.width
        target_height_px = int(target_width_px * aspect_ratio)

        resized_image = rotated_image.resize((target_width_px, target_height_px), Image.LANCZOS)

        # Guardar la imagen combinada rotada y redimensionada
        combined_image_path = "web/public/combined_delivery_ticket.png"
        resized_image.save(combined_image_path, dpi=(300, 300))

        # Retornar la ruta relativa de la imagen para el cliente
        return f"/public/combined_delivery_ticket.png"

    except Exception as e:
        logging.error(f"Error in print_delivery_ticket: {e}")
        return None

def get_all_orders():
    conn = get_mysql_connection()
    c = conn.cursor()
    try:
        c.execute('''
            SELECT p.id, p.customer_name, p.customer_phone, 
                   p.discount, p.total_price, p.down_payment, 
                   p.balance_due, p.start_date, p.delivery_date, 
                   p.delivery_method, p.department, p.address, 
                   p.carnet, p.branch, p.payment_method, p.completed,
                   GROUP_CONCAT(CONCAT(pp.product_id, ':', pp.quantity, ':', pp.price) SEPARATOR ',') AS products
            FROM pedidos p
            LEFT JOIN pedido_productos pp ON p.id = pp.pedido_id
            GROUP BY p.id
        ''')
        orders = c.fetchall()
        return orders
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return []
    finally:
        conn.close()



@eel.expose
def fetch_advance_summaries(filter_date=None, filter_start_date=None, filter_end_date=None, filter_month=None):
    orders = get_all_orders()

    daily_advance = 0
    weekly_advance = 0
    monthly_advance = 0
    annual_advance = 0
    cash_advance = 0
    transfer_advance = 0
    total_advance = 0

    today = datetime.now().date()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_month = today.replace(day=1)
    start_of_year = today.replace(month=1, day=1)

    if not filter_date and not filter_start_date and not filter_end_date and not filter_month:
        filter_date = today  # Solo se usa la fecha de hoy si no hay otros filtros establecidos
    elif filter_date:
        filter_date = datetime.strptime(filter_date, "%Y-%m-%d").date()
        
    if filter_start_date:
        filter_start_date = datetime.strptime(filter_start_date, "%Y-%m-%d").date()
    if filter_end_date:
        filter_end_date = datetime.strptime(filter_end_date, "%Y-%m-%d").date()
    if filter_month:
        filter_month = datetime.strptime(filter_month, "%Y-%m").date()

    print("Filters received:", filter_date, filter_start_date, filter_end_date, filter_month)
    print("Start of periods:", start_of_week, start_of_month, start_of_year)

    for order in orders:
        order_date = order[7]  # Suponiendo que start_date está en la posición 7 de la tupla
        print(f"Processing order {order[0]} with date {order_date} and advance {order[5]} and payment method {order[14]}")

        # Inicializa bandera para seguimiento de suma de adelantos
        order_added_to_summary = False

        # Calcular adelanto diario
        if filter_date and order_date == filter_date:
            daily_advance += order[5]
            order_added_to_summary = True
            print(f"Order {order[0]} matched daily advance filter")

            # Calcular adelanto por método de pago para adelanto diario
            if order[14] == 'Efectivo':
                cash_advance += order[5]
                print(f"Order {order[0]} matched cash advance filter with advance {order[5]}. Cash advance is now {cash_advance}")
            elif order[14] == 'Transferencia':
                transfer_advance += order[5]
                print(f"Order {order[0]} matched transfer advance filter with advance {order[5]}. Transfer advance is now {transfer_advance}")

        # Calcular adelanto semanal
        if filter_start_date and filter_end_date:
            if filter_start_date <= order_date <= filter_end_date:
                weekly_advance += order[5]
                order_added_to_summary = True
                print(f"Order {order[0]} matched weekly advance filter")
        else:
            if start_of_week <= order_date <= today:
                weekly_advance += order[5]
                order_added_to_summary = True
                print(f"Order {order[0]} matched weekly advance filter")

        # Calcular adelanto mensual
        if filter_month:
            if order_date.year == filter_month.year and order_date.month == filter_month.month:
                monthly_advance += order[5]
                order_added_to_summary = True
                print(f"Order {order[0]} matched monthly advance filter")
        else:
            if start_of_month <= order_date <= today:
                monthly_advance += order[5]
                order_added_to_summary = True
                print(f"Order {order[0]} matched monthly advance filter")

        # Calcular adelanto anual
        if order_date.year == today.year:
            annual_advance += order[5]
            order_added_to_summary = True
            print(f"Order {order[0]} matched annual advance filter")

        # Calcular adelanto por método de pago para rangos de fechas
        if filter_start_date and filter_end_date:
            if filter_start_date <= order_date <= filter_end_date:
                if order[14] == 'Efectivo' and not filter_date:
                    cash_advance += order[5]
                    print(f"Order {order[0]} matched cash advance filter with advance {order[5]}. Cash advance is now {cash_advance}")
                elif order[14] == 'Transferencia' and not filter_date:
                    transfer_advance += order[5]
                    print(f"Order {order[0]} matched transfer advance filter with advance {order[5]}. Transfer advance is now {transfer_advance}")
        elif filter_month:
            if order_date.year == filter_month.year and order_date.month == filter_month.month:
                if order[14] == 'Efectivo' and not filter_date:
                    cash_advance += order[5]
                    print(f"Order {order[0]} matched cash advance filter with advance {order[5]}. Cash advance is now {cash_advance}")
                elif order[14] == 'Transferencia' and not filter_date:
                    transfer_advance += order[5]
                    print(f"Order {order[0]} matched transfer advance filter with advance {order[5]}. Transfer advance is now {transfer_advance}")
        else:
            if start_of_week <= order_date <= today:
                if order[14] == 'Efectivo' and not filter_date:
                    cash_advance += order[5]
                    print(f"Order {order[0]} matched cash advance filter with advance {order[5]}. Cash advance is now {cash_advance}")
                elif order[14] == 'Transferencia' and not filter_date:
                    transfer_advance += order[5]
                    print(f"Order {order[0]} matched transfer advance filter with advance {order[5]}. Transfer advance is now {transfer_advance}")

        # Calcular adelanto total solo si el pedido se ha sumado a algún filtro
        if order_added_to_summary:
            total_advance += order[5]

    print("Calculated advances:", {
        "daily_advance": daily_advance,
        "weekly_advance": weekly_advance,
        "monthly_advance": monthly_advance,
        "annual_advance": annual_advance,
        "cash_advance": cash_advance,
        "transfer_advance": transfer_advance,
        "total_advance": total_advance
    })

    return {
        'daily_advance': daily_advance,
        'weekly_advance': weekly_advance,
        'monthly_advance': monthly_advance,
        'annual_advance': annual_advance,
        'cash_advance': cash_advance,
        'transfer_advance': transfer_advance,
        'total_advance': total_advance
    }
@eel.expose
def get_order_products(order_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute('''
            SELECT pp.product_id, pr.name, pp.quantity, pp.price
            FROM pedido_productos pp
            JOIN productos pr ON pp.product_id = pr.id
            WHERE pp.pedido_id = %s
        ''', (order_id,))
        products = c.fetchall()
        conn.close()
        return products
    except Exception as e:
        logging.error(f"Error in get_order_products: {e}")
        return []


#################-FIN PEDIDOS-####################



################--SCANER PEDIDOS--###############
@app.route('/mark_as_completed', method='GET')
def mark_as_completed():
    try:
        encrypted_order_id = request.query.order_id
        logging.debug(f"Received order ID: {encrypted_order_id}")
        if encrypted_order_id.startswith("PE=id:"):
            order_id = encrypted_order_id.split(":")[1]
            logging.debug(f"Order ID extracted: {order_id}")
            if order_id:
                already_completed = check_order_completed(int(order_id))
                if already_completed:
                    response.content_type = 'application/json'
                    response.status = 400
                    logging.debug("Order already completed.")
                    return json.dumps({"warning": "Este pedido ya ha sido registrado anteriormente."})
                
                success, order_details = mark_order_as_completed(int(order_id))
                if success:
                    response.content_type = 'application/json'
                    response.status = 200
                    logging.debug(f"Order marked as completed: {order_details}")
                    return json.dumps(order_details)
                else:
                    response.content_type = 'application/json'
                    response.status = 500
                    logging.debug("Failed to mark order as completed.")
                    return json.dumps({"error": "No se pudo completar el pedido."})
        else:
            logging.debug("Order ID not provided correctly.")
            response.content_type = 'application/json'
            response.status = 400
            return json.dumps({"error": "ID del pedido no proporcionado."})
    except Exception as e:
        logging.error(f"Error in mark_as_completed: {e}")
        response.content_type = 'application/json'
        response.status = 500
        return json.dumps({"error": "Error interno del servidor."})


def check_order_completed(order_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute('SELECT 1 FROM pedidos_completados WHERE pedido_id = %s', (order_id,))
        result = c.fetchone()
        conn.close()
        logging.debug(f"Check order completed result: {result}")
        return result is not None
    except Exception as e:
        logging.error(f"Error checking if order is completed: {e}")
        return False

def mark_order_as_completed(order_id):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        
        # Actualizar el estado del pedido a completado
        c.execute('UPDATE pedidos SET completed = 1 WHERE id = %s', (order_id,))
        
        # Obtener los detalles del pedido
        c.execute('SELECT * FROM pedidos WHERE id = %s', (order_id,))
        order = c.fetchone()
        logging.debug(f"Order details fetched: {order}")
        
        if order:
            # Insertar el pedido en la tabla pedidos_completados
            c.execute('''INSERT INTO pedidos_completados (
                            customer_name, customer_phone, discount, 
                            total_price, down_payment, balance_due, start_date, delivery_date, 
                            delivery_method, department, address, carnet, branch, payment_method,
                            pedido_id
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''', 
                      (order[1], order[2], order[3], order[4], 
                       order[5], order[6], order[7], order[8], order[9], 
                       order[10], order[11], order[12], order[13], order[14], order[0]))
            
            conn.commit()
            
            order_details = {
                "customer_name": order[1],
                "customer_phone": order[2],
                "discount": order[3],
                "total_price": order[4],
                "down_payment": order[5],
                "balance_due": order[6],
                "start_date": order[7].strftime('%Y-%m-%d') if order[7] else None,
                "delivery_date": order[8].strftime('%Y-%m-%d') if order[8] else None,
                "delivery_method": order[9],
                "department": order[10],
                "address": order[11],
                "carnet": order[12],
                "branch": order[13],
                "payment_method": order[14]
            }
            logging.debug(f"Order details: {order_details}")
            return True, order_details
        else:
            logging.debug("No order found with the given ID.")
            return False, None
    except Exception as e:
        logging.error(f"Error marking order as completed: {e}")
        return False, None
    finally:
        conn.close()



@app.route('/update_payment_method', method='POST')
def update_payment_method():
    try:
        data = request.json
        logging.debug(f"Received data: {data}")
        order_id = data.get('order_id')
        payment_method = data.get('payment_method')

        # Extraer el ID del pedido del formato 'PedidoEntregado=id:X'
        if order_id and order_id.startswith("PE=id:"):
            order_id = order_id.split(":")[1]
        
        if order_id and payment_method:
            success, order_details = update_payment_method_in_completed_orders(int(order_id), payment_method)
            if success:
                response.content_type = 'application/json'
                response.status = 200
                return json.dumps(order_details)
            else:
                response.content_type = 'application/json'
                response.status = 500
                return json.dumps({"error": "No se pudo actualizar el método de pago."})
        else:
            response.content_type = 'application/json'
            response.status = 400
            return json.dumps({"error": "Datos incompletos proporcionados."})
    except Exception as e:
        logging.error(f"Error in update_payment_method: {e}")
        response.content_type = 'application/json'
        response.status = 500
        return json.dumps({"error": "Error interno del servidor."})

def update_payment_method_in_completed_orders(order_id, payment_method):
    try:
        logging.debug(f"Updating payment method for order_id: {order_id} to {payment_method}")
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute('UPDATE pedidos_completados SET payment_method = %s WHERE pedido_id = %s', (payment_method, order_id))
        conn.commit()
        
        # Obtener los detalles del pedido actualizado
        c.execute('SELECT customer_name FROM pedidos_completados WHERE pedido_id = %s', (order_id,))
        order = c.fetchone()
        conn.close()
        
        if order:
            order_details = {
                "customer_name": order[0]
            }
            logging.debug(f"Order details: {order_details}")
            return True, order_details
        else:
            logging.debug("No order found with the given ID.")
            return False, None
    except Exception as e:
        logging.error(f"Error updating payment method: {e}")
        return False, None
    


@app.route('/update_delivery_date', method='POST')
def update_delivery_date():
    try:
        data = request.json
        logging.debug(f"Received data for updating delivery date: {data}")
        order_id = data.get('order_id')
        delivery_date = data.get('delivery_date')

        # Extraer el ID del pedido del formato 'PE=id:X'
        if order_id and order_id.startswith("PE=id:"):
            order_id = order_id.split(":")[1]
        
        if order_id and delivery_date:
            success, order_details = update_delivery_date_in_completed_orders(int(order_id), delivery_date)
            if success:
                response.content_type = 'application/json'
                response.status = 200
                return json.dumps(order_details)
            else:
                response.content_type = 'application/json'
                response.status = 500
                return json.dumps({"error": "No se pudo actualizar la fecha de entrega."})
        else:
            response.content_type = 'application/json'
            response.status = 400
            return json.dumps({"error": "Datos incompletos proporcionados."})
    except Exception as e:
        logging.error(f"Error in update_delivery_date: {e}")
        response.content_type = 'application/json'
        response.status = 500
        return json.dumps({"error": "Error interno del servidor."})

def update_delivery_date_in_completed_orders(order_id, delivery_date):
    try:
        conn = get_mysql_connection()
        c = conn.cursor()
        c.execute('UPDATE pedidos_completados SET delivery_date = %s WHERE pedido_id = %s', (delivery_date, order_id))
        conn.commit()
        
        # Obtener los detalles del pedido actualizado
        c.execute('SELECT customer_name FROM pedidos_completados WHERE pedido_id = %s', (order_id,))
        order = c.fetchone()
        conn.close()
        
        if order:
            order_details = {
                "customer_name": order[0]
            }
            logging.debug(f"Order details: {order_details}")
            return True, order_details
        else:
            logging.debug("No order found with the given ID.")
            return False, None
    except Exception as e:
        logging.error(f"Error updating delivery date: {e}")
        return False, None
#################- FINSCANNER PEDIDOS-###########


#############--PEDIDOS COMPLETADOS -##############
@eel.expose
def get_completed_orders():
    conn = sqlite3.connect('gestion_pedidos.db')
    cursor = conn.cursor()
    
    # Consulta para obtener los pedidos completados
    cursor.execute('''
        SELECT id, customer_name, customer_phone, products, discount, total_price, down_payment, balance_due, 
               start_date, delivery_date, delivery_method, department, address, carnet, branch, payment_method, pedido_id 
        FROM pedidos_completados
    ''')
    
    orders = cursor.fetchall()
    conn.close()

    # Transformar los datos en una lista de diccionarios
    orders_list = [
        {
            'id': order[0],
            'customer_name': order[1],
            'customer_phone': order[2],
            'products': order[3],
            'discount': order[4],
            'total_price': order[5],
            'down_payment': order[6],
            'balance_due': order[7],
            'start_date': order[8],
            'delivery_date': order[9],
            'delivery_method': order[10],
            'department': order[11],
            'address': order[12],
            'carnet': order[13],
            'branch': order[14],
            'payment_method': order[15],
            'pedido_id': order[16]
        }
        for order in orders
    ]
    
    return orders_list


##########--FIN PEDIDOS COMPLETADOS-- ############

@eel.expose
def get_completed_orders2():
    try:
        conn = get_mysql_connection()
        cursor = conn.cursor()
        
        # Consulta para obtener los pedidos completados
        cursor.execute('''
            SELECT id, customer_name, customer_phone, discount, total_price, down_payment, balance_due, 
                   start_date, delivery_date, delivery_method, department, address, carnet, branch, payment_method 
            FROM pedidos_completados
        ''')
        
        orders = cursor.fetchall()
        conn.close()

        # Transformar los datos en una lista de diccionarios
        orders_list = [
            {
                'id': order[0],
                'customer_name': order[1],
                'customer_phone': order[2],
                'discount': order[3],
                'total_price': order[4],
                'down_payment': order[5],
                'balance_due': order[6],
                'start_date': order[7].strftime('%Y-%m-%d') if order[7] else None,
                'delivery_date': order[8].strftime('%Y-%m-%d') if order[8] else None,
                'delivery_method': order[9],
                'department': order[10],
                'address': order[11],
                'carnet': order[12],
                'branch': order[13],
                'payment_method': order[14]
            }
            for order in orders
        ]
        
        return orders_list
    except Exception as e:
        logging.error(f"Error fetching completed orders: {e}")
        return []







############--DASHBOARD--################
@eel.expose
def get_filtered_data(product, start_date, end_date, exact_date, month, group_by, payment_method):
    logging.debug(f"Filtering data for product: {product}, start_date: {start_date}, end_date: {end_date}, exact_date: {exact_date}, month: {month}, group_by: {group_by}, payment_method: {payment_method}")
    sales_data = {'labels': [], 'values': [], 'cash': 0, 'transfer': 0}
    advances_data = {'labels': [], 'values': [], 'cash': 0, 'transfer': 0}
    completed_orders_data = {'labels': [], 'values': [], 'cash': 0, 'transfer': 0}
    global_data = {'labels': [], 'values': []}

    try:
        conn = get_mysql_connection()
        c = conn.cursor()

        sales_data = fetch_sales_data(c, product, start_date, end_date, exact_date, month, group_by, payment_method)
        advances_data = fetch_advances_data(c, product, start_date, end_date, exact_date, month, group_by, payment_method)

        if product == "all":
            completed_orders_data = fetch_completed_orders_data(c, product, start_date, end_date, exact_date, month, group_by, payment_method)
        else:
            completed_orders_data = {'labels': [], 'values': [], 'cash': 0, 'transfer': 0}
        
        global_data = fetch_global_data(sales_data, advances_data, completed_orders_data)

        conn.close()
    except Exception as e:
        logging.error(f"Error fetching filtered data: {e}")

    return {
        'sales': sales_data,
        'advances': advances_data,
        'completedOrders': completed_orders_data,
        'global': global_data
    }

def fetch_global_data(sales_data, advances_data, completed_orders_data):
    # Convert the labels and values to lists if they are not already
    sales_labels = list(sales_data['labels'])
    sales_values = list(sales_data['values'])
    advances_labels = list(advances_data['labels'])
    advances_values = list(advances_data['values'])
    completed_orders_labels = list(completed_orders_data['labels'])
    completed_orders_values = list(completed_orders_data['values'])
    
    # Combine the labels and values
    all_data = sales_labels + advances_labels + completed_orders_labels
    all_values = sales_values + advances_values + completed_orders_values
    
    global_labels, global_values = [], []
    
    # Use a dictionary to accumulate values for each label
    global_dict = {}
    
    for label, value in zip(all_data, all_values):
        if label in global_dict:
            global_dict[label] += value
        else:
            global_dict[label] = value
    
    # Sort the labels and values
    global_labels = sorted(global_dict.keys())
    global_values = [global_dict[label] for label in global_labels]
    
    return {'labels': global_labels, 'values': global_values}


def fetch_sales_data(c, product, start_date, end_date, exact_date, month, group_by, payment_method):
    query = '''
        SELECT DATE(v.sale_date), SUM(vp.price * vp.quantity), v.payment_method
        FROM ventas v
        JOIN venta_productos vp ON v.id = vp.venta_id
        JOIN productos pr ON vp.product_id = pr.id
        WHERE 1=1
    '''
    params = []

    if product and product != "all":
        query += ' AND pr.name = %s'
        params.append(product)

    query, params = add_filters(query, params, start_date, end_date, exact_date, month, "v.sale_date", payment_method, "v")
    query += ' GROUP BY DATE(v.sale_date), v.payment_method'
    
    logging.debug(f"Sales Query: {query}")
    logging.debug(f"Sales Query Params: {params}")
    
    try:
        c.execute(query, params)
        sales_data = c.fetchall()
    except Exception as e:
        logging.error(f"Error executing sales query: {e}")
        sales_data = []

    logging.debug(f"Sales Data: {sales_data}")

    if not sales_data:
        logging.warning(f"No sales data found for the given filters: {params}")
        return {'labels': [], 'values': [], 'cash': 0, 'transfer': 0}

    labels, values, cash, transfer = group_data_with_payment_method(sales_data, group_by)

    return {'labels': list(labels), 'values': list(values), 'cash': cash, 'transfer': transfer}



def fetch_advances_data(c, product, start_date, end_date, exact_date, month, group_by, payment_method):
    query = '''
        SELECT DATE(p.start_date), SUM(p.down_payment * pp.quantity / (SELECT SUM(quantity) FROM pedido_productos WHERE pedido_id = p.id)), p.payment_method
        FROM pedidos p
        JOIN pedido_productos pp ON p.id = pp.pedido_id
        JOIN productos pr ON pp.product_id = pr.id
        WHERE 1=1
    '''
    params = []

    if product and product != "all":
        query += ' AND pr.name = %s'
        params.append(product)

    query, params = add_filters(query, params, start_date, end_date, exact_date, month, "p.start_date", payment_method, "p")
    query += ' GROUP BY DATE(p.start_date), p.payment_method'
    
    logging.debug(f"Advances Query: {query}")
    logging.debug(f"Advances Query Params: {params}")
    
    try:
        c.execute(query, params)
        advances_data = c.fetchall()
    except Exception as e:
        logging.error(f"Error executing advances query: {e}")
        advances_data = []

    logging.debug(f"Advances Data: {advances_data}")

    if not advances_data:
        logging.warning(f"No advances data found for the given filters: {params}")
        return {'labels': [], 'values': [], 'cash': 0, 'transfer': 0}

    labels, values, cash, transfer = group_data_with_payment_method(advances_data, group_by)

    return {'labels': list(labels), 'values': list(values), 'cash': cash, 'transfer': transfer}









def fetch_completed_orders_data(c, product, start_date, end_date, exact_date, month, group_by, payment_method):
    query = '''
        SELECT DATE(c.delivery_date), SUM(c.balance_due * pp.quantity / (SELECT SUM(quantity) FROM pedido_productos WHERE pedido_id = c.pedido_id)), c.payment_method
        FROM pedidos_completados c
        JOIN pedido_productos pp ON c.pedido_id = pp.pedido_id
        JOIN productos pr ON pp.product_id = pr.id
        WHERE 1=1
    '''
    params = []

    if product and product != "all":
        query += ' AND pr.name = %s'
        params.append(product)

    query, params = add_filters(query, params, start_date, end_date, exact_date, month, "c.delivery_date", payment_method, "c")
    query += ' GROUP BY DATE(c.delivery_date), c.payment_method'
    
    logging.debug(f"Completed Orders Query: {query}")
    logging.debug(f"Completed Orders Query Params: {params}")
    
    try:
        c.execute(query, params)
        completed_orders_data = c.fetchall()
    except Exception as e:
        logging.error(f"Error executing completed orders query: {e}")
        completed_orders_data = []

    logging.debug(f"Completed Orders Data: {completed_orders_data}")

    if not completed_orders_data:
        logging.warning(f"No completed orders data found for the given filters: {params}")
        return {'labels': [], 'values': [], 'cash': 0, 'transfer': 0}

    labels, values, cash, transfer = group_data_with_payment_method(completed_orders_data, group_by)

    return {'labels': list(labels), 'values': list(values), 'cash': cash, 'transfer': transfer}










def add_filters(query, params, start_date, end_date, exact_date, month, date_field, payment_method, table_alias):
    logging.debug(f"Adding filters: start_date={start_date}, end_date={end_date}, exact_date={exact_date}, month={month}, date_field={date_field}, payment_method={payment_method}")

    if start_date and end_date:
        query += f' AND DATE({date_field}) BETWEEN DATE(%s) AND DATE(%s)'
        params.extend([start_date, end_date])

    elif exact_date:
        query += f' AND DATE({date_field}) = DATE(%s)'
        params.append(exact_date)

    elif month:
        # Obtener el último día del mes
        year, month = map(int, month.split('-'))
        _, last_day = calendar.monthrange(year, month)
        month_start = f'{year}-{month:02d}-01'
        month_end = f'{year}-{month:02d}-{last_day:02d}'
        query += f' AND DATE({date_field}) BETWEEN %s AND %s'
        params.extend([month_start, month_end])

    if payment_method and payment_method != "all":
        if payment_method.lower() == 'transfer':
            payment_method = 'Transferencia'
        elif payment_method.lower() == 'cash':
            payment_method = 'Efectivo'
        query += f' AND {table_alias}.payment_method = %s'
        params.append(payment_method)

    logging.debug(f"Filters added to query: {query}, Params: {params}")

    return query, params



def group_data_with_payment_method(data, group_by):
    labels = []
    values = []
    cash = 0
    transfer = 0
    data_dict = {}

    for row in data:
        date, value, payment_method = row
        date_str = date.strftime('%Y-%m-%d')  # Convertir fecha a string
        if payment_method == 'Efectivo':
            cash += value
        elif payment_method == 'Transferencia':
            transfer += value

        if group_by == 'day':
            key = date_str
        elif group_by == 'week':
            key = (datetime.strptime(date_str, '%Y-%m-%d') - timedelta(days=datetime.strptime(date_str, '%Y-%m-%d').weekday())).strftime('%Y-%m-%d')
        elif group_by == 'month':
            key = datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y-%m')
        elif group_by == 'year':
            key = datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y')

        if key in data_dict:
            data_dict[key] += value
        else:
            data_dict[key] = value

    labels = sorted(data_dict.keys())
    values = [data_dict[label] for label in labels]

    return labels, values, cash, transfer





#############################




"""
Paso 3: Ajustar configuración sql_mode de MySQL
Si todavía tienes problemas con la configuración de ONLY_FULL_GROUP_BY, puedes intentar desactivar temporalmente esta configuración para verificar si el problema se resuelve:
SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));
Paso 4: Verificar los resultados en Python
Asegúrate de que los datos se están recuperando correctamente en tu script Python. Si los datos se recuperan correctamente cuando ONLY_FULL_GROUP_BY está desactivado, entonces necesitas ajustar tu consulta para cumplir con esta configuración.

Por último, recuerda reactivar ONLY_FULL_GROUP_BY después de tus pruebas para mantener la integridad de tus datos:

sql
Copiar código
SET GLOBAL sql_mode=(SELECT CONCAT(@@sql_mode,',ONLY_FULL_GROUP_BY'));

"""

################-APLICACION-####################
"""



eel.fetch_advance_summaries(filterDate, filterStartDate, filterEndDate, filterMonth)"""
import uuid  # Para generar identificadores únicos de sesión
from modulos.database import autenticar_usuario, agregar_usuario, existe_administrador
# Diccionario para mantener la sesión del usuario
# Diccionario para mantener la sesión del usuario
sesiones = {}

# Función para manejar el inicio de sesión
@eel.expose
def iniciar_sesion(username, password):
    role = autenticar_usuario(username, password)
    if role:
        sesion_id = str(uuid.uuid4())  # Generar un ID único para la sesión
        sesiones[sesion_id] = {'username': username, 'role': role}
        return {'status': 'success', 'role': role, 'sesion_id': sesion_id}
    return {'status': 'fail'}

# Función para agregar usuarios (solo administradores deberían tener acceso)
@eel.expose
def registrar_usuario(username, password, role):
    if role == 'admin' and existe_administrador():
        return {'status': 'fail', 'message': 'Ya existe un administrador'}
    if agregar_usuario(username, password, role):
        return {'status': 'success'}
    return {'status': 'fail'}

# Función para obtener el rol del usuario actual
@eel.expose
def obtener_rol_usuario(sesion_id):
    if sesion_id in sesiones:
        return {'role': sesiones[sesion_id]['role']}
    return {'role': None}

# Función para manejar el cierre de sesión
@eel.expose
def cerrar_sesion(sesion_id):
    if sesion_id in sesiones:
        del sesiones[sesion_id]
        return {'status': 'success'}
    return {'status': 'fail'}


@eel.expose
def obtener_contraseña_segura():
    # Aquí puedes definir la contraseña de manera segura
    return "23deenerode1996"


@eel.expose
def get_users():
    users = modulos.database.obtener_usuarios()
    return users
@eel.expose
def eliminar_usuario(username):
    if modulos.database.eliminar_usuario_db(username):
        return {'status': 'success'}
    return {'status': 'fail', 'message': 'No se pudo eliminar el usuario'}


# Ruta para servir archivos estáticos
@app.route('/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='web')


# Ruta para manejar el error 404
# Función para redirigir a la página de error 404

@app.error(404)
def error404(error):
    return static_file('404.html', root='web')

def start_server():
    eel.init('web')
    # Iniciar Eel con Bottle como el servidor
    eel.start('login.html', mode=None, host='0.0.0.0', port=8000, app=app)
    #eel.start('login.html', mode=None, host='localhost', port=8000, app=app)
  

if __name__ == '__main__':
    start_server()