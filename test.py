import requests

def remote_fetch_emails(mail_username, mail_pwd):
    # 替换为你的服务地址
    url = 'http://localhost:28357/fetch_emails'

    # 构造请求参数
    payload = {
        'mail_username': mail_username,
        'mail_pwd': mail_pwd
    }

    # 发送POST请求
    response = requests.post(url, data=payload)
    content_string = response.content.decode()
    print(content_string)
    print(str(response))

    if response.status_code == 200:
        return "Emails fetched successfully"
    else:
        return "Failed to fetch emails"

# 测试调用fetch_emails方法
result = remote_fetch_emails("email", "mail_pwd")
print(result)
