import mysql.connector

def test_month_filter_correct():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="javax2",
            password="77754abel867",
            database="administracionWY"
        )
        c = conn.cursor()
        month_start = '2024-06-01'
        month_end = '2024-06-30'
        query = '''
            SELECT DATE(sale_date) AS sale_date, SUM(total_price), payment_method
            FROM ventas
            WHERE sale_date BETWEEN %s AND %s
            GROUP BY sale_date, payment_method
        '''
        print(f"Executing query: {query} with params: {month_start}, {month_end}")
        c.execute(query, (month_start, month_end))
        result = c.fetchall()
        print("Month Filter Query Correct Result:", result)
        for row in result:
            print(f"Row: {row}")
        c.close()
        conn.close()
    except mysql.connector.Error as err:
        print(f"Error: {err}")

test_month_filter_correct()
