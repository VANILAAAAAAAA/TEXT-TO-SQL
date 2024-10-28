import aiohttp
import asyncio





async def fetch_data(session, url, payload):
    async with session.post(url, json=payload) as response:
        # 确保响应的状态码是200
        response.raise_for_status()

        # 逐行读取响应内容
        async for line in response.content:
            # 解码并打印每一行
            print(line.decode('utf-8').strip())


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
