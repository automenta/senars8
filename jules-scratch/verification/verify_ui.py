import time
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        time.sleep(5) # Wait for server to start
        page.goto("http://localhost:5173/")

        # 1. Initial screenshot
        page.screenshot(path="jules-scratch/verification/01_initial_layout.png")

        # 2. Interact with the input panel
        input_area = page.locator(".narsese-input")
        expect(input_area).to_be_visible()

        test_command = "<cat --> animal>."
        input_area.fill(test_command)

        send_button = page.get_by_title("Send")
        send_button.click()

        # Screenshot after sending command
        page.screenshot(path="jules-scratch/verification/02_after_input.png")

        # 3. Check notifications
        page.screenshot(path="jules-scratch/verification/02a_before_notification_click.png")
        notifications_tab = page.locator('.flexlayout__tab_button_content:has-text("Notifs")')
        notifications_tab.click()

        # Screenshot of the notifications panel
        page.screenshot(path="jules-scratch/verification/03_notifications_panel.png")

    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
