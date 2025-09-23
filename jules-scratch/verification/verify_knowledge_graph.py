from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:5173")

    # Wait for the layout to be ready
    expect(page.locator(".flexlayout__layout")).to_be_visible()

    # Find the Narsese input and send a belief
    page.get_by_label("Narsese Input").fill("<a --> b>.")
    page.get_by_role("button", name="Send").click()

    # Wait for the graph to be updated
    expect(page.locator(".react-flow__node")).to_have_count(2)
    expect(page.locator(".react-flow__edge")).to_have_count(1)

    page.screenshot(path="jules-scratch/verification/knowledge_graph.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
