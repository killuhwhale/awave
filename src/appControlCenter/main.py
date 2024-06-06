import sys
import os
from time import sleep
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoSuchWindowException
import logging


logging.basicConfig(level=logging.INFO, format='%(asctime)s:%(levelname)s:%(message)s')

# Set up Chrome options
chrome_options = Options()
# chrome_options.add_argument("--start-maximized")  # Start the browser maximized
chrome_options.add_argument("--disable-dev-shm-usage")  #
# chrome_options.add_argument("--no-sandbox")  # Start the browser maximized
# chrome_options.add_argument("--remote-debugging-port=9222")
chrome_options.add_argument("--kiosk")  # Full-screen mode without toolbars or URL bar
# chrome_options.add_argument("--disable-infobars")  # Disable info bars
# chrome_options.add_argument("--disable-extensions")  # Disable extensions
chrome_options.add_argument("--disable-pinch")  #
chrome_options.add_argument("--overscroll-history-navigation=0")  #overscroll history navigation
chrome_options.add_argument('--disable-features=TouchpadOverscrollHistoryNavigation')



# Initialize the Chrome driver @
chrome_driver_path = "/opt/chromedriver"
service = ChromeService(executable_path=chrome_driver_path)
driver = webdriver.Chrome(service=service, options=chrome_options)


def autoplay(driver_ref):
    try:
        if "AUTOPLAY" in os.environ:
            driver_ref.find_element(By.ID, "mainPlay").click()
    except Exception as err:
            logging.info(f"AUTOPLAY: {err=}")

def main():
    try:
        # Navigate to localhost:3000
        driver.get("http://localhost:3000")

        driver.implicitly_wait(10)

        # Example interaction 1: Find a button by its ID and click i
        autoplay(driver)

        logging.info(f"{os.environ=}")
        while True:
            try:
                logging.info("Chrome music player browser running....")
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