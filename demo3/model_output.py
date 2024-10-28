from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import requests
from tortoise import Tortoise
from datetime import datetime, date
from tortoise.transactions import in_transaction
import pandas as pd
import uuid
from io import StringIO
from typing import List, Dict, Any

# 实现流程见readme
# 接口详见
# 服务器ip：
#

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 前端文件加载
# 加载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

# 用于存储当前连接的数据库名称
current_database: str = None

# 存储模型输出的历史记录，用于上下文读取
model_outputs: List[str] = []


#初始化连接
async def init_db(database: str):
    """初始化数据库连接"""
    global current_database
    if current_database != database:
        current_database = database
        await Tortoise.init(
            db_url=f"mysql://root:/{database}",  # 连接堡垒机内数据库
            modules={"models": ["__main__"]}  # 使用当前模块
        )
        await Tortoise.generate_schemas()  # 生成模式


async def get_databases() -> List[str]:
    """获取数据库列表"""
    try:
        connection = Tortoise.get_connection("default")
        result = await connection.execute_query("SHOW DATABASES;")
        # 屏蔽了系统表，如果有其他需要屏蔽的可以在此修改
        databases = [db['Database'] for db in result[1] if
                     db['Database'] not in ['information_schema', 'mysql', 'performance_schema']] #

        return databases
    except Exception as e:
        print(f"获取数据库失败: {str(e)}")
        return []


async def get_tables() -> List[str]:
    """获取当前数据库的所有表名"""
    connection = Tortoise.get_connection("default")
    result = await connection.execute_query("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = %s",
                                            [current_database])
    return [row['TABLE_NAME'] for row in result[1]]  # 取第二个元素的表名


@app.on_event("startup")
async def startup_event():
    await init_db("MCDC")  # 默认连接


@app.on_event("shutdown")
async def shutdown_event():
    await Tortoise.close_connections()


# 接口1：获取数据库列表
@app.post('/get_databases')
async def get_databases_route():
    """获取数据库列表的接口"""
    databases = await get_databases()
    return JSONResponse(content={"databases": databases})


# 接口2：获取数据库中的表
# 用户可以依次选择：数据库、表，并且该过程是必须的，否则模型无法定位

@app.post('/get_tables')
async def get_tables_route(request: Request):
    """获取指定数据库中的所有表名"""
    data = await request.json()
    database = data.get('database')

    if not database:
        raise HTTPException(status_code=400, detail="未提供数据库名称")

    await init_db(database)  # 确保连接到所请求的数据库

    try:
        tables = await get_tables()  # 获取当前数据库的所有表名
        return JSONResponse(content={"database": database, "tables": tables})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取表名时出错: {str(e)}")


# 表内查询获取备注和字段名
async def get_column_names(table_name: str) -> List[Dict[str, str]]:
    """获取指定表的字段名、数据类型和注释"""
    connection = Tortoise.get_connection("default")
    try:
        result = await connection.execute_query(
            f"SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT FROM information_schema.columns WHERE table_name = '{table_name}' AND table_schema = '{current_database}'"
        )

        return [
            {
                "column_name": row['COLUMN_NAME'],
                "data_type": row['DATA_TYPE'],
                "comment": row['COLUMN_COMMENT']  # 获取字段的注释
            }
            for row in result[1]  # 确保获取结果的正确部分
        ]
    except Exception as e:
        print(f"Error efetching columns for tabl {table_name}: {str(e)}")
        return []

# 接口3，在选择好数据库、表的基础上获取表的字段名、备注
@app.post('/get_database_details')
async def get_database_details_route(request: Request):
    """获取指定数据库的表和字段信息"""
    data = await request.json()
    database = data.get('database')
    table_names = data.get('table_names')

    if not database:
        raise HTTPException(status_code=400, detail="未提供数据库名称")

    if not table_names or not isinstance(table_names, list):
        raise HTTPException(status_code=400, detail="未提供有效的表名")

    await init_db(database)

    try:
        table_info = {}
        for table_name in table_names:
            columns = await get_column_names(table_name)
            column_info = [
                f"{column['column_name']}({column['data_type']}) - 注释: {column['comment']}"
                for column in columns
            ]
            table_info[table_name] = column_info

            # 构建提示词，包含数据库、表名、字段名和字段注释
            prompt = f"数据库: {database}；表名: {table_name}；字段信息: "
            prompt += ', '.join(
                [f"{column['column_name']}({column['data_type']}) - 注释: {column['comment']}" for column in columns])

            # 这里可以调用大模型的API，将prompt传入
            # model_output = await call_large_model_api(prompt)

        return JSONResponse(content={"database": database, "table_info": table_info})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取数据库详情时出错: {str(e)}")


async def init_db(database: str):
    """初始化数据库连接"""
    global current_database
    if current_database != database:
        current_database = database
        await Tortoise.init(
            db_url=f"mysql://root:Grg@test0806^@localhost:3306/{database}",
            modules={"models": ["__main__"]}  # 使用当前模块
        )
        await Tortoise.generate_schemas()  # 生成模式


# 接口4，传入用户输入、提示词，获取模型输出

@app.post('/get_model_output')
async def get_model_output_route(request: Request):
    """获取模型输出的接口"""
    data = await request.json()
    prompt = data.get('prompt')
    question = data.get('question')

    if not prompt or not question:
        raise HTTPException(status_code=400, detail="未提供提示词或用户问题")

    # 构建上下文：将之前的模型输出作为上下文传递
    context = "\n".join(model_outputs[-5:])  # 获取最近的5条模型输出作为上下文
    combined_prompt = f"{context}\n{prompt} 用户提问: {question}"

    model_output = await get_model_output_from_api(combined_prompt)  # 只传递 combined_prompt

    # 存储模型输出
    model_outputs.append(model_output)

    return JSONResponse(content={"model_output": model_output})

# api请求
async def get_model_output_from_api(prompt: str) -> str:
    """调用外部 API 获取模型输出"""
    url = ''
    headers = {
        'Authorization': '',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json={
                "params": {
                    "serviceId": "",
                    "stream": "true",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            },
            timeout=60
        )

        if response.status_code == 200:
            final_answer = []

            # 匹配规则
            for line in response.iter_lines(decode_unicode=True):
                decoded_line = line.strip()
                if decoded_line and decoded_line != 'data:""' and decoded_line != '\\ndata:""':
                    cleaned_line = decoded_line.replace(
                        'data:"data: {\\"step\\": \\"output\\", \\"tool_name\\": \\"document_outline_writer\\", \\"tool_input\\": \\"\\", \\"output\\": \\"',
                        ''
                    ).replace('\\"}"', '')

                    # 进一步清理，去掉多余的转义字符
                    cleaned_line = cleaned_line.replace('\\"', '')  # 去除多余的转义字符
                    cleaned_line = cleaned_line.replace('\\\\n', '\n')  # 将\\n替换为换行符
                    final_answer.append(cleaned_line)

            return ''.join(final_answer)
        else:
            raise HTTPException(status_code=response.status_code, detail="模型服务请求失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型输出时出错: {str(e)}")

# 接口5，获取模型输出
@app.post('/execute_query')
async def execute_query_route(request: Request):
    """执行 SQL 查询的接口"""
    data = await request.json()
    database = data.get('database')
    table_name = data.get('table_name')  # 新增表名参数
    sql_query = data.get('sql_query')

    if not database or not table_name or not sql_query:
        raise HTTPException(status_code=400, detail="未提供数据库名称、表名或 SQL 查询")

    await init_db(database)  # 连接到指定的数据库

    try:
        connection = Tortoise.get_connection("default")
        result = await connection.execute_query(sql_query)

        # 将结果中的 datetime 对象转换为字符串
        result_serializable = []
        for row in result[1]:  # 假设 result[1] 是包含结果的列表
            serializable_row = {}
            for key, value in row.items():
                if isinstance(value, datetime):
                    serializable_row[key] = value.isoformat()  # 转换为 ISO 格式字符串
                elif isinstance(value, date):  # 如果是 date 对象
                    serializable_row[key] = value.isoformat()  # 转换为 ISO 格式字符串
                else:
                    serializable_row[key] = value
            result_serializable.append(serializable_row)

        return JSONResponse(content={"result": result_serializable})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"执行查询时出错: {str(e)}")


@app.post('/upload_csv')
async def upload_csv(file: UploadFile = File(...), encoding: str = "utf-8", database: str = Form(...)):
    """处理 CSV 文件上传并解析内容"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="文件格式错误，仅支持 CSV 文件")

    contents = await file.read()
    try:
        # 使用指定编码解析 CSV 文件
        if encoding == "gbk":
            df = pd.read_csv(StringIO(contents.decode('gbk')))
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))

        # 获取字段名和类型
        columns = df.columns.tolist()

        # 更精确的类型推断
        column_types = []
        for dtype in df.dtypes:
            if pd.api.types.is_integer_dtype(dtype):
                column_types.append('INT')
            elif pd.api.types.is_float_dtype(dtype):
                column_types.append('FLOAT')
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                column_types.append('DATETIME')
            else:
                column_types.append('VARCHAR(255)')

        # 生成唯一的表名（使用 UUID）
        table_name = f"{file.filename[:-4]}_{uuid.uuid4().hex}"

        # 创建表的 SQL 查询
        create_table_query = f"CREATE TABLE IF NOT EXISTS {table_name} (" + ", ".join(
            f"{col} {col_type}" for col, col_type in zip(columns, column_types)
        ) + ");"

        # 初始化数据库连接
        await init_db(database)  # 确保连接到所请求的数据库

        async with in_transaction("default") as connection:
            # 执行创建表查询
            await connection.execute_query(create_table_query)

            # 插入数据
            for item in df.to_dict(orient='records'):
                columns = ', '.join(item.keys())
                placeholders = ', '.join(['%s'] * len(item))
                sql_query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
                await connection.execute_query(sql_query, list(item.values()))

        return JSONResponse(content={"message": f"数据成功导入数据库到表 {table_name}"})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析 CSV 文件时出错: {str(e)}")
@app.get("/", response_class=HTMLResponse)
async def read_root():
    """根路由，返回 HTML 页面"""
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

# 启动服务器
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="debug")
