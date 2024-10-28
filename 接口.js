//
// 1. 获取连接中的数据库 /get_databases
// 请求方法: POST
//
// 请求体
// json
// {}
// 参数: 无
// 响应体
// json
// {
//     "databases": [
//         "db1",
//         "db2",
//         "db3"
//     ]
// }
// 2. 获取数据库的具体信息 /get_database_details
// 请求方法: POST
//
// 请求体
// json
// {
//     "database": "db1"
// }
// 参数:
// database: str - 用户选择的数据库名称。
// 响应体
// json
// {
//     "database": "db1",
//     "table_info": "表名: users, 字段: id, name, age\n表名: orders, 字段: order_id, user_id, product_id"
// }
// 参数:
// database: str - 所选数据库名称。
// table_info: str - 格式化的表和字段信息。
// 3. 获取大模型输出 /get_model_output
// 请求方法: POST
//
// 请求体
// json
// {
//     "prompt": "数据库: db1, 表: users, orders, 字段: id, name, age, order_id, user_id, product_id",
//     "question": "请给我所有用户的姓名和年龄。"
// }
// 参数:
// prompt: str - 数据库、表和字段的信息。
// question: str - 用户自然语言问题。
// 响应体
// json
// {
//     "model_output": "SELECT name, age FROM users;"
// }
// 参数:
// model_output: str - 大模型生成的 SQL 查询语句。
// 4. 获取最终结果 /execute_query
// 请求方法: POST
//
// 请求体
// json
// {
//     "database": "db1",
//     "sql_query": "SELECT name, age FROM users;"
// }
// 参数:
// database: str - 用户选择的数据库名称。
// sql_query: str - 要执行的 SQL 查询语句。
// 响应体
// json
// {
//     "result": [
//         {"name": "Alice", "age": 30},
//         {"name": "Bob", "age": 25}
//     ]
// }
// 参数:
// result: List[Dict[str, Any]] - 查询结果的列表，每个元素是一个字典，表示一行数据。
// 5. 获取历史输入 /get_user_inputs
// 请求方法: GET
//
// 请求体
// json
// {}
// 参数: 无
// 响应体
// json
// {
//     "user_inputs": [
//         {"prompt": "数据库: db1, 表: users, orders, 字段: id, name, age, order_id, user_id, product_id", "question": "请给我所有用户的姓名和年龄。", "model_output": "SELECT name, age FROM users;"},
//         {"prompt": "数据库: db1, 表: products, 字段: product_id, product_name", "question": "查询所有产品。", "model_output": "SELECT * FROM products;"}
//     ]
// }
// 参数:
// user_inputs: List[Dict[str, Any]] - 用户输入的历史记录列表，每个记录包含提示词、问题和模型输出。
