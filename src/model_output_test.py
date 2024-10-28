from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
import requests
import re
from tortoise import Tortoise, fields
from tortoise.models import Model

app = FastAPI()

# 数据库模型示例
class Column(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)

# 用于记录用户输入的列表
user_inputs = []

async def init(db_name=None):
    await Tortoise.init(
        db_url=f"mysql://root:Grg_123456@172.29.3.11:3306/{db_name if db_name else 'aids_info'}",
        modules={"models": ["__main__"]}
    )
    await Tortoise.generate_schemas()

async def close():
    await Tortoise.close_connections()

@app.on_event("startup")
async def startup_event():
    await init()

@app.on_event("shutdown")
async def shutdown_event():
    await close()

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

async def get_tables(database):
    try:
        await Tortoise.init(
            db_url=f"mysql://root:Grg_123456@172.29.3.11:3306/{database}",
            modules={"models": ["__main__"]}
        )
        tables = await Tortoise.get_connection("default").execute_query("SHOW TABLES;")
        return [table[0] for table in tables]
    except Exception as e:
        print(f"获取表名失败: {str(e)}")
        return []

async def get_column_names(table_name):
    try:
        columns = await Tortoise.get_connection("default").execute_query(f"SHOW COLUMNS FROM {table_name}")
        return [column[0] for column in columns]
    except Exception as e:
        print(f"获取字段名失败: {str(e)}")
        return []

def get_model_output(content: str, column_names: str):
    url = 'http://maas.aipcc-gz.com/api/v1/appAssistant/completions'
    headers = {
        'Authorization': 'Bearer a66ae539fbd366d09ad3fe28c14ae0bd',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json={
                "params": {
                    "serviceId": "1823889696548196352",
                    "stream": "true",
                    "messages": [
                        {"role": "user", "content": f"content: {content}, column_names: {column_names}"}
                    ]
                }
            },
            timeout=60
        )

        if response.status_code == 200:
            final_answer = []

            # 逐行读取响应内容
            for line in response.iter_lines(decode_unicode=True):
                decoded_line = line.strip()
                if decoded_line and decoded_line != 'data:""' and decoded_line != '\\ndata:""':
                    cleaned_line = decoded_line.replace(
                        'data:"data: {\\"step\\": \\"output\\", \\"tool_name\\": \\"document_outline_writer\\", \\"tool_input\\": \\"\\", \\"output\\": \\"',
                        ''
                    ).replace('\\"}"', '')
                    final_answer.append(cleaned_line)

            # 拼接最终输出
            final_output = ''.join(final_answer)
            return final_output
        else:
            raise HTTPException(status_code=response.status_code, detail="模型服务请求失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型输出时出错: {str(e)}")

@app.post('/get_databases')
async def get_databases_route():
    try:
        connection = Tortoise.get_connection("default")
        databases = await connection.execute_query("SHOW DATABASES;")
        db_list = [db[0] for db in databases]  # 提取数据库名称
        return JSONResponse(content={"databases": db_list})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/get_tables')
async def get_tables_route(request: Request):
    data = await request.json()
    database = data.get('database')

    if not database:
        raise HTTPException(status_code=400, detail="未提供数据库名称")

    tables = await get_tables(database)
    return JSONResponse(content={"tables": tables})

@app.post('/get_column_names')
async def get_column_names_route(request: Request):
    data = await request.json()
    table_names = data.get('tables', [])

    if not table_names:
        raise HTTPException(status_code=400, detail="未提供表名称")

    column_names_dict = {}
    for table_name in table_names:
        column_names = await get_column_names(table_name)
        column_names_dict[table_name] = column_names

    return JSONResponse(content={"column_names": column_names_dict})

@app.post('/execute_query')
async def execute_query_route(request: Request):
    data = await request.json()
    database = data.get('database')  # 数据库名称
    table_names = data.get('tables', [])  # 表名称
    question = data.get('question')

    if not database or not table_names or not question:
        raise HTTPException(status_code=400, detail="未提供数据库、表或问题")

    # 连接到指定的数据库
    await Tortoise.init(
        db_url=f"mysql://root:Grg_123456@172.29.3.11:3306/{database}",
        modules={"models": ["__main__"]}
    )

    # 获取所有字段名
    all_column_names = []
    for table_name in table_names:
        columns = await get_column_names(table_name)
        if columns:
            all_column_names.extend(columns)

    # 将字段名传给模型
    sql_query = get_model_output(question, ', '.join(all_column_names))

    # 执行查询并返回结果
    try:
        result = await Tortoise.get_connection("default").execute_query(sql_query)
        if result is None:
            raise HTTPException(status_code=500, detail="查询执行失败")
        return JSONResponse(content={"result": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"执行查询时出错: {str(e)}")

@app.post('/get_model_output')
async def get_model_output_route(request: Request):
    data = await request.json()
    content = data.get('content', '查询:cure_library表医疗付费方式为7的序号')
    column_names = data.get('column_names', '')  # 可以从请求中获取字段名

    # 调用模型输出，传递内容和字段名（如果有）
    model_output = get_model_output(content, column_names)

    if model_output:
        return JSONResponse(content={"message": model_output})
    else:
        raise HTTPException(status_code=500, detail="未能获取大模型输出")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, port=8000, log_level="debug")


