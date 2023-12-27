from PIL import Image
import base64
import time
import random
from loguru import logger
from app.settings import CAPTCHA_RESIZED_IMAGE_FILE_PATH, CAPTCHA_TARGET_NAME_QUESTION_ID_MAPPING,currentRootPath

currentTime = time.strftime("%m_%d_%H%M%S", time.localtime())

def resize_base64_image(filename, size):
    width, height = size
    img = Image.open(filename)
    new_img = img.resize((width, height))
    imgResizedFilePath = currentRootPath + '/google_img/' + CAPTCHA_RESIZED_IMAGE_FILE_PATH.format(currentTime + str(random.randint(10000,99999)))
    new_img.save(imgResizedFilePath)
    with open(imgResizedFilePath, "rb") as f:
        data = f.read()
        encoded_string = base64.b64encode(data)
        return encoded_string.decode('utf-8')


def get_question_id_by_target_name(target_name):
    logger.debug(f'try to get question id by {target_name}')
    question_id = CAPTCHA_TARGET_NAME_QUESTION_ID_MAPPING.get(target_name)
    logger.debug(f'question_id {question_id}')
    return question_id