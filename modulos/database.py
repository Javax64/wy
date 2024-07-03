
import mysql.connector
import os
def get_mysql_connection():
    return mysql.connector.connect(
        host="localhost",
        user="javax3",
        password="77754abel867",
        database="admin2"
    )
def drop_tables():
    conn = get_mysql_connection()
    c = conn.cursor()

    # Eliminar las tablas existentes
    c.execute('DROP TABLE IF EXISTS venta_productos')
    c.execute('DROP TABLE IF EXISTS ventas')

    conn.commit()
    conn.close()

def create_tables():
    conn = get_mysql_connection()
    c = conn.cursor()

     # Tabla de productos
    c.execute('''
        CREATE TABLE IF NOT EXISTS productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price FLOAT NOT NULL,
            active TINYINT DEFAULT 1
        )
    ''')

    # Tabla de extras
    c.execute('''
        CREATE TABLE IF NOT EXISTS extras (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            price FLOAT NOT NULL,
            active TINYINT DEFAULT 1,
            FOREIGN KEY (product_id) REFERENCES productos(id)
        )
    ''')

    # Tabla de pedidos
    c.execute('''
        CREATE TABLE IF NOT EXISTS pedidos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) NOT NULL,
            discount FLOAT,
            total_price FLOAT,
            down_payment FLOAT,
            balance_due FLOAT,
            start_date DATE,
            delivery_date DATE,
            delivery_method VARCHAR(255),
            department VARCHAR(255),
            address VARCHAR(255),
            carnet VARCHAR(50),
            branch VARCHAR(255),
            payment_method VARCHAR(50),
            completed TINYINT
        )
    ''')

    # Tabla de productos por pedido
    c.execute('''
        CREATE TABLE IF NOT EXISTS pedido_productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price FLOAT NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES productos(id)
        )
    ''')

    # Tabla de extras por producto en pedido
    c.execute('''
        CREATE TABLE IF NOT EXISTS pedido_extras (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_producto_id INT NOT NULL,
            extra_id INT NOT NULL,
            quantity INT NOT NULL,
            price FLOAT NOT NULL,
            FOREIGN KEY (pedido_producto_id) REFERENCES pedido_productos(id) ON DELETE CASCADE,
            FOREIGN KEY (extra_id) REFERENCES extras(id)
        )
    ''')

    # Tabla de pedidos completados
    c.execute('''
        CREATE TABLE IF NOT EXISTS pedidos_completados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) NOT NULL,
            discount FLOAT,
            total_price FLOAT,
            down_payment FLOAT,
            balance_due FLOAT,
            start_date DATE,
            delivery_date DATE,
            delivery_method VARCHAR(255),
            department VARCHAR(255),
            address VARCHAR(255),
            carnet VARCHAR(50),
            branch VARCHAR(255),
            payment_method VARCHAR(50),
            pedido_id INT UNIQUE NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
        )
    ''')

    # Tabla de stock
    c.execute('''
        CREATE TABLE IF NOT EXISTS stock (
            producto_id INT PRIMARY KEY,
            cantidad_disponible INT NOT NULL,
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        )
    ''')

    # Tabla de ventas
    c.execute('''
        CREATE TABLE IF NOT EXISTS ventas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            total_price FLOAT NOT NULL,
            sale_date DATE NOT NULL,
            payment_method VARCHAR(50) NOT NULL
        )
    ''')

    # Crear la nueva tabla de productos por venta
    c.execute('''
        CREATE TABLE IF NOT EXISTS venta_productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venta_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price FLOAT NOT NULL,
            FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES productos(id)
        )
    ''')

    # Tabla de usuarios
    c.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL
        )
    ''')

    conn.commit()
    conn.close()

############# STOCK ##############
def get_stock():
    conn = get_mysql_connection()
    c = conn.cursor()
    
    c.execute('''
        SELECT p.id, p.name, s.cantidad_disponible
        FROM productos p
        LEFT JOIN stock s ON p.id = s.producto_id
    ''')
    rows = c.fetchall()
    
    stock = [{'id': row[0], 'name': row[1], 'quantity': row[2] if row[2] is not None else 0} for row in rows]
    
    conn.close()
    return stock
############## FIN STOCK###########
#########USUARIOS AUTENTICACION
from werkzeug.security import generate_password_hash, check_password_hash


def agregar_usuario(username, password, role):
    conn = get_mysql_connection()
    cursor = conn.cursor()
    password_hash = generate_password_hash(password)
    try:
        cursor.execute('''
            INSERT INTO usuarios (username, password, role)
            VALUES (%s, %s, %s)
        ''', (username, password_hash, role))
        conn.commit()
    except mysql.connector.IntegrityError:
        conn.close()
        return False
    conn.close()
    return True

def autenticar_usuario(username, password):
    conn = get_mysql_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT password, role FROM usuarios WHERE username = %s
    ''', (username,))
    result = cursor.fetchone()
    conn.close()
    if result and check_password_hash(result[0], password):
        return result[1]  # Devuelve el rol del usuario si la autenticación es exitosa
    return None

def existe_administrador():
    conn = get_mysql_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT COUNT(*) FROM usuarios WHERE role = 'admin'
    ''')
    result = cursor.fetchone()[0]
    conn.close()
    return result > 0

def obtener_usuarios():
    conn = get_mysql_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT username, role FROM usuarios WHERE role != "admin"')
    users = cursor.fetchall()
    conn.close()
    return [{'username': user[0], 'role': user[1]} for user in users]
def eliminar_usuario_db(username):
    conn = get_mysql_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('DELETE FROM usuarios WHERE username = %s', (username,))
        conn.commit()
        conn.close()
        return True
    except mysql.connector.Error:
        conn.close()
        return False

###############################


create_tables()