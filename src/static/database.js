let currentDatabase = null; // 用于存储当前选择的数据库
let currentTable = null; // 用于存储当前选择的表

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
