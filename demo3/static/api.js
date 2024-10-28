
let currentDatabase = null; // 用于存储当前选择的数据库
let currentTable = null; // 用于存储当前选择的表


//-------------------------------- 模型对话界面效果模块 ---------------------------
// 模型对话的气泡实时生成，且包括了气泡中的导出、缩放功能
window.onload = async function () {
    await fetchDatabases(); // 获取数据库列表

    let sendButton = document.getElementById('askModelButton');
    let userInput = document.getElementById('userQuestion');
    let chatMessage = document.getElementById('chat-message');
    //前端气泡框生成
    function displayMessage(message, isUser = true) {
        const messageDiv = document.createElement('div');
        messageDiv.style.padding = '10px 15px';
        messageDiv.style.borderRadius = '10px';
        messageDiv.style.opacity = '0.9';
        messageDiv.style.maxWidth = '70%';
        messageDiv.style.marginBottom = '10px';
        messageDiv.style.display = 'inline-block';
        messageDiv.style.wordWrap = 'break-word';
        messageDiv.style.position = 'relative'; // 允许按钮相对于气泡框定位

        if (isUser) {
            messageDiv.style.backgroundColor = '#7ae1b6';
            messageDiv.style.marginLeft = 'auto';
            messageDiv.style.textAlign = 'left';
        } else {
            messageDiv.style.backgroundColor = '#d1e7dd';
            messageDiv.style.marginRight = 'auto';
            messageDiv.style.textAlign = 'left';

            // 包裹文本的 div
            const outputText = document.createElement('div');
            outputText.classList.add('output-text');
            outputText.innerText = message;

            messageDiv.appendChild(outputText);

        }

        messageDiv.innerText = message;

        const messageContainer = document.createElement('div');
        messageContainer.style.display = 'flex';
        messageContainer.style.justifyContent = isUser ? 'flex-end' : 'flex-start';
        messageContainer.appendChild(messageDiv);

        chatMessage.appendChild(messageContainer);
        chatMessage.scrollTop = chatMessage.scrollHeight;
    }


    // 按钮触发事件
    sendButton.addEventListener('click', async function () {
        const message = userInput.value.trim();
        if (message) {
            displayMessage(message, true); // 显示用户消息
            userInput.value = '';

            // // 隐藏推荐问题区域
            // document.getElementById('recommendations').style.display = 'none';

            // 扩大聊天区域
            document.getElementById('chatContainer').style.flex = '1'; // 让聊天区域占据更多空间

            // 显示加载气泡
            displayMessage("正在加载...", false, true); // 显示加载气泡和旋转圈

            // 生成提示词
            const prompt = await generatePrompt(); // 获取表信息提示词

            // 确保 prompt 不为空
            if (prompt) {
                // 调用获取模型输出的函数
                const modelOutput = await fetchModelOutput(prompt, message); // 获取模型输出

                // 隐藏加载气泡并显示模型输出
                chatMessage.lastChild.remove(); // 移除加载气泡
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
                            const csvFile = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
                            const link = document.createElement('a');
                            const url = URL.createObjectURL(csvFile);
                            link.setAttribute('href', url);
                            link.setAttribute('download', 'table_data.csv'); // 设置下载文件名
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link); // 下载后移除链接
                        };

                        // 创建缩小按钮
                        const shrinkButton = document.createElement('button');
                        shrinkButton.innerText = '-';
                        shrinkButton.style.position = 'absolute'; // 绝对定位
                        shrinkButton.style.top = '10px'; // 距离顶部10px
                        shrinkButton.style.right = '10px'; // 距离右侧10px
                        shrinkButton.style.backgroundColor = '#555'; // 深灰色背景
                        shrinkButton.style.color = '#fff'; // 白色文本
                        shrinkButton.style.border = 'none'; // 去掉边框
                        shrinkButton.style.padding = '5px 10px'; // 设置内边距
                        shrinkButton.style.borderRadius = '5px'; // 圆角
                        shrinkButton.style.cursor = 'pointer'; // 鼠标悬停时显示为手型

                        // 添加点击事件以切换显示状态
                        shrinkButton.onclick = function () {
                            const rows = tableWrapper.querySelectorAll('tr:not(:first-child)'); // 获取所有非表头行
                            if (rows[0].style.display === 'none') {
                                // 如果当前是隐藏状态，显示所有行
                                rows.forEach(row => {
                                    row.style.display = ''; // 显示行
                                });
                                shrinkButton.innerText = '-'; // 更新按钮文本
                            } else {
                                // 隐藏所有非表头行
                                rows.forEach(row => {
                                    row.style.display = 'none'; // 隐藏非表头行
                                });
                                shrinkButton.innerText = '+'; // 更新按钮文本
                            }
                        };

                        // 添加按钮到内容包裹器中
                        contentWrapper.appendChild(saveButton); // 将保存按钮添加到内容包裹器中
                        resultContainer.appendChild(contentWrapper); // 将内容包裹器添加到气泡容器中
                        resultContainer.appendChild(shrinkButton); // 将缩小按钮添加到气泡容器中

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

        // 发送和换行相关的脚本
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

async function uploadCSV() {
    const fileInput = document.getElementById('fileInput');
    const encodingSelect = document.getElementById('encodingSelect');
    const databaseSelect = document.getElementById('databaseDropdown');

    // 检查元素是否存在
    console.log("fileInput:", fileInput);
    console.log("encodingSelect:", encodingSelect);
    console.log("databaseSelect:", databaseSelect);

    // 确保元素存在
    if (!fileInput || !encodingSelect || !databaseSelect) {
        console.error("未找到必要的输入元素");
        return;
    }

    const encoding = encodingSelect.value;

    // 调试信息
    console.log('Encoding:', encoding);
    console.log('Current Database:', currentDatabase);

    // 检查数据库选择
    if (!currentDatabase) {
        alert('请先选择一个数据库。');
        return;
    }

    // 检查文件选择
    if (fileInput.files.length === 0) {
        alert('请先选择一个 CSV 文件。');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('encoding', encoding);
    formData.append('database', currentDatabase); // 使用 currentDatabase

    try {
        console.log('Sending request...');
        const response = await fetch('http://183.237.186.230:19902/upload_csv', {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text(); // 获取错误响应文本
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        // 检查 result 元素是否存在
        const resultElement = document.getElementById('result');
        if (resultElement) {
            resultElement.innerText = data.message;
        } else {
            console.error("未找到结果显示元素");
        }
    } catch (error) {
        console.error("上传失败:", error);
        const resultElement = document.getElementById('result');
        if (resultElement) {
            resultElement.innerText = '上传失败: ' + error.message;
        } else {
            console.error("未找到结果显示元素");
        }
    }
}

// 绑定事件
document.addEventListener('DOMContentLoaded', function () {
    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
        uploadButton.addEventListener('click', uploadCSV);
    } else {
        console.error("未找到上传按钮");
    }
});


//------------------------------ 后端接口相关 -----------------------------
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

        const response = await fetch('http:// /get_model_output', {
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
        const response = await fetch('http:// /execute_query', {
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
        const response = await fetch('http:// /get_databases', {
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
        const response = await fetch('http:// /get_tables', {
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


// ----------------------- 获取表详情的小窗口模块 -------------------------
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
        const response = await fetch('http:// /get_database_details', {
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


//---------------------- 表和数据库的菜单脚本 -----------------------------
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



//-------------------------------- 推荐问题、预设问题模块 -----------------------------------
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

            // // 隐藏推荐问题区域
            // document.getElementById('recommendations').style.display = 'none';
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

//推荐问题自定义
document.addEventListener('DOMContentLoaded', function() {
    const recommendationItems = document.querySelectorAll('.recommendation-item');
    const modal = document.getElementById('customize-modal');
    const closeButton = document.querySelector('.close-btn');
    const submitButton = document.getElementById('submit-customization');
    const yearInput = document.getElementById('year-input');
    const monthInput = document.getElementById('month-input');
    const diseaseInput = document.getElementById('disease-input');
    const selectYearCheckbox = document.getElementById('select-year');
    const selectMonthCheckbox = document.getElementById('select-month');
    let selectedQuestion = '';

    // 填充年份选项，从2000年到2024年
    for (let i = 2024; i >= 2000; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearInput.appendChild(option);
    }

    // 点击推荐问题
    recommendationItems.forEach(item => {
        item.addEventListener('click', function() {
            // 获取 data-question 属性的值
            selectedQuestion = this.getAttribute('data-question');

            // 打开模态框
            modal.style.display = 'flex';
        });
    });

    // 关闭模态框
    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
        // 清空输入框，确保不输入任何信息
        const userInput = document.getElementById('userQuestion');
        userInput.value = ''; // 清空输入框
    });

    // 选择年份复选框的事件
    selectYearCheckbox.addEventListener('change', function() {
        yearInput.style.display = this.checked ? 'block' : 'none';
    });

    // 选择月份复选框的事件
    selectMonthCheckbox.addEventListener('change', function() {
        monthInput.style.display = this.checked ? 'block' : 'none';
    });

    // 提交自定义问题
    submitButton.addEventListener('click', function() {
        const customYear = selectYearCheckbox.checked ? yearInput.value : '';
        const customMonth = selectMonthCheckbox.checked ? monthInput.value : '';
        const customDisease = diseaseInput.value;

        // 构建最终问题
        let finalQuestion = selectedQuestion;
        if (customYear) {
            finalQuestion += ` 终审日期: ${customYear}`; // 添加年份
            if (customMonth) {
                finalQuestion += `-${customMonth}`; // 添加月份
            }
            finalQuestion += `-%`; // 添加通配符
        }
        finalQuestion += `，疾病名称: ${customDisease}`;

        // 将最终问题填入输入框
        const userInput = document.getElementById('userQuestion'); // 假设这是您的输入框
        userInput.value = finalQuestion;

        // 关闭模态框
        modal.style.display = 'none';
    });
});


//推荐问题气泡效果
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

// 打开CSV模态框
function openCsvModal() {
    document.getElementById('csvModal').style.display = 'flex';
}

// 关闭CSV模态框
function closeCsvModal() {
    document.getElementById('csvModal').style.display = 'none';
}
