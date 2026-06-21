import asyncio
import os
import selectors

import uvicorn

from app.config import settings


async def _serve() -> None:
    port = int(os.environ.get("PORT", "8082"))
    config = uvicorn.Config(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="debug" if settings.DEBUG else "info",
    )
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    if os.name == "nt":
        # Psycopg async requires SelectorEventLoop on Windows (Python 3.14+).
        asyncio.run(_serve(), loop_factory=asyncio.SelectorEventLoop)
    else:
        asyncio.run(_serve())
