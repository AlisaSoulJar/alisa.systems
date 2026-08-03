from playwright.sync_api import sync_playwright
import time
import os

ARTIFACTS_DIR = r"C:\Users\Oscar\.gemini\antigravity-cli\brain\ea584ef2-e512-45e4-9b84-37c779c3de4f"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        logs = []
        page.on("console", lambda msg: logs.append(f"CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: logs.append(f"ERROR: {err}"))
        
        # Check index
        print("Checking index...")
        page.goto("http://127.0.0.1:8000/")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "index_screenshot.png"))
        
        # Check arcade index
        print("Checking arcade index...")
        page.goto("http://127.0.0.1:8000/arcade/index.html")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "arcade_screenshot.png"))
        
        # Check entropy
        print("Checking entropy...")
        page.goto("http://127.0.0.1:8000/arcade/entropy.html")
        page.wait_for_timeout(3000)
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "entropy_screenshot.png"))
        
        browser.close()
        
        with open(os.path.join(ARTIFACTS_DIR, "ui_logs.md"), "w") as f:
            f.write("# Console Logs\n")
            for log in logs:
                f.write(f"- {log}\n")
        print("Done!")

if __name__ == "__main__":
    run()
