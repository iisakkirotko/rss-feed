import feedparser
from typing import TypedDict
from uuid import UUID, uuid4
from bs4 import BeautifulSoup

from .utils import record_to_guid
from .database import items, database

class FeedItem(TypedDict):
    title: str
    id: UUID
    guid: str # Original ID from the fetch. Should use this to guarantee uniqueness
    link: str
    published: str
    summary: str
    media: str | None # Only one image for now
    liked: bool
    hidden: bool


feeds: list[str] = ["https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET", "https://reddit.com/r/Suomi.rss"]


async def parse_rss(url: str) -> list[FeedItem]:
    existing_guids_records = await database.fetch_all(items.select().with_only_columns(items.c.guid))
    existing_guids = record_to_guid(existing_guids_records)
    guids_to_fetch = []
    raw_feed = feedparser.parse(url)
    feed: list[FeedItem] = []
    for item in raw_feed["entries"]:
        if item["guid"] in existing_guids:
            guids_to_fetch.append(item["guid"])
            continue
        media = None
        if "media_thumbnail" in item:
            media = item["media_thumbnail"][0]["url"]
        if item["summary"].startswith("<"):
            # Probably HTML, let's strip it
            soup = BeautifulSoup(item["summary"], "html.parser")
            summary = soup.get_text()
        else:
            summary = item["summary"]
        feed_item = FeedItem(
            title=item["title"],
            id=uuid4(),
            guid=item["guid"] or str(uuid4()),
            link=item["link"],
            published=item["published"],
            summary=summary,
            media=media,
            liked=False,
            hidden=False,
            )
        feed.append(feed_item)

    if feed == []:
        query = items.insert().values(feed)
        await database.execute(query)

    guid_feed = []
    if guids_to_fetch != []:
        guids_query = items.select().where(items.c.guid.in_(guids_to_fetch))
        guid_feed = await database.fetch_all(guids_query)
    
    return_feed: list[FeedItem] = feed + guid_feed # type: ignore
    return  return_feed


def add_feed(url: str):
    feeds.append(url)
    return {"message": "Feed added successfully"}


def get_feeds():
    return feeds



