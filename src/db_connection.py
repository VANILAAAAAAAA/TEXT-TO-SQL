import aiomysql
import asyncio
import re
async def create_connection(db_name=None):
    try:
        connection = await aiomysql.connect(
            host='172.29.3.11',
            port=3306,
            user='root',
            password='Grg_123456',
            db=db_name if db_name else 'aids_info',
            loop=asyncio.get_event_loop()
        )
        return connection
    except Exception as e:
        print(f"数据库连接失败: {str(e)}")
        return None

async def execute_query(connection, query):
    try:
        async with connection.cursor() as cursor:
            await cursor.execute(query)
            result = await cursor.fetchall()
            await connection.commit()
            return result
    except Exception as e:
        print(f"执行查询失败: {str(e)}")
        return None

async def close_connection(connection):
    try:
        connection.close()
    except Exception as e:
        print(f"关闭连接失败: {str(e)}")

async def get_column_names(connection, table_name):
    try:
        async with connection.cursor() as cursor:
            await cursor.execute(f"SHOW COLUMNS FROM {table_name}")
            columns = await cursor.fetchall()
            column_names = [column[0] for column in columns]
            return column_names
    except Exception as e:
        print(f"获取字段名失败: {str(e)}")
        return None

def search_table_name(content):
    # 使用正则表达式匹配冒号到“表”之间的内容
    match = re.search(r'：(.*?)表', content)
    if match:
        return match.group(1)
    return None