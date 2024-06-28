import qrcode
import mysql.connector
import io
import base64
from PIL import Image, ImageDraw, ImageWin

import logging
import os
from .database import get_mysql_connection
def get_products():
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

def generate_qr_codes(product_id, quantity):
    conn = get_mysql_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT name FROM productos WHERE id = %s', (product_id,))
    product_name = cursor.fetchone()[0]
    
    qr_codes = []

    for _ in range(quantity):
        qr_data = f'Prd:{product_id}'
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=0,  # Eliminar bordes blancos
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill="black", back_color="white")

        # Recortar los bordes blancos
        qr_img = qr_img.crop(qr_img.getbbox())

        buffered = io.BytesIO()
        qr_img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        qr_codes.append(qr_base64)
    
    conn.close()
    return qr_codes

def print_qr_codes(product_id, qr_codes):
    conn = get_mysql_connection()
    cursor = conn.cursor()

    # Crear una imagen para imprimir todos los códigos QR juntos
    images = []
    for qr_base64 in qr_codes:
        qr_data = base64.b64decode(qr_base64)
        qr_img = Image.open(io.BytesIO(qr_data)).convert('RGB')  # Convertir a RGB para eliminar transparencia
        qr_img = qr_img.resize((200, 200))  # Ajustar tamaño del QR a 200 px x 200 px (Aproximadamente 4.5 cm a 450 PPI)
        images.append(qr_img)

    if images:
        num_per_row = 5  # Número de códigos QR por fila
        spacing = 15  # Espacio entre códigos QR en píxeles
        total_width = num_per_row * 200 + (num_per_row - 1) * spacing  # Ajustar para espacio entre QR
        num_rows = (len(images) + num_per_row - 1) // num_per_row
        total_height = num_rows * 200 + (num_rows - 1) * spacing  # Ajustar para espacio entre QR
        
        combined_img = Image.new('RGB', (total_width, total_height), 'white')
        y_offset = 0
        x_offset = 0

        for i, img in enumerate(images):
            combined_img.paste(img, (x_offset, y_offset))
            x_offset += 200 + spacing  # 200 px para QR + espacio
            if (i + 1) % num_per_row == 0:
                x_offset = 0
                y_offset += 200 + spacing  # 200 px para QR + espacio
        
        # Ajustar la imagen a 7 cm de ancho con 450 PPI
        width_cm = 7
        width_inches = width_cm / 2.54
        width_pixels = int(width_inches * 450)
        height_pixels = int(total_height * (width_pixels / total_width))
        
        combined_img = combined_img.resize((width_pixels, height_pixels), Image.LANCZOS)
        
        # Guardar la imagen combinada
        public_dir = "web/public"
        if not os.path.exists(public_dir):
            os.makedirs(public_dir)
        combined_image_path = os.path.join(public_dir, "combined_qr_codes.png")
        combined_img.save(combined_image_path, dpi=(450, 450))
        
        # Actualizar el stock después de imprimir
        cursor.execute('''
            INSERT INTO stock (producto_id, cantidad_disponible)
        VALUES (%s, %s)
        ON DUPLICATE KEY UPDATE cantidad_disponible = cantidad_disponible + %s
        ''', (product_id, len(qr_codes), len(qr_codes)))
        conn.commit()

    conn.close()
    
    # Retornar la ruta relativa de la imagen para el cliente
    return f"/public/combined_qr_codes.png"


def print_qr_codes_no_stock(product_id, qr_codes):
    # Crear una imagen para imprimir todos los códigos QR juntos
    images = []
    for qr_base64 in qr_codes:
        qr_data = base64.b64decode(qr_base64)
        qr_img = Image.open(io.BytesIO(qr_data)).convert('RGB')
        qr_img = qr_img.resize((200, 200))  # Ajustar tamaño del QR a 200 px x 200 px
        images.append(qr_img)

    if images:
        num_per_row = 5
        spacing = 15
        total_width = num_per_row * 200 + (num_per_row - 1) * spacing
        num_rows = (len(images) + num_per_row - 1) // num_per_row
        total_height = num_rows * 200 + (num_rows - 1) * spacing

        combined_img = Image.new('RGB', (total_width, total_height), 'white')
        y_offset = 0
        x_offset = 0

        for i, img in enumerate(images):
            combined_img.paste(img, (x_offset, y_offset))
            x_offset += 200 + spacing
            if (i + 1) % num_per_row == 0:
                x_offset = 0
                y_offset += 200 + spacing

        # Ajustar la imagen a 7 cm de ancho con 450 PPI
        width_cm = 7
        width_inches = width_cm / 2.54
        width_pixels = int(width_inches * 450)
        height_pixels = int(total_height * (width_pixels / total_width))

        combined_img = combined_img.resize((width_pixels, height_pixels), Image.LANCZOS)

        # Guardar la imagen combinada
        public_dir = "web/public"
        if not os.path.exists(public_dir):
            os.makedirs(public_dir)
        combined_image_path = os.path.join(public_dir, "combined_qr_codes_no_stock.png")
        combined_img.save(combined_image_path, dpi=(450, 450))

    # Retornar la ruta relativa de la imagen para el cliente
    return f"/public/combined_qr_codes_no_stock.png"


def add_to_stock(product_id):
    try:
        conn = get_mysql_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO stock (producto_id, cantidad_disponible)
            VALUES (%s, 1)
            ON DUPLICATE KEY UPDATE cantidad_disponible = cantidad_disponible + 1
        ''', (product_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logging.error(f"Error adding to stock: {e}")
        return False