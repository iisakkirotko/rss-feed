from sqlalchemy import create_engine, MetaData, Table, Column, UUID, String, Integer
from databases import Database
import uuid

DATABASE_URL = "sqlite:///./items.db"

database = Database(DATABASE_URL)
metadata = MetaData()

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

items = Table(
    "items",
    metadata,
    Column("title", String),
    Column("id", UUID, primary_key=True, server_default="gen_random_uuid()"),
    Column("guid", String, unique=True),
    Column("link", String),
    Column("published", String),
    Column("summary", String),
    Column("media", String),
    Column("liked", Integer, nullable=False, default=0, server_default="0"),
    Column("hidden", Integer, nullable=False, default=0, server_default="0"),
)

feeds = Table(
    "feeds",
    metadata,
    Column("url", String, primary_key=True),
)

async def toggle_like(id: uuid.UUID):
    query = items.update().where(items.c.id == id).values(liked=1 - items.c.liked).returning(*items.c)
    return await database.fetch_one(query)