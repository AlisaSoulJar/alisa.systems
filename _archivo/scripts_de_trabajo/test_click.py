import asyncio
import sys
# Fix encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Log all console messages
        page.on('console', lambda msg: print(f'CONSOLE: {msg.text}'))
        
        print('Navigating to room_pocket_blanco.html...')
        await page.goto('http://127.0.0.1:8000/rooms/room_pocket_blanco.html?id=Raccoon')
        
        print('Waiting 5 seconds for materialization and auto-sit...')
        await asyncio.sleep(5)
        
        print('Clicking the center of the screen to trigger usarLoQueMiro()...')
        await page.mouse.click(500, 300)
        
        print('Waiting 2 seconds for redirect...')
        await asyncio.sleep(2)
        
        print('Current URL:', page.url)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
