from tortoise import Tortoise, fields
from tortoise.models import Model
import re

# 数据库模型示例
class Column(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)

async def init(db_name=None):
    await Tortoise.init(
        db_url=f"mysql://root:Grg_123456@172.29.3.11:3306/{db_name if db_name else 'aids_info'}",
        modules={"models": ["__main__"]}
    )
    await Tortoise.generate_schemas()

async def close():
    await Tortoise.close_connections()

async def get_column_names(table_name):
    try:
        columns = await Tortoise._get_connection("default").execute_query(f"SHOW COLUMNS FROM {table_name}")
        column_names = [column[0] for column in columns]
        return column_names
    except Exception as e:
        print(f"获取字段名失败: {str(e)}")
        return None

async def execute_query(query):
    try:
        connection = Tortoise.get_connection("default")
        result = await connection.execute_query(query)
        return result
    except Exception as e:
        print(f"执行查询失败: {str(e)}")
        return None

def search_table_name(content):
    match = re.search(r'：(.*?)表', content)
    if match:
        return match.group(1)
    return None

# 初始化数据库连接示例
async def main():
    await init()
    # 其他逻辑...
    await close()

# 如果需要运行
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
