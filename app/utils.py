from databases.interfaces import Record

def record_to_guid(records: list[Record]):
    return [record["guid"] for record in records]