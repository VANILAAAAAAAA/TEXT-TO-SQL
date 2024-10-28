import aiohttp
import asyncio

async def fetch_data(session, url, payload):
    async with session.post(url, json=payload) as response:
        # 确保响应的状态码是200
        if response.status == 200:
            final_answer = []
            async for line in response.content:
                if line:
                    decoded_line = line.decode('utf-8').strip()
                    # 第一步：去掉包含 data:"" 的行
                    if decoded_line and decoded_line != 'data:""':
                        # 第二步：进行特定的字符串替换
                        cleaned_line = decoded_line.replace(
                            'data:"data: {\\"step\\": \\"output\\", \\"tool_name\\": \\"document_outline_writer\\", \\"tool_input\\": \\"\\", \\"output\\": \\"',
                            ''
                        )
                        cleaner_line = cleaned_line.replace('\\"}"', '')
                        final_answer.append(cleaner_line)

            # 第三步：将所有行拼接成一行
            final_output = ''.join(final_answer)  # 不添加空格
            print(final_output)
        else:
            print(f"Error: Received response status {response.status}")

async def main():
    url = 'http://maas.aipcc-gz.com/api/v1/appAssistant/completions'
    headers = {
        'Authorization': 'Bearer a66ae539fbd366d09ad3fe28c14ae0bd',
        'Content-Type': 'application/json'
    }
    payload = {
        "params": {
            "serviceId": "1823889696548196352",
            "stream": "true",
            "messages": [{"role": "user", "content": "查询最高的electroencephalography？"}]
        }
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        await fetch_data(session, url, payload)

# 运行主程序
if __name__ == '__main__':
    asyncio.run(main())
