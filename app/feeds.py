import feedparser
from typing import TypedDict
from uuid import UUID, uuid4
from bs4 import BeautifulSoup

from .utils import record_to_guid
from .database import items, database, feeds

class FeedItem(TypedDict):
    title: str
    id: UUID
    guid: str # Original ID from the fetch. Should use this to guarantee uniqueness
    link: str
    published: str
    summary: str
    media: str | None # Only one image for now
    liked: int # 0 or 1
    hidden: int # 0 or 1


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

    if feed != []:
        try:
            query = items.insert().values(feed)
            await database.execute(query)
        except Exception as e:
            print(f"Failed to insert feed: {e}, feed was: {feed}")

    guid_feed = []
    if guids_to_fetch != []:
        try:
            guids_query = items.select().where(items.c.guid.in_(guids_to_fetch))
            guid_feed = await database.fetch_all(guids_query)
        except Exception as e:
            print(f"Failed to fetch guids: {e}")
    
    return_feed: list[FeedItem] = feed + guid_feed # type: ignore
    return  return_feed


async def add_feed(url: str):
    try:
        await database.execute(feeds.insert().values(url=url))
    except Exception as e:
        return {"message": f"Failed to add feed: {e}"}
    return {"message": "Feed added successfully"}


async def get_feeds():
    feeds_list = await database.fetch_all(feeds.select())
    if feeds_list == []:
        # Insert default values
        def_feeds = ["https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET", "https://old.reddit.com/r/Suomi.rss?limit=100", "https://feeds.nos.nl/nosnieuwsalgemeen", "https://feeds.nos.nl/nosnieuwspolitiek"]
        defaults = [{"url": url} for url in def_feeds]
        query = feeds.insert().values(defaults)
        await database.execute(query)
        return defaults
    return feeds_list
