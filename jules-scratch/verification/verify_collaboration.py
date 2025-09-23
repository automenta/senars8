import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()

    # Create two contexts for two users
    user1_context = browser.new_context()
    user2_context = browser.new_context()

    # Create pages for each user
    user1_page = user1_context.new_page()
    user2_page = user2_context.new_page()

    try:
        # Both users navigate to the app
        user1_page.goto("http://localhost:5173")
        user2_page.goto("http://localhost:5173")

        # Find the NarseseInput component for both users
        # The input is inside a div with class 'narsese-input-container'
        user1_input = user1_page.locator('.narsese-input-container textarea')
        user2_input = user2_page.locator('.narsese-input-container textarea')

        # Expect the inputs to be initially empty
        expect(user1_input).to_have_value('')
        expect(user2_input).to_have_value('')

        # User 1 types a message
        user1_input.type("Hello from User 1!")

        # Expect User 2's input to be updated with User 1's message
        expect(user2_input).to_have_value("Hello from User 1!")

        # User 2 adds to the message
        user2_input.type(" Hello from User 2!")

        # Expect User 1's input to be updated with the full message
        expect(user1_input).to_have_value("Hello from User 1! Hello from User 2!")

        # Take a screenshot of user 1's page
        user1_page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        user1_context.close()
        user2_context.close()
        browser.close()

with sync_playwright() as p:
    run(p)
