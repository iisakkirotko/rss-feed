from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .feeds import add_feed, get_feeds, parse_rss

app = FastAPI()
templates = Jinja2Templates(directory="templates")


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/add_feed")
def add_feed_route(url: str):
    return add_feed(url)


@app.get("/api/feed")
async def get_feed_content(lower_bound: int, upper_bound: int):
    feed_content = []
    for feed in get_feeds():
        print(feed)
        parsed_feed = parse_rss(feed)
        feed_content.extend(parsed_feed["entries"][lower_bound:upper_bound])
    return feed_content