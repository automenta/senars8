from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    try:
        # Navigate to the application's home page.
        page.goto("http://localhost:5173/")

        # Wait for the main header to be visible to ensure the page has loaded.
        # The correct header text is "SeNARS IDE".
        header = page.get_by_role("heading", name="SeNARS IDE", exact=True)
        expect(header).to_be_visible(timeout=10000) # Wait up to 10 seconds

        # Take a screenshot to visually verify the UI.
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Add a screenshot on failure to help debug
        page.screenshot(path="jules-scratch/verification/failure_screenshot.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)