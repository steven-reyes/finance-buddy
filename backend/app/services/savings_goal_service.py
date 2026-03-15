from typing import Optional, List
from app.database import get_connection
from app.models.savings_goal import SavingsGoalCreate, SavingsGoalUpdate, ContributionCreate


def _compute_goal(row: dict) -> dict:
    d = dict(row)
    target = d["target_amount"]
    current = d["current_amount"]
    d["percentage"] = round((current / target * 100) if target > 0 else 0, 1)
    return d


def get_all() -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT sg.*, COALESCE(SUM(sgc.amount), 0) as current_amount "
            "FROM savings_goals sg "
            "LEFT JOIN savings_goal_contributions sgc ON sgc.goal_id = sg.id "
            "GROUP BY sg.id "
            "ORDER BY sg.is_completed, sg.name"
        ).fetchall()
        return [_compute_goal(r) for r in rows]
    finally:
        conn.close()


def get_by_id(goal_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT sg.*, COALESCE(SUM(sgc.amount), 0) as current_amount "
            "FROM savings_goals sg "
            "LEFT JOIN savings_goal_contributions sgc ON sgc.goal_id = sg.id "
            "WHERE sg.id = ? "
            "GROUP BY sg.id",
            (goal_id,),
        ).fetchone()
        if not row:
            return None
        return _compute_goal(row)
    finally:
        conn.close()


def create(dto: SavingsGoalCreate) -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO savings_goals (name, target_amount, deadline, icon) VALUES (?, ?, ?, ?)",
            (dto.name, dto.target_amount, dto.deadline, dto.icon),
        )
        conn.commit()
        return get_by_id(cursor.lastrowid)
    finally:
        conn.close()


def update(goal_id: int, dto: SavingsGoalUpdate) -> Optional[dict]:
    existing = get_by_id(goal_id)
    if not existing:
        return None

    fields = []
    values = []
    update_data = dto.model_dump(exclude_unset=True)

    for key in ["name", "target_amount", "deadline", "icon", "is_completed"]:
        if key in update_data:
            fields.append(f"{key} = ?")
            values.append(update_data[key])

    if not fields:
        return existing

    values.append(goal_id)
    conn = get_connection()
    try:
        conn.execute(f"UPDATE savings_goals SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        return get_by_id(goal_id)
    finally:
        conn.close()


def delete(goal_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM savings_goals WHERE id = ?", (goal_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_contributions(goal_id: int) -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM savings_goal_contributions WHERE goal_id = ? ORDER BY date DESC",
            (goal_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def add_contribution(goal_id: int, dto: ContributionCreate) -> dict:
    # Verify goal exists
    goal = get_by_id(goal_id)
    if not goal:
        raise ValueError("Savings goal not found")

    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO savings_goal_contributions (goal_id, amount, date, note, transaction_id) "
            "VALUES (?, ?, ?, ?, ?)",
            (goal_id, dto.amount, dto.date, dto.note, dto.transaction_id),
        )
        conn.commit()
        cid = cursor.lastrowid

        # Update current_amount on savings_goals table
        total = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM savings_goal_contributions WHERE goal_id = ?",
            (goal_id,),
        ).fetchone()["total"]
        conn.execute(
            "UPDATE savings_goals SET current_amount = ? WHERE id = ?",
            (total, goal_id),
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM savings_goal_contributions WHERE id = ?", (cid,)
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def delete_contribution(goal_id: int, contribution_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM savings_goal_contributions WHERE id = ? AND goal_id = ?",
            (contribution_id, goal_id),
        )
        conn.commit()
        if cursor.rowcount > 0:
            # Update current_amount
            total = conn.execute(
                "SELECT COALESCE(SUM(amount), 0) as total FROM savings_goal_contributions WHERE goal_id = ?",
                (goal_id,),
            ).fetchone()["total"]
            conn.execute(
                "UPDATE savings_goals SET current_amount = ? WHERE id = ?",
                (total, goal_id),
            )
            conn.commit()
            return True
        return False
    finally:
        conn.close()
