let currentDatabase = null; // 用于存储当前选择的数据库
let currentTable = null; // 用于存储当前选择的表

window.onload = async function () {
    await fetchDatabases(); // 获取数据库列表

    let sendButton = document.getElementById('askModelButton');
    let userInput = document.getElementById('userQuestion');
    let chatMessage = document.getElementById('chat-message');

    function displayMessage(message, isUser = true) {
        const messageDiv = document.createElement('div');
        messageDiv.style.padding = '10px 15px';
        messageDiv.style.borderRadius = '10px';
        messageDiv.style.opacity = '0.9';
        messageDiv.style.maxWidth = '70%';
        messageDiv.style.marginBottom = '10px';
        messageDiv.style.display = 'inline-block';
        messageDiv.style.wordWrap = 'break-word';

        if (isUser) {
            messageDiv.style.backgroundColor = '#7ae1b6';
            messageDiv.style.marginLeft = 'auto';
            messageDiv.style.textAlign = 'right';
        } else {
            messageDiv.style.backgroundColor = '#d1e7dd';
            messageDiv.style.marginRight = 'auto';
            messageDiv.style.textAlign = 'left';
        }

        messageDiv.innerText = message;

        const messageContainer = document.createElement('div');
        messageContainer.style.display = 'flex';
        messageContainer.style.justifyContent = isUser ? 'flex-end' : 'flex-start';
        messageContainer.appendChild(messageDiv);

        chatMessage.appendChild(messageContainer);
        chatMessage.scrollTop = chatMessage.scrollHeight;
    }


    sendButton.addEventListener('click', async function () {
        const message = userInput.value.trim();
        if (message) {
            displayMessage(message, true); // 显示用户消息
            userInput.value = '';

            // 隐藏推荐问题区域
            document.getElementById('recommendations').style.display = 'none';

            // 扩大聊天区域
            document.getElementById('chatContainer').style.flex = '1'; // 让聊天区域占据更多空间

            // 生成提示词
            const prompt = await generatePrompt(); // 获取表信息提示词

            // 确保 prompt 不为空
            if (prompt) {
                // 调用获取模型输出的函数
                const modelOutput = await fetchModelOutput(prompt, message); // 获取模型输出

                if (modelOutput) {
                    displayMessage(modelOutput, false); // 显示模型输出

                    // 执行查询并显示结果
                    const queryResult = await executeQuery(currentDatabase, currentTable, modelOutput);
                    if (queryResult) {
                        // 创建气泡容器
                        const resultContainer = document.createElement('div');
                        resultContainer.style.position = 'relative'; // 设置相对定位以便绝对定位内部元素
                        resultContainer.style.padding = '10px 15px';
                        resultContainer.style.borderRadius = '10px';
                        resultContainer.style.backgroundColor = '#d1e7dd'; // 设置气泡背景颜色
                        resultContainer.style.marginBottom = '10px';
                        resultContainer.style.display = 'inline-block';
                        resultContainer.style.maxWidth = '80%'; // 限制气泡最大宽度为 90%
                        resultContainer.style.wordWrap = 'break-word';

                        // 创建一个容器来包裹表格和按钮
                        const contentWrapper = document.createElement('div');
                        contentWrapper.style.display = 'flex';
                        contentWrapper.style.flexDirection = 'column'; // 垂直排列
                        contentWrapper.style.alignItems = 'flex-start'; // 左对齐

                        // 创建一个容器来包裹表格以启用滚动
                        const tableWrapper = document.createElement('div');
                        tableWrapper.style.overflowX = 'auto'; // 启用水平滚动
                        tableWrapper.style.overflowY = 'hidden'; // 隐藏垂直滚动
                        tableWrapper.style.width = '100%'; // 让包裹容器宽度为 100%

                        // 创建表格
                        const resultTable = document.createElement('table');
                        resultTable.style.width = 'auto'; // 表格宽度自适应
                        resultTable.style.borderCollapse = 'collapse'; // 合并边框
                        resultTable.style.backgroundColor = '#f9f9f9'; // 设置表格背景颜色为浅灰色
                        resultTable.style.tableLayout = 'auto'; // 自适应列宽

                        // 动态生成表头
                        const headers = Object.keys(queryResult[0]); // 获取第一行的键作为表头
                        const headerRow = document.createElement('tr');
                        headers.forEach(header => {
                            const th = document.createElement('th');
                            th.innerText = header; // 设置表头文本
                            th.style.border = '1px solid #ddd'; // 设置边框
                            th.style.padding = '8px'; // 设置内边距
                            th.style.backgroundColor = '#f2f2f2'; // 表头背景颜色
                            headerRow.appendChild(th);
                        });
                        resultTable.appendChild(headerRow); // 添加表头到表格

                        // 动态生成表格行
                        queryResult.forEach(row => {
                            const rowElement = document.createElement('tr');
                            headers.forEach(header => {
                                const cell = document.createElement('td');
                                cell.innerText = row[header] !== undefined ? row[header] : ''; // 填充单元格，处理未定义情况
                                cell.style.border = '1px solid #ddd'; // 设置边框
                                cell.style.padding = '8px'; // 设置内边距
                                rowElement.appendChild(cell);
                            });
                            resultTable.appendChild(rowElement); // 添加行到表格
                        });

                        // 将表格添加到包裹容器中
                        tableWrapper.appendChild(resultTable);
                        contentWrapper.appendChild(tableWrapper); // 将表格添加到内容包裹器中

                        // 创建保存按钮
                        const saveButton = document.createElement('button');
                        saveButton.innerText = '保存为 CSV';
                        saveButton.style.marginTop = '10px'; // 设置按钮与表格的间距
                        saveButton.style.backgroundColor = '#555'; // 深灰色背景
                        saveButton.style.color = '#fff'; // 白色文本
                        saveButton.style.border = 'none'; // 去掉边框
                        saveButton.style.padding = '5px 10px'; // 设置内边距
                        saveButton.style.borderRadius = '5px'; // 圆角
                        saveButton.style.cursor = 'pointer'; // 鼠标悬停时显示为手型
                        saveButton.onclick = function () {
                            // 获取表格数据
                            const table = resultTable; // 使用当前生成的表格
                            let csv = [];

                            // 获取表头
                            const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText);
                            csv.push(headers.join(',')); // 将表头加入 CSV

                            // 获取表格行
                            const rows = table.querySelectorAll('tr');
                            rows.forEach(row => {
                                const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText);
                                if (cells.length > 0) { // 只保存有数据的行
                                    csv.push(cells.join(',')); // 将每行数据加入 CSV
                                }
                            });

                            // 添加 BOM
                            const csvContent = '\ufeff' + csv.join('\n'); // 在开头添加 BOM

                            // 创建 CSV 文件并下载
                            const csvFile = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            const url = URL.createObjectURL(csvFile);
                            link.setAttribute('href', url);
                            link.setAttribute('download', 'table_data.csv'); // 设置下载文件名
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link); // 下载后移除链接
                        };

                        contentWrapper.appendChild(saveButton); // 将保存按钮添加到内容包裹器中
                        resultContainer.appendChild(contentWrapper); // 将内容包裹器添加到气泡容器中

                        // 将气泡容器添加到聊天消息中
                        const messageContainer = document.createElement('div');
                        messageContainer.style.display = 'flex';
                        messageContainer.style.justifyContent = 'flex-start'; // 对齐方式
                        messageContainer.appendChild(resultContainer);
                        chatMessage.appendChild(messageContainer);
                        chatMessage.scrollTop = chatMessage.scrollHeight; // 滚动到最新消息
                    } else {
                        alert("未找到任何结果。");
                    }


                } else {
                    displayMessage("获取模型输出失败，请重试。", false);
                }
            } else {
                displayMessage("生成提示词失败，请确保已选择数据库和表。", false);
            }
        } else {
            alert("请输入问题。");
        }
    });

        userInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                // Shift + Enter 换行
                userInput.value += '\n'; // 在输入框中添加换行
                event.preventDefault(); // 阻止默认行为
            } else {
                // 仅 Enter 发送消息
                sendButton.click(); // 触发发送按钮的点击事件
                event.preventDefault(); // 阻止默认行为
            }
        }
    });


};

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

// 获取模型输出
async function fetchModelOutput(prompt, question) {
    try {
        const requestBody = {
            prompt: prompt,
            question: question
        };

        // 打印请求体以供调试
        console.log("请求体:", JSON.stringify(requestBody, null, 2));

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
        console.log("返回数据:", data); // 打印返回的数据
        return data.model_output; // 确保这里返回的是 model_output 字段
    } catch (error) {
        console.error("获取模型输出时出错:", error); // 更详细的错误信息
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

// 获取数据库列表
async function fetchDatabases() {
    try {
        const response = await fetch('http://183.237.186.230:19902/get_databases', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const databaseDropdown = document.getElementById('databaseDropdown');
        databaseDropdown.innerHTML = ''; // 清空之前的选项

        // 填充数据库下拉列表
        if (data.databases.length > 0) {
            const firstDatabase = data.databases[0];
            currentDatabase = firstDatabase; // 设置当前数据库为第一个数据库
            const databaseButton = document.querySelector('.dropdown-container .dropbtn');
            databaseButton.innerText = firstDatabase; // 设置按钮文本为第一个数据库
        }

        data.databases.forEach(db => {
            const dbDiv = document.createElement('div');
            dbDiv.innerHTML = `<strong>${db}</strong>`;
            dbDiv.style.cursor = 'pointer';
            dbDiv.onclick = function () {
                currentDatabase = db; // 更新当前数据库
                const databaseButton = document.querySelector('.dropdown-container .dropbtn');
                databaseButton.innerText = db; // 更新按钮文本为选中的数据库名称
                fetchTables(db); // 获取表并显示
                // 不关闭数据库菜单
            };
            databaseDropdown.appendChild(dbDiv);
        });
    } catch (error) {
        alert('获取数据库列表时出错: ' + error.message);
    }
}

// 获取表列表
async function fetchTables(database) {
    try {
        const response = await fetch('http://183.237.186.230:19902/get_tables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({database: database})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const tableDropdown = document.getElementById('tableDropdown');
        tableDropdown.innerHTML = ''; // 清空之前的内容

        data.tables.forEach(table => {
            const tableDiv = document.createElement('div');
            tableDiv.innerHTML = `<a href="#" onclick="selectTable('${database}', '${table}');">${table}</a>`;
            tableDropdown.appendChild(tableDiv);
        });

        // 显示表菜单
        toggleDropdown('tableDropdown'); // 立即显示表下拉菜单
    } catch (error) {
        alert('获取表列表时出错: ' + error.message);
    }
}

// 选择表
function selectTable(database, table) {
    currentTable = table; // 更新当前选择的表
    const tableButton = document.getElementById('tableButton');
    tableButton.innerText = `${database}: ${table}`;
    tableButton.style.display = 'inline-block'; // 显示表按钮
    tableButton.style.width = 'auto'; // 自适应宽度

    // 关闭所有下拉菜单
    closeDropdowns();
}

// 显示所选数据库和表名
const selectedInfoContainer = document.getElementById('selectedInfo');



// 打开表详情模态框
function openDetailsModal() {
    if (!currentDatabase || !currentTable) {
        alert("请先选择数据库和表！");
        return;
    }

    // 调用 fetchTableDetails 获取表的详细信息
    fetchTableDetails(currentDatabase, currentTable).then(fieldInfo => {
        if (fieldInfo) {
            // 获取表格主体并填充字段信息
            const detailsBody = document.getElementById('detailsBody');
            detailsBody.innerHTML = fieldInfo; // 将字段信息填充到模态框中

            // 显示模态框
            document.getElementById('detailsModal').style.display = 'flex';
        }
    }).catch(error => {
        console.error("获取表详情时出错:", error);
        alert("获取表详情时出错: " + error.message);
    });
}

// 获取表的详细信息
async function fetchTableDetails(database, table) {
    try {
        const response = await fetch('http://183.237.186.230:19902/get_database_details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                database: database,
                table_names: [table] // 传递表名
            })
        });

        if (!response.ok) {
            throw new Error('无法获取表详情');
        }

        const data = await response.json();

        // 检查返回的数据结构
        if (data.table_info && data.table_info[table]) {
            const columns = data.table_info[table]; // 获取特定表的字段信息

            // 拼接字段信息为表格行字符串
            const fieldInfo = columns.map(column => {
                const columnParts = column.split(' - 注释: '); // 分割字段信息
                const fieldTypeParts = columnParts[0].split('('); // 分割字段名和数据类型

                // 确保字段名、数据类型和注释正确处理
                const fieldName = fieldTypeParts[0].trim();
                const dataType = fieldTypeParts[1] ? fieldTypeParts[1].replace(')', '').trim() : '';
                const comment = columnParts[1] ? columnParts[1].trim() : '';

                return `<tr>
                    <td>${fieldName}</td>
                    <td>${dataType}</td>
                    <td>${comment}</td>
                </tr>`; // 返回表格行
            }).join(''); // 用空字符串连接

            return fieldInfo; // 返回字段信息字符串
        } else {
            throw new Error('没有找到表的详细信息。');
        }
    } catch (error) {
        console.error(error);
        alert("获取表详情时出错: " + error.message);
        return null; // 处理错误
    }
}

// 关闭表详情模态框
function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

// 切换下拉菜单显示
function toggleDropdown(dropdownId) {
    const dropdownContent = document.getElementById(dropdownId);
    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
}

// 关闭所有下拉菜单
function closeDropdowns() {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
        dropdowns[i].style.display = "none";
    }
    document.getElementById('tableButton').style.display = 'none'; // 隐藏表按钮
}

// 点击其他地方关闭下拉菜单
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        closeDropdowns(); // 关闭所有下拉菜单
    }
}

// 绑定数据库详情按钮的点击事件
document.getElementById('detailsButton').onclick = openDetailsModal;

//点击推荐问题自动填入输入框
document.addEventListener('DOMContentLoaded', function() {
    const recommendationItems = document.querySelectorAll('.recommendation-item');

    recommendationItems.forEach(item => {
        item.addEventListener('click', function() {
            // 获取 data-question 属性的值
            const question = this.getAttribute('data-question');

            // 将推荐问题填入输入框
            const userInput = document.getElementById('userQuestion');
            userInput.value = question;

            // 清除所有其他项的选中状态
            recommendationItems.forEach(i => i.classList.remove('selected'));

            // 添加选中状态
            this.classList.add('selected');

            // 隐藏推荐问题区域
            document.getElementById('recommendations').style.display = 'none';
        });
    });

    const sendButton = document.getElementById('sendButton');
    sendButton.addEventListener('click', function() {
        const userInput = document.getElementById('userQuestion');
        const message = userInput.value.trim();

        if (message) {
            console.log("用户发送的问题:", message); // 这里可以替换为实际的消息处理逻辑
            userInput.value = ''; // 清空输入框
            document.getElementById('recommendations').style.display = 'none'; // 隐藏推荐问题区域
        } else {
            alert("请输入问题。");
        }
    });
});

//气泡效果
const recommendationItems = document.querySelectorAll('.recommendation-item');

recommendationItems.forEach(item => {
    item.addEventListener('click', function() {
        // 获取 data-question 属性的值
        const question = this.getAttribute('data-question');

        // 将推荐问题填入输入框
        const userInput = document.getElementById('userQuestion');
        userInput.value = question;

        // 清除所有其他项的选中状态
        recommendationItems.forEach(i => i.classList.remove('selected'));

        // 添加选中状态
        this.classList.add('selected');
    });
});

