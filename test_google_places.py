import asyncio
import os
import sys
from dotenv import load_dotenv

# Add backend to path so imports work
sys.path.append('/Users/ivanlevy/Desktop/smartleads')

load_dotenv('/Users/ivanlevy/Desktop/smartleads/backend/.env')

from backend.google_places_client import google_client

async def main():
    print(f"API KEY: {google_client.api_key[:10]}...")
    res = await google_client.search_all_places("Software en Buenos Aires", "Software", "software")
    print(f"Found {len(res)} results")
    if res:
        print(f"First result: {res[0].get('nombre')}")
    else:
        print("No results found.")

asyncio.run(main())
