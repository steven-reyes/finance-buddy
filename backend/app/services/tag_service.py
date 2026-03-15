from typing import Optional, List
from app.database import get_connection
from app.models.tag import TagCreate, TagUpdate


def get_all() -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM tags ORDER BY name").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_by_id(tag_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM tags WHERE id = ?", (tag_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create(dto: TagCreate) -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO tags (name, color) VALUES (?, ?)",
            (dto.name, dto.color),
        )
        conn.commit()
        return get_by_id(cursor.lastrowid)
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint" in str(e):
            raise ValueError(f"Tag '{dto.name}' already exists")
        raise
    finally:
        conn.close()


def update(tag_id: int, dto: TagUpdate) -> Optional[dict]:
    existing = get_by_id(tag_id)
    if not existing:
        return None

    fields = []
    values = []
    if dto.name is not None:
        fields.append("name = ?")
        values.append(dto.name)
    if dto.color is not None:
        fields.append("color = ?")
        values.append(dto.color)

    if not fields:
        return existing

    values.append(tag_id)
    conn = get_connection()
    try:
        conn.execute(f"UPDATE tags SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        return get_by_id(tag_id)
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint" in str(e):
            raise ValueError(f"Tag name already exists")
        raise
    finally:
        conn.close()


def delete(tag_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def set_transaction_tags(transaction_id: int, tag_ids: List[int]):
    conn = get_connection()
    try:
        conn.execute(
            "DELETE FROM transaction_tags WHERE transaction_id = ?",
            (transaction_id,),
        )
        for tag_id in tag_ids:
            conn.execute(
                "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)",
                (transaction_id, tag_id),
            )
        conn.commit()
    finally:
        conn.close()
