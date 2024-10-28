// api.js

// Fetch the list of databases from the server
async function fetchDatabases() {
    try {
        const response = await fetch('http://172.23.4.160:8080/get_databases', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const databaseSelect = document.getElementById('database');
        databaseSelect.innerHTML = ''; // Clear previous options
        data.databases.forEach(db => {
            const option = document.createElement('option');
            option.value = db;
            option.textContent = db;
            databaseSelect.appendChild(option);
        });
    } catch (error) {
        alert('获取数据库列表时出错: ' + error.message);
    }
}

let selectedTable = ""; // 用于存储用户选择的表名

// Fetch the list of tables for the selected database
async function getTables() {
    const database = document.getElementById('database').value;
    if (!database) {
        alert("请先选择一个数据库");
        return;
    }

    try {
        const response = await fetch('http://172.23.4.160:8080/get_tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const tableSelectDropdown = document.getElementById('tableSelectDropdown');
        tableSelectDropdown.innerHTML = ''; // Clear previous options

        data.tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table;
            option.textContent = table;
            tableSelectDropdown.appendChild(option);
        });

        // 如果没有选择过表，则默认选择第一个表
        if (data.tables.length > 0) {
            // 如果没有之前的选择，则选择第一个表
            if (!selectedTable) {
                selectedTable = data.tables[0];
            }
            tableSelectDropdown.value = selectedTable; // 设置下拉菜单的值为用户选择的表或默认第一个表
            getDatabaseDetails(); // 获取默认表的详情
        }
    } catch (error) {
        alert('获取表列表时出错: ' + error.message);
    }
}

// Open the modal for database details
document.getElementById('detailsButton').onclick = function() {
    const modal = document.getElementById('detailsModal');
    modal.style.display = 'flex'; // Show modal
    getTables(); // Fetch tables when modal opens
}

// Close the modal for database details
document.getElementById('closeDetails').onclick = function() {
    const modal = document.getElementById('detailsModal');
    modal.style.display = 'none'; // Hide modal
}

// Update selected table when user changes selection
document.getElementById('tableSelectDropdown').onchange = function() {
    selectedTable = this.value; // Update user selection
    getDatabaseDetails(); // Fetch details for the selected table
}

// Fetch details for the selected table
async function getDatabaseDetails() {
    const database = document.getElementById('database').value;
    const selectedTable = document.getElementById('tableSelectDropdown').value;

    if (!selectedTable) {
        alert("请先选择一个表");
        return;
    }

    try {
        const response = await fetch('http://172.23.4.160:8080/get_database_details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database, table_names: [selectedTable] })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const detailsBody = document.getElementById('detailsBody');
        detailsBody.innerHTML = ''; // Clear previous details

        // Show table details
        const fields = data.table_info[selectedTable]; // Assuming the response structure
        fields.forEach(field => {
            const [fieldName, fieldTypeWithComment] = field.split('('); // Split field info to get name and type
            const [fieldType, fieldComment] = fieldTypeWithComment.split(' - 注释: '); // Split type and comment
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${fieldName.trim()}</td><td>${fieldType.replace(')', '').trim()}</td><td>${fieldComment ? fieldComment.trim() : ''}</td>`; // Remove ')' and trim whitespace
            detailsBody.appendChild(tr);
        });
    } catch (error) {
        alert('获取数据库详情时出错: ' + error.message);
    }
}

// Fetch user inputs for history
async function fetchUserInputs() {
    const modal = document.getElementById('historyModal');
    modal.style.display = 'flex'; // Show modal

    try {
        const response = await fetch('http://172.23.4.160:8080/get_user_inputs', {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const historyDiv = document.getElementById('history');
        historyDiv.innerHTML = ''; // Clear previous history

        // Assuming data.user_inputs is an array of objects
        data.user_inputs.forEach(input => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('history-item');

            const question = input.question || "未提供问题"; // Fallback if question is not available
            const modelOutput = input.model_output || "未提供模型输出"; // Fallback if model output is not available

            itemDiv.innerHTML = `
                <div class="history-title">问题: ${question}</div>
                <div class="history-content">模型输出: ${modelOutput}</div>
            `;

            historyDiv.appendChild(itemDiv);
        });
    } catch (error) {
        alert('获取历史记录时出错: ' + error.message);
    }
}



// Close history modal
function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.style.display = 'none'; // Hide modal
}

// Ask the model for SQL output
document.getElementById('askModelButton').onclick = async function() {
    const userQuestion = document.getElementById('userQuestion').value;

    if (!userQuestion) {
        alert("请输入您的问题");
        return;
    }

    const database = document.getElementById('database').value;
    const selectedTable = document.getElementById('tableSelectDropdown').value;

    if (!database || !selectedTable) {
        alert("请确保选择数据库和表");
        return;
    }

    // 获取字段信息
    const fields = await getTableFields(database, selectedTable);
    const fieldInfo = fields.map(field => `${field.name}(${field.type})`).join(', ');

    // 构建提示词
    const prompt = `表名: ${selectedTable}；字段名: ${fieldInfo}；\n请生成一个 SQL 查询来获取你的表中的所有信息。`;

    try {
        const response = await fetch('http://172.23.4.160:8080/get_model_output', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, question: userQuestion })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const modelOutputData = await response.json();
        displaySQLResult(modelOutputData.model_output); // 显示模型输出
        await executeSQLQuery(modelOutputData.model_output); // 执行 SQL 查询并获取结果
    } catch (error) {
        alert('获取模型输出时出错: ' + error.message);
    }
}

// Function to execute the SQL query
async function executeSQLQuery(sqlQuery) {
    const database = document.getElementById('database').value;
    const selectedTable = document.getElementById('tableSelectDropdown').value;

    if (!database || !selectedTable || !sqlQuery) {
        alert("请确保选择数据库、表并生成 SQL 查询");
        return;
    }

    console.log(`Executing SQL Query: ${sqlQuery}`); // Debug output SQL query

    try {
        const response = await fetch('http://172.23.4.160:8080/execute_query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                database: database,
                table_name: selectedTable,
                sql_query: sqlQuery
            })
        });

        if (!response.ok) {
            const errorResponse = await response.json(); // Get error response
            throw new Error(`HTTP error! status: ${response.status}, detail: ${errorResponse.detail}`);
        }

        const data = await response.json();
        displayQueryResult(data.result); // Display execution result
    } catch (error) {
        alert('执行查询时出错: ' + error.message);
    }
}

// Function to display the SQL output
function displaySQLResult(sqlOutput) {
    const sqlOutputDiv = document.getElementById('sqlOutput');
    const resultOutputDiv = document.getElementById('resultOutput');

    // Display SQL output
    sqlOutputDiv.innerHTML = `<pre>${sqlOutput}</pre>`;
    resultOutputDiv.innerHTML = ''; // Clear result output

    // Set tab to SQL
    document.getElementById('sqlTab').classList.add('active');
    document.getElementById('resultTab').classList.remove('active');

    // Show SQL output content
    sqlOutputDiv.classList.add('active');
    resultOutputDiv.classList.remove('active');
}

// Function to display the query result in a table
function displayQueryResult(result) {
    const resultOutputDiv = document.getElementById('resultOutput');
    resultOutputDiv.innerHTML = ''; // Clear result output

    if (Array.isArray(result) && result.length > 0) {
        const table = document.createElement('table');
        const headerRow = document.createElement('tr');

        // Create table headers
        Object.keys(result[0]).forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Create table rows
        result.forEach(row => {
            const tr = document.createElement('tr');
            Object.values(row).forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        resultOutputDiv.appendChild(table);
    } else {
        resultOutputDiv.innerHTML = '<p>没有返回结果。</p>';
    }

    // Set tab to result
    document.getElementById('resultTab').classList.add('active');
    document.getElementById('sqlTab').classList.remove('active');

    // Show result output content
    resultOutputDiv.classList.add('active');
    document.getElementById('sqlOutput').classList.remove('active');
}

// Function to get fields of the selected table
async function getTableFields(database, table) {
    try {
        const response = await fetch('http://172.23.4.160:8080/get_database_details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database, table_names: [table] })
        });

                if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const fields = data.table_info[table]; // Assuming the response structure
        return fields.map(field => {
            const [name, type] = field.split('(');
            return { name: name.trim(), type: type.replace(')', '').trim() };
        });
    } catch (error) {
        alert('获取表字段时出错: ' + error.message);
        return [];
    }
}

// Initialize the app
window.onload = fetchDatabases;

// Tab switching functionality
document.getElementById('sqlTab').onclick = function() {
    document.getElementById('sqlOutput').classList.add('active');
    document.getElementById('resultOutput').classList.remove('active');
    this.classList.add('active');
    document.getElementById('resultTab').classList.remove('active');
};

document.getElementById('resultTab').onclick = function() {
    document.getElementById('resultOutput').classList.add('active');
    document.getElementById('sqlOutput').classList.remove('active');
    this.classList.add('active');
    document.getElementById('sqlTab').classList.remove('active');
};
