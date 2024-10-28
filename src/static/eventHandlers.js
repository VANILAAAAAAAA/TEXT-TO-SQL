window.onload = async function () {
    await fetchDatabases(); // 获取数据库列表

    let sendButton = document.getElementById('askModelButton');
    let userInput = document.getElementById('userQuestion');

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
                        createResultTable(queryResult); // 创建并显示查询结果表格
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

    // 监听输入框的键盘事件
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
