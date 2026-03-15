from typing import Optional, List
from app.database import get_connection
from app.models.category import CategoryCreate, CategoryUpdate


def get_all(type_filter: Optional[str] = None) -> List[dict]:
    conn = get_connection()
    try:
        if type_filter:
            rows = conn.execute(
                "SELECT * FROM categories WHERE type = ? ORDER BY is_default DESC, name",
                (type_filter,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM categories ORDER BY type, is_default DESC, name"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_by_id(category_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM categories WHERE id = ?", (category_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create(dto: CategoryCreate) -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO categories (name, type, color, icon, is_default) VALUES (?, ?, ?, ?, 0)",
            (dto.name, dto.type, dto.color, dto.icon),
        )
        conn.commit()
        return get_by_id(cursor.lastrowid)
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint" in str(e):
            raise ValueError(f"Category '{dto.name}' already exists for type '{dto.type}'")
        raise
    finally:
        conn.close()


def update(category_id: int, dto: CategoryUpdate) -> Optional[dict]:
    existing = get_by_id(category_id)
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
    if dto.icon is not None:
        fields.append("icon = ?")
        values.append(dto.icon)

    if not fields:
        return existing

    values.append(category_id)
    conn = get_connection()
    try:
        conn.execute(
            f"UPDATE categories SET {', '.join(fields)} WHERE id = ?", values
        )
        conn.commit()
        return get_by_id(category_id)
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint" in str(e):
            raise ValueError(f"Category name already exists for this type")
        raise
    finally:
        conn.close()


def delete(category_id: int) -> bool:
    existing = get_by_id(category_id)
    if not existing:
        return False
    if existing["is_default"]:
        raise ValueError("Cannot delete a default category")

    conn = get_connection()
    try:
        conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        conn.commit()
        return True
    finally:
        conn.close()
