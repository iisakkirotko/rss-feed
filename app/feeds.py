import feedparser
from typing import TypedDict
from uuid import UUID


class FeedItem(TypedDict):
    title: str
    id: UUID
    link: str
    published: str
    summary: str


feeds: list[str] = ["https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET", "https://reddit.com/r/Suomi.rss"]


def parse_rss(url: str) -> list[FeedItem]:
    return feedparser.parse(url)


def add_feed(url: str):
    feeds.append(url)
    return {"message": "Feed added successfully"}


def get_feeds():
    return feeds



