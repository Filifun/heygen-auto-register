#coding=utf-8
import time
import re
import random
import os
import shutil
from playwright.sync_api import sync_playwright

import requests
from loguru import logger
from app.captcha_resolver import CaptchaResolver
from app.settings import CAPTCHA_ENTIRE_IMAGE_FILE_PATH, CAPTCHA_SINGLE_IMAGE_FILE_PATH
from app.utils import get_question_id_by_target_name, resize_base64_image
from app.solution import Solution
import app
import queue

import requests
import imaplib
import email
import base64
import re

"""
Author: 老梁、Filifun
Date: 2023-12-27

heygen自动化注册脚本
v1：1积分的自动化注册

"""

currentTime = time.strftime("%m_%d_%H%M%S", time.localtime())
currentPath = os.getcwd() #当前运行目录
email_queue = queue.Queue()

emails_arr = [
    # "311hg@domain.com",
    # "312hg@domain.com",
]

def init_emails_queue():
    print("init_emails_queue")
    for item in emails_arr:
        email_queue.put(item)

def run(playwright):
    width, height = 1026,728
    # 邀请人的cid
    invited_code = "6ca49e9f"
    # heygen注册用户统一的密码
    password = 'Amypwd123456'
    init_emails_queue()
    # 邮箱的固定密码
    mail_pwd = 'smtpPwd123456'

    # 注册账号数
    max_nums   = 3 
    current_num = 1
    WHILE_FLAG = True

    # chrome安装路径，更换为自己安装的路径
    executables_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    user_dir = 'tmp/playwright'
    user_dir = os.path.join(os.getcwd(), user_dir)

    path_to_extension =  [
        os.path.join(
            os.getcwd(),'extensions/hideme'),
            os.path.join(os.getcwd(),'extensions/yescaptcha')
            ]
    path_to_extension = ','.join(path_to_extension)
    
    while WHILE_FLAG:
        # 启动一个持久化的Chromium浏览器上下文
        browser = playwright.chromium.launch_persistent_context(user_dir,
                                            headless = False, 
                                            slow_mo = 500,
                                            executable_path = executables_path,   
                                            bypass_csp = True,
                                            args=[
                                                f"--disable-extensions-except={path_to_extension}",
                                                f"--load-extension={path_to_extension}"
                                            ])

        try:
            if os.path.exists(user_dir):
                shutil.rmtree(user_dir,True)

            # 确认魔法可用
            page_network = browser.new_page()
            page_network.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page_network.set_default_timeout(0)
            page_network.context.clear_cookies() #清除cookies
            page_network.goto("https://google.com")
            # page_network.wait_for_load_state()
            page_network.wait_for_load_state('load')

            email = email_queue.get_nowait()
            print(f"第{current_num}个开始======")
            print(f"Email:{email}")
          
            #进heygen登录页
            page_hg = browser.new_page()
            page_hg.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page_hg.set_default_timeout(0)
            page_hg.set_viewport_size({"width": width, "height": height})
            page_hg.goto(url=f"https://app.heygen.com/guest/templates?cid={invited_code}",timeout = 0)
            #page_hg.goto(url=f"https://app.heygen.com/login",timeout = 0)
            page_hg.wait_for_load_state('load')
            time.sleep(1)
            
            cookieTxt = page_hg.get_by_text("Reject All")
            print(cookieTxt)
            if cookieTxt.count() > 0:
                cookieTxt.first.click()

            signInTxt = page_hg.get_by_text("Sign Up with Email")
            signInTxt.first.click()
            print("signInTxt click, fill:" + str(email))
            page_hg.locator("#email").fill(str(email))
            sendcode = page_hg.get_by_text("Send Code")
            sendcode.click()
            time.sleep(3)

            """
            # google验证，有额外成本
            checkCaptcha = Solution().set_web_page(page_hg).resolve()
   
            if not checkCaptcha:
                logger.info("此次验证不通过")
                time.sleep(1)
                #browser.close()
                #continue
           """

            # 获取注册邮件的验证码
            emailcode = remote_fetch_emails(email, mail_pwd)
            while emailcode is None or emailcode == "":
                time.sleep(5)
                print("continue fetch_emails")
                emailcode = remote_fetch_emails(email, mail_pwd)
  
            # 拿到验证码了，放到注册那个文本框去
            page_hg.locator("input#code").fill(emailcode)
            nextStep = page_hg.get_by_text("Next Step")
            nextStep.click()

            # heygen官方的限制，可能报错
            flaggemail = page_hg.get_by_text('This email has been flagged as potential spam. Please try another email.')
            if  flaggemail.count() > 0:
                print( f"当前email:{email}为flagged,下一个")
                time.sleep(1)
                browser.close()
                break 

            # 然后填充密码，完成最后一步
            page_hg.locator("input#password").fill(password)
            page_hg.locator("input#pwdConfirm").fill(password)
            doneBtn = page_hg.get_by_text("Done")
            doneBtn.click()
            
            #写到文件里面去
            write_email_to_txt(email)

            #等按钮提交完成
            time.sleep(20)
            browser.close()

            print("Done")
            print(f"第{current_num}个结束======")

            if current_num >= max_nums :
                WHILE_FLAG = False
                break
            current_num = current_num + 1  

        except Exception as e:
            print("异常：",e)
            browser.close()

def write_email_to_txt(email):
    filename = f"{currentPath}/email_{currentTime}.txt"
    with open(filename, "a") as f:
        f.write(email)
        f.write("\n")

def remote_fetch_emails(mail_username, mail_pwd):
    url = 'http://api.fastawk.com/fetch_emails'

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
    if response.status_code == 200 and content_string != "":
        return content_string
    else:
        return None

with sync_playwright() as playwright:
    run(playwright)
