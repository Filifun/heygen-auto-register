import time
import re
import random
import os
from playwright.sync_api import sync_playwright



import requests
from loguru import logger
from app.captcha_resolver import CaptchaResolver
from app.settings import CAPTCHA_ENTIRE_IMAGE_FILE_PATH, CAPTCHA_SINGLE_IMAGE_FILE_PATH, currentRootPath
from app.utils import get_question_id_by_target_name, resize_base64_image,currentTime


#currentTime = time.strftime("%m_%d_%H%M%S", time.localtime())

class Solution(object):

    def __init__(self) -> None:
        self.captcha_resolver = CaptchaResolver()
        self.web_page = None
        self.create_dir()
  

    def set_web_page(self, web_page):
        self.web_page = web_page 
        return self
    
    def get_captcha_bot_entry_iframe(self):
        botFrame =  self.web_page.frame_locator("iframe[title=reCAPTCHA]")
        return botFrame
    
    def get_captcha_bot_checkbox(self):
        anchor =  self.get_captcha_bot_entry_iframe().locator("#recaptcha-anchor")
        return anchor

    def get_captcha_img_entry_iframe(self):
         recaptchaFrame= self.web_page.frame_locator('//iframe[contains(@title, "reCAPTCHA 验证将于")]')
         return recaptchaFrame
    
    def create_dir(self):
        imgpath = currentRootPath +  '/google_img/'
        if not os.path.exists(imgpath):
            os.makedirs(imgpath, True)
            os.chmod(imgpath, 0o777)
        self.img_path = imgpath  
        return self
        
    def trigger_captcha(self):
        botFrame = self.get_captcha_bot_entry_iframe()
        if botFrame:
            logger.info("出现我不是机器人的Iframe了")

            """
            if self.get_captcha_bot_checkbox():
                self.get_captcha_bot_checkbox().click()
                time.sleep(2)
            """

            recaptchaFrame= self.get_captcha_img_entry_iframe()
            if recaptchaFrame:
                logger.info("Google认证弹框出来了")

    def verify_single_captcha( self, index, page2,captcha_target_name):
        logger.debug("开始进行单个图片的验证")
        time.sleep(3)
        #在接下来的iframe中，继续去找要识别的具体东西
        recaptchaFrame= page2.frame_locator('//iframe[contains(@title, "reCAPTCHA 验证将于")]')
        if recaptchaFrame:
            
            elements =  recaptchaFrame.locator("#rc-imageselect-target table td")

            single_captcha_element  = elements.nth(index)
            class_name = single_captcha_element.get_attribute('class')
            logger.debug(f'verifiying single captcha {index}, class {class_name}')

            if 'selected' in class_name:
                logger.debug(f'no new single captcha displayed')
                return
            
            logger.debug('new single captcha displayed')
            
            single_captcha_url = single_captcha_element.locator(
                'img').get_attribute('src')
            logger.debug(f'single_captcha_url {single_captcha_url}')
            
            imgSingleFilePath = self.img_path +  CAPTCHA_SINGLE_IMAGE_FILE_PATH.format(currentTime + str(random.randint(10000,99999)))
            with open(imgSingleFilePath, 'wb') as f:
                f.write(requests.get(single_captcha_url).content)
            resized_single_captcha_base64_string = resize_base64_image(
                imgSingleFilePath, (100, 100))
            
            single_captcha_recognize_result = self.captcha_resolver.create_task(
                resized_single_captcha_base64_string, get_question_id_by_target_name(captcha_target_name))
            if not single_captcha_recognize_result:
                logger.error('count not get single captcha recognize result')
                return
            has_object = single_captcha_recognize_result.get(
                'solution', {}).get('hasObject')
            if has_object is None:
                logger.error('count not get captcha recognized indices')
                return
            if has_object is False:
                logger.debug('no more object in this single captcha')
                return
            if has_object:
                single_captcha_element.click()
                # check for new single captcha
                self.verify_single_captcha(index, page2,captcha_target_name)

    def get_verify_button(self, recaptchaFrame):
            verify_button = recaptchaFrame.locator('#recaptcha-verify-button')
            return verify_button    

    def get_is_successful(self, botFrame):
            logger.info("进来判断了")
            anchor = botFrame.locator('#recaptcha-anchor')
            logger.info(anchor)
            checked = anchor.get_attribute('aria-checked')
            logger.debug(f'checked {checked}')
            return str(checked) == 'true'        

    def get_verify_error_info(self, recaptchaFrame):
            incorrectEle =  recaptchaFrame.locator('div.rc-imageselect-incorrect-response')
            if incorrectEle:
                return incorrectEle.inner_text()
    
    def verify_entire_captcha(self):
        #在接下来的iframe中，继续去找要识别的具体东西
        page2 = self.web_page
        print("verify_entire_captcha_1")
        botFrame  = self.get_captcha_bot_entry_iframe()
        print("verify_entire_captcha_2")
        recaptchaFrame=  self.get_captcha_img_entry_iframe()
        print("verify_entire_captcha_3")

        if recaptchaFrame:

 
            print("verify_entire_captcha_4")
            captcha_target_name = ""
            time.sleep(1)
            try:
                if (recaptchaFrame.locator(".rc-imageselect-desc-wrapper strong").count() > 0):
                    captcha_target_name =  recaptchaFrame.locator(".rc-imageselect-desc-wrapper strong").inner_text()  
                    print("captcha_target_name",captcha_target_name)
                else:
                    logger.debug("captcha_target_name not found")
                    return False
            except Exception as e:
                logger.debug("Exceptipn:captcha_target_name not found", e)
                return False
            
            if (recaptchaFrame.locator("div.rc-image-tile-wrapper >> img").count() > 0):
                imgWholeElement = recaptchaFrame.locator("div.rc-image-tile-wrapper >> img").first
                print("imgWholeElement",imgWholeElement)
            else:
                logger.debug("imgWholeElement not found")
                return False
            
            if imgWholeElement:
                
                entire_captcha_url = imgWholeElement.get_attribute("src")
                print("找到图片了", entire_captcha_url, imgWholeElement.get_attribute("naturalWidth"))
                # 使用js代码获取图片宽高
                # 使用函数式写法
               
                #经常取不到图标的实际高和高，通过行数来判断得了
                trlen = recaptchaFrame.locator("div#rc-imageselect-target table tr").count()
                if trlen == 4:
                    entire_captcha_natural_width = 450
                else:
                    entire_captcha_natural_width = 300


                #dimensions  = page2.evaluate("(url) => { let img = document.createElement('img'); img.src = url;return {width:img.naturalWidth,height:img.naturalHeight}}", imgWholeElement.get_attribute('src'))
                
                #print(dimensions["width"], dimensions["height"])
                
                #if dimensions["width"] <=0 :
                    #return False
                
                

                #entire_captcha_natural_width = dimensions["width"]
                imgFileNamePath = self.img_path + CAPTCHA_ENTIRE_IMAGE_FILE_PATH.format(currentTime + str(random.randint(10000,99999)))
                with open(imgFileNamePath, 'wb') as f:
                    f.write(requests.get(entire_captcha_url).content)
                logger.debug(
                 f'saved entire captcha to {imgFileNamePath}')
                
                resized_entire_captcha_base64_string = resize_base64_image(
                imgFileNamePath, (entire_captcha_natural_width,
                                                 entire_captcha_natural_width))
                logger.debug(
                f'resized_entire_captcha_base64_string, {resized_entire_captcha_base64_string[0:100]}...')

                #创建 task 
             
                
                entire_captcha_recognize_result = self.captcha_resolver.create_task(
                resized_entire_captcha_base64_string,
                get_question_id_by_target_name(captcha_target_name)
                 )
                if not entire_captcha_recognize_result:
                     logger.error('count not get captcha recognize result')
                     return False
                
                recognized_indices = entire_captcha_recognize_result.get(
                 'solution', {}).get('objects')
                
                if not recognized_indices:
                    logger.error('count not get captcha recognized indices')
                    return False

                
                 
                #recognized_indices = [0,3]
                single_captcha_elements =  recaptchaFrame.locator("#rc-imageselect-target table td")
                logger.debug("开始处理选中了")
                for recognized_index in recognized_indices:
                     logger.debug("开始处理选中了_STEP_1")
                     if single_captcha_elements.count() > 0:
                         logger.debug("开始处理选中了_STEP_2")
                         single_captcha_element = single_captcha_elements.nth(recognized_index)
                         logger.debug("开始处理选中了_STEP_3")
                         print(single_captcha_element)
                         if single_captcha_element.count() > 0:
                            logger.debug("开始处理选中了_STEP_4")
                            single_captcha_element.click()
                            logger.debug("开始处理选中了_STEP_5")
                    # check if need verify single captcha
                            self.verify_single_captcha(recognized_index, page2,captcha_target_name)

                    # after all captcha clicked
                verify_button = self.get_verify_button(recaptchaFrame)
                if verify_button.count() > 0:
                    logger.debug("验证按钮", verify_button)
                    verify_button.click()
                    time.sleep(random.randint(7,9))

                logger.debug("判断是不是成功了")
                #is_succeed = self.get_is_successful(botFrame)
                print("图片弹框", recaptchaFrame,"图片列表", single_captcha_elements.count())
                is_succeed =  False
                print("send code button", self.web_page.get_by_text("Send Code").count())
                sendCodeTxt = self.web_page.get_by_text("Send Code").count()
                print("send code:", sendCodeTxt)
                if sendCodeTxt > 0:
                    is_succeed = False
                else:
                    is_succeed = True
                        
                logger.debug("判断的结果呢",is_succeed)

                if is_succeed:
                    logger.debug('verifed successfully')
                    return True
                else:
                    logger.debug('verifed failed')
                    verify_error_info = self.get_verify_error_info(recaptchaFrame)
                    logger.debug(f'verify_error_info {verify_error_info}')
                    self.verify_entire_captcha()
        else:
            logger.debug('没找到弹框的iframe了')
            return False
    
    
    def resolve(self):
        self.trigger_captcha()
        return self.verify_entire_captcha()
