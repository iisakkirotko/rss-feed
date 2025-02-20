from contextlib import asynccontextmanager
from fastapi import FastAPI, Form, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import pass_context

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from uuid import UUID, uuid4
from random import shuffle
from typing import TypedDict
from datetime import datetime
from pathlib import Path

import feedparser

from .feeds import FeedItem, add_feed, get_feeds, parse_rss
from .database import metadata, database, engine, items, toggle_like


class CacheItem(TypedDict):
    feed: list[FeedItem]
    cached_at: datetime

cache: dict[str, CacheItem] = {}


async def process_feed():
    feed_content = []
    feeds = await get_feeds()
    for feed in feeds:
        feed_content += await parse_rss(feed["url"])
    shuffle(feed_content)
    return feed_content


async def clear_timed_out_cache():
    for key, value in cache.items():
        if (datetime.now() - value["cached_at"]).seconds > 1800:
            del cache[key]


scheduler = AsyncIOScheduler()


# Create the tables when the application starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(clear_timed_out_cache, IntervalTrigger(minutes=30))
    scheduler.start()
    await database.connect()
    metadata.create_all(engine)
    yield
    scheduler.shutdown()
    await database.disconnect()


# We override HTTP URLs to HTTPS
@pass_context
def https_url_for(context: dict, name: str, **path_params) -> str:
    request = context["request"]
    http_url = request.url_for(name, **path_params)
    if scheme := request.headers.get('x-forwarded-proto'):
        return http_url.replace(scheme=scheme)
    return http_url


app = FastAPI(lifespan=lifespan)
template_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=template_dir)
templates.env.globals['url_for'] = https_url_for


app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")


@app.get("/")
async def read_root(request: Request):
    print("Requesting root", request)
    response = templates.TemplateResponse("index.html", {"request": request})
    session_id = request.cookies.get("session_id", None)
    if session_id is None:
        session_id = str(uuid4())
    response.set_cookie("session_id", session_id, max_age=3600)
    return response


@app.post("/api/add_feed")
async def add_feed_route(url: str):
    return await add_feed(url)


@app.get("/api/feed")
async def get_feed_content(request: Request, lower_bound: int, upper_bound: int):
    id = request.cookies.get("session_id", None)
    if id is None:
        return Response("Session ID not found", status_code=400)
    if id not in cache.keys():
        feed = await process_feed()
        cache[id] = {"feed": feed, "cached_at": datetime.now()}
    return cache[id]["feed"][lower_bound:upper_bound]


@app.post("/api/refresh")
async def refresh_feed(request: Request):
    session_id = request.cookies.get("session_id", None)
    if session_id is None:
        session_id = str(uuid4())

    
    feed = await process_feed()
    cache[session_id] = {"feed": feed, "cached_at": datetime.now()}
    return Response("Feed refreshed").set_cookie("session_id", session_id, max_age=3600)


@app.post("/api/end_session")
async def end_session(request: Request):
    session_id = request.cookies.get("session_id", None)
    if session_id is not None:
        del cache[session_id]
        return {"message": "Session ended"}
    else:
        return Response("Session ID not found", status_code=400)


@app.post("/api/like")
async def like_feed_item(request: Request, id: str):
    session_id = request.cookies.get("session_id", None)
    if session_id is None:
        return Response("Session ID not found", status_code=400)
    
    try:
        item_after = await toggle_like(UUID(id))
        
        feed = cache[session_id]["feed"]
        new_feed = []
        for item in feed:
            if item["id"] == UUID(id):
                item = item_after
            new_feed.append(item)
        cache[session_id] = {"feed": new_feed, "cached_at": datetime.now()}
    
        if item_after["liked"]:
            response = Response(f"Feed item {id} liked successfully")
        response = Response(f"Like removed from item {id} successfully")
        return response.set_cookie("session_id", session_id, max_age=3600)
    
    except Exception as e:
        print("ERRROR", e)
        return Response(f"Failed to like item {id}: {e}", status_code=500)


@app.post("/api/hide")
async def hide_feed_item(request: Request, id: str):
    session_id = request.cookies.get("session_id", None)
    if session_id is None:
        return Response("Session ID not found", status_code=400)
    
    # We also want to ensure that the item is not liked
    query = items.update().where(items.c.id == UUID(id)).values(hidden=True, liked=False)
    await database.execute(query)
    return Response(f"Feed item {id} hidden successfully").set_cookie("session_id", session_id, max_age=3600)


@app.get("/api/onething")
async def get_onething():
    feed = feedparser.parse("https://old.reddit.com/r/Suomi.rss?limit=100")
    return {"length": len(feed["entries"]), "first": feed["entries"][0]}


@app.get("/api/get_db")
async def get_db():
    query = items.select()
    return await database.fetch_all(query)
