import imaplib
import email
import base64
import re
from flask import Flask, request


"""
Author: Filifun
Date: 2023-12-27

启动一个服务，对外暴露接口以获取飞书邮箱的邮件信息，拿到heygen注册时的验证码
"""

app = Flask(__name__)
@app.route('/fetch_emails', methods=['POST'])
def fetch_emails():
    # 获取请求中的参数
    mail_username = request.form.get('mail_username')
    mail_pwd = request.form.get('mail_pwd')

    res = fetch_emails(mail_username, mail_pwd)
    if res == None:
        res = ""
    return res

def fetch_emails(mail_username, mail_pwd):
    email_code = None
    # 配置邮箱服务器和凭据
    IMAP_SERVER = "imap.feishu.cn"  # 替换为您的邮箱服务器地址
    IMAP_PORT = 993  # 使用IMAP4_SSL_PORT常量指定端口号

    # 连接到邮箱服务器
    imap_server = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)

    # 登录并选择收件箱
    imap_server.login(mail_username, mail_pwd)
    imap_server.select("INBOX")
    # 检索新邮件
    status, data = imap_server.search(None, "UNSEEN")  # 获取所有未读邮件
    if status == "OK":
        email_ids = data[0].split()
        for email_id in email_ids:
            email_code = email_content_handle(imap_server, email_id)
            break

    # 关闭与邮箱服务器的连接
    imap_server.logout()
    return email_code

def email_content_handle(imap_server, email_id):
    # 根据邮件ID获取邮件内容
    res = None
    status, email_data = imap_server.fetch(email_id, "(RFC822)")
    if status == "OK":
        # 在这里处理或打印新邮件的内容
        print("New email received:")
        msg = email.message_from_bytes(email_data[0][1])
        subject = msg['Subject']
        # 获取邮件正文
        if msg.is_multipart():
            # 如果邮件是多部分的，获取第一个部分的正文
            body = msg.get_payload(0).get_payload()
            print(body)
            res = get_code_by_parse_content(body)
            # 解码邮件正文
            # decoded_body = base64.b64decode(body).decode('utf-8')
            # print(decoded_body)
        else:
            # 如果邮件是单一部分的，直接获取正文
            body = msg.get_payload()
            # 解码邮件正文
            decoded_body = base64.b64decode(body).decode('utf-8')
            print(decoded_body)
    return res

def get_code_by_parse_content(email_origin_content):
    code = extract_verification_code(email_origin_content)
    print("code="+str(code))
    return code

def extract_verification_code(string):
    pattern = r'\b\d{6}\b'
    match = re.search(pattern, string)
    if match:
        return match.group()
    else:
        return None

if __name__ == '__main__':
    app.run(port=28357)