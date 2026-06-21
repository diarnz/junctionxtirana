"""Platform-specific asyncio setup."""

from __future__ import annotations

import asyncio
import os
import selectors


def configure_asyncio() -> None:
    if os.name != "nt":
        return
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
    asyncio.set_event_loop(loop)


configure_asyncio()
