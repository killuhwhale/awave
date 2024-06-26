import sys
import os
from time import sleep
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoSuchWindowException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import logging


logging.basicConfig(level=logging.INFO, format='%(asctime)s:%(levelname)s:%(message)s', filename="/home/killuh/.awave/appController_main.logs")

# Set up Chrome options
chrome_options = Options()
# chrome_options.add_argument("--start-maximized")  # Start the browser maximized
chrome_options.add_argument("--disable-dev-shm-usage")  #
# chrome_options.add_argument("--no-sandbox")  # Start the browser maximized
# chrome_options.add_argument("--remote-debugging-port=9222")
chrome_options.add_argument("--kiosk")  # Full-screen mode without toolbars or URL bar
# chrome_options.add_argument("--disable-infobars")  # Disable info bars
# chrome_options.add_argument("--disable-extensions")  # Disable extensions
chrome_options.add_argument("--disable-pinch")
chrome_options.add_argument('--disable-features=TouchpadOverscrollHistoryNavigation')
chrome_options.add_argument('--overscroll-history-navigation=disabled')

# Initialize the Chrome driver @
chrome_driver_path = "/home/killuh/chromedriver"
service = ChromeService(executable_path=chrome_driver_path)
driver = webdriver.Chrome(service=service, options=chrome_options)


def autoplay():
    global driver
    try:
        if "AUTOPLAY" in os.environ:
            el = WebDriverWait(driver, 20).until(
                EC.element_to_be_clickable((By.ID, "mainPlay"))
            )
            el.click()
            logging.info(f"Clicked mainPlay: {err=}")
    except Exception as err:
            logging.info(f"Failed click AUTOPLAY: {err=}")


def click_body():
    global driver
    try:
        el = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.TAG_NAME, "body"))
        )
        el.click()
        logging.info(f"Clicked body: {err=}")
    except Exception as err:
            logging.info(f"failed to click body: {err=}")


def main():
    try:
        # Navigate to localhost:3000
        driver.get("http://localhost:3000")

        driver.implicitly_wait(5)

        # Example interaction 1: Find a button by its ID and click i
        autoplay()
        click_body()

        logging.info(f"{os.environ=}")
        while True:
            try:
                # Check driver to make sure browser is still iopen to localhost:3000
                current_url = driver.current_url
                if current_url != "http://localhost:3000/":
                    logging.info("Not at correct url")
            except NoSuchWindowException as err:
                logging.info(f"NoSuchWindowException: {err=}")
                sys.exit(1)
            except Exception as err:
                logging.info(f"Err: {err=}")
            sleep(0.1)
            pass

        # Additional interactions can be added here as needed

    finally:
        # Close the browser after a delay to observe the interactions
        driver.implicitly_wait(15)
        driver.quit()


if __name__ == "__main__":
    main()