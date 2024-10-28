// 获取模型输出
async function fetchModelOutput(prompt, question) {
    try {
        const requestBody = {
            prompt: prompt,
            question: question
        };

        const response = await fetch('http://183.237.186.230:19902/get_model_output', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.model_output; // 确保这里返回的是 model_output 字段
    } catch (error) {
        console.error("获取模型输出时出错:", error);
        return null; // 处理错误
    }
}

// 执行查询的函数
async function executeQuery(database, table, sqlQuery) {
    try {
        const response = await fetch('http://183.237.186.230:19902/execute_query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                database: database,
                table_name: table,
                sql_query: sqlQuery // 使用生成的 SQL 语句
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.result; // 返回查询结果
    } catch (error) {
        console.error("执行查询时出错:", error);
        alert("执行查询时出错: " + error.message);
        return null; // 处理错误
    }
}

// 生成提示词
async function generatePrompt() {
    if (!currentDatabase || !currentTable) {
        alert("请先选择数据库和表！");
        return "";
    }

    // 获取表的字段信息
    const tableDetails = await fetchTableDetails(currentDatabase, currentTable); // 获取表的详细信息
    let prompt = `表名: ${currentTable}：字段名: ${tableDetails};\n`; // 这里需要根据实际字段信息来构建

    return prompt;
}
