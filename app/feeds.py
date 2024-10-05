import feedparser
from typing import TypedDict
from uuid import UUID, uuid4
from bs4 import BeautifulSoup


class FeedItem(TypedDict):
    title: str
    id: UUID
    link: str
    published: str
    summary: str


feeds: list[str] = ["https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET", "https://reddit.com/r/Suomi.rss"]


def parse_rss(url: str) -> list[FeedItem]:
    raw_feed = feedparser.parse(url)
    feed: list[FeedItem] = []
    for item in raw_feed["entries"]:
        if item["summary"].startswith("<"):
            # Probably HTML, let's strip it
            soup = BeautifulSoup(item["summary"], "html.parser")
            summary = soup.get_text()
        else:
            summary = item["summary"]
        feed_item = FeedItem(title=item["title"], id=uuid4(), link=item["link"], published=item["published"], summary=summary)
        feed.append(feed_item)
    return feed


def add_feed(url: str):
    feeds.append(url)
    return {"message": "Feed added successfully"}


def get_feeds():
    return feeds



