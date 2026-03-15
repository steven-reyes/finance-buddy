from typing import Optional, List
from datetime import datetime, date
from math import ceil
from app.database import get_connection
from app.models.debt import DebtCreate, DebtUpdate, DebtPaymentCreate

# Auto-assign priority based on debt type
TYPE_PRIORITY_MAP = {
    'bill_arrears': 1,
    'advance': 2,
    'loan': 3,
    'credit_card': 4,
    'personal': 5,
    'medical': 6,
    'other': 7,
}

# Default monthly essentials estimate (in cents): $400
DEFAULT_ESSENTIALS_ESTIMATE = 40000


def _format_dollars(cents: int) -> str:
    """Format cents as a dollar string like $1,360."""
    negative = cents < 0
    cents = abs(cents)
    dollars = cents // 100
    formatted = f"${dollars:,}"
    if negative:
        formatted = f"-{formatted}"
    return formatted


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def get_all(status_filter: Optional[str] = None) -> List[dict]:
    conn = get_connection()
    try:
        query = (
            "SELECT d.*, "
            "COALESCE((SELECT SUM(dp.amount) FROM debt_payments dp WHERE dp.debt_id = d.id), 0) as total_paid "
            "FROM debts d"
        )
        params = []
        if status_filter:
            query += " WHERE d.status = ?"
            params.append(status_filter)
        query += " ORDER BY d.priority ASC, d.current_balance ASC"
        rows = conn.execute(query, params).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["is_auto_deduct"] = bool(d["is_auto_deduct"])
            results.append(d)
        return results
    finally:
        conn.close()


def get_by_id(debt_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT d.*, "
            "COALESCE((SELECT SUM(dp.amount) FROM debt_payments dp WHERE dp.debt_id = d.id), 0) as total_paid "
            "FROM debts d WHERE d.id = ?",
            (debt_id,),
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["is_auto_deduct"] = bool(d["is_auto_deduct"])
        # Include payment history
        payments = conn.execute(
            "SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC, id DESC",
            (debt_id,),
        ).fetchall()
        d["payments"] = [dict(p) for p in payments]
        return d
    finally:
        conn.close()


def create(dto: DebtCreate) -> dict:
    conn = get_connection()
    try:
        # Auto-assign priority from type
        priority = TYPE_PRIORITY_MAP.get(dto.type, dto.priority)
        cursor = conn.execute(
            "INSERT INTO debts (name, type, creditor, original_amount, current_balance, "
            "minimum_payment, interest_rate, due_day, priority, is_auto_deduct, notes) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                dto.name, dto.type, dto.creditor, dto.original_amount,
                dto.current_balance, dto.minimum_payment, dto.interest_rate,
                dto.due_day, priority, int(dto.is_auto_deduct), dto.notes,
            ),
        )
        conn.commit()
        debt_id = cursor.lastrowid
        return get_by_id(debt_id)
    finally:
        conn.close()


def update(debt_id: int, dto: DebtUpdate) -> Optional[dict]:
    conn = get_connection()
    try:
        existing = conn.execute("SELECT * FROM debts WHERE id = ?", (debt_id,)).fetchone()
        if not existing:
            return None

        fields = []
        values = []
        update_data = dto.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "is_auto_deduct" and value is not None:
                fields.append(f"{key} = ?")
                values.append(int(value))
            else:
                fields.append(f"{key} = ?")
                values.append(value)

        if not fields:
            return get_by_id(debt_id)

        fields.append("updated_at = datetime('now')")
        values.append(debt_id)

        conn.execute(
            f"UPDATE debts SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        conn.commit()
        return get_by_id(debt_id)
    finally:
        conn.close()


def delete(debt_id: int) -> bool:
    conn = get_connection()
    try:
        existing = conn.execute("SELECT id FROM debts WHERE id = ?", (debt_id,)).fetchone()
        if not existing:
            return False
        conn.execute("DELETE FROM debts WHERE id = ?", (debt_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def add_payment(debt_id: int, dto: DebtPaymentCreate) -> Optional[dict]:
    conn = get_connection()
    try:
        debt = conn.execute("SELECT * FROM debts WHERE id = ?", (debt_id,)).fetchone()
        if not debt:
            return None

        conn.execute(
            "INSERT INTO debt_payments (debt_id, amount, date, note) VALUES (?, ?, ?, ?)",
            (debt_id, dto.amount, dto.date, dto.note),
        )

        new_balance = max(0, debt["current_balance"] - dto.amount)
        new_status = "paid_off" if new_balance == 0 else debt["status"]

        conn.execute(
            "UPDATE debts SET current_balance = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
            (new_balance, new_status, debt_id),
        )
        conn.commit()
        return get_by_id(debt_id)
    finally:
        conn.close()


def get_payments(debt_id: int) -> Optional[List[dict]]:
    conn = get_connection()
    try:
        debt = conn.execute("SELECT id FROM debts WHERE id = ?", (debt_id,)).fetchone()
        if not debt:
            return None
        rows = conn.execute(
            "SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC, id DESC",
            (debt_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Smart Features
# ---------------------------------------------------------------------------

def get_summary() -> dict:
    conn = get_connection()
    try:
        active_debts = conn.execute(
            "SELECT d.*, "
            "COALESCE((SELECT SUM(dp.amount) FROM debt_payments dp WHERE dp.debt_id = d.id), 0) as total_paid "
            "FROM debts d WHERE d.status = 'active' ORDER BY d.priority ASC"
        ).fetchall()

        total_debts = len(active_debts)
        total_owed = sum(d["current_balance"] for d in active_debts)
        total_minimum_monthly = sum(d["minimum_payment"] for d in active_debts)

        # Monthly interest cost: sum of (balance * monthly_rate) for each debt
        monthly_interest_cost = 0
        for d in active_debts:
            if d["interest_rate"] > 0:
                monthly_rate = d["interest_rate"] / 100 / 12
                monthly_interest_cost += int(d["current_balance"] * monthly_rate)

        # Group debts by priority
        debts_by_priority = {}
        for d in active_debts:
            p = d["priority"]
            if p not in debts_by_priority:
                debts_by_priority[p] = []
            debt_dict = dict(d)
            debt_dict["is_auto_deduct"] = bool(debt_dict["is_auto_deduct"])
            debts_by_priority[p].append(debt_dict)

        return {
            "total_debts": total_debts,
            "total_owed": total_owed,
            "total_minimum_monthly": total_minimum_monthly,
            "monthly_interest_cost": monthly_interest_cost,
            "debts_by_priority": debts_by_priority,
        }
    finally:
        conn.close()


def get_payoff_plan(strategy: str = "avalanche", extra_monthly: int = 0) -> dict:
    """Calculate payoff timeline using avalanche or snowball strategy.

    Args:
        strategy: 'avalanche' (highest interest first) or 'snowball' (smallest balance first)
        extra_monthly: additional cents per month beyond minimums to allocate
    """
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM debts WHERE status = 'active' ORDER BY priority ASC"
        ).fetchall()

        if not rows:
            return {"strategy": strategy, "debts": [], "total_months": 0, "total_interest": 0}

        debts = []
        for r in rows:
            debts.append({
                "id": r["id"],
                "name": r["name"],
                "type": r["type"],
                "creditor": r["creditor"],
                "current_balance": r["current_balance"],
                "minimum_payment": r["minimum_payment"],
                "interest_rate": r["interest_rate"],
                "priority": r["priority"],
                "is_auto_deduct": bool(r["is_auto_deduct"]),
            })

        # Sort target order based on strategy
        if strategy == "avalanche":
            # Highest interest rate first (desc)
            target_order = sorted(debts, key=lambda d: (-d["interest_rate"], d["current_balance"]))
        else:
            # Smallest balance first (asc)
            target_order = sorted(debts, key=lambda d: (d["current_balance"], -d["interest_rate"]))

        # Simulate month-by-month payoff
        balances = {d["id"]: d["current_balance"] for d in debts}
        total_interest = {d["id"]: 0 for d in debts}
        payoff_month = {d["id"]: 0 for d in debts}
        month = 0
        max_months = 360  # 30-year cap

        while any(b > 0 for b in balances.values()) and month < max_months:
            month += 1

            # Apply interest first
            for d in debts:
                if balances[d["id"]] > 0 and d["interest_rate"] > 0:
                    monthly_rate = d["interest_rate"] / 100 / 12
                    interest = int(balances[d["id"]] * monthly_rate)
                    balances[d["id"]] += interest
                    total_interest[d["id"]] += interest

            # Pay minimums on all debts
            freed_extra = 0
            for d in debts:
                if balances[d["id"]] > 0:
                    payment = min(d["minimum_payment"], balances[d["id"]])
                    balances[d["id"]] -= payment
                    if balances[d["id"]] == 0:
                        payoff_month[d["id"]] = month
                        freed_extra += d["minimum_payment"] - payment
                elif payoff_month[d["id"]] > 0 and payoff_month[d["id"]] < month:
                    # This debt was paid off in a prior month; freed minimum goes to extra
                    freed_extra += d["minimum_payment"]

            # Apply extra payment to target debt in strategy order
            available_extra = extra_monthly + freed_extra
            for target in target_order:
                if balances[target["id"]] > 0 and available_extra > 0:
                    payment = min(available_extra, balances[target["id"]])
                    balances[target["id"]] -= payment
                    available_extra -= payment
                    if balances[target["id"]] == 0:
                        payoff_month[target["id"]] = month

        # Build result
        today = date.today()
        result_debts = []
        for d in debts:
            months = payoff_month[d["id"]] if payoff_month[d["id"]] > 0 else max_months
            # Estimate payoff date
            payoff_year = today.year + (today.month + months - 1) // 12
            payoff_m = (today.month + months - 1) % 12 + 1
            estimated_date = f"{payoff_year}-{payoff_m:02d}"

            result_debts.append({
                "id": d["id"],
                "name": d["name"],
                "type": d["type"],
                "creditor": d["creditor"],
                "current_balance": d["current_balance"],
                "minimum_payment": d["minimum_payment"],
                "interest_rate": d["interest_rate"],
                "months_to_payoff": months,
                "estimated_payoff_date": estimated_date,
                "total_interest_paid": total_interest[d["id"]],
            })

        total_months = max((payoff_month[d["id"]] or max_months) for d in debts) if debts else 0
        grand_total_interest = sum(total_interest.values())

        return {
            "strategy": strategy,
            "extra_monthly": extra_monthly,
            "debts": result_debts,
            "total_months": total_months,
            "total_interest": grand_total_interest,
        }
    finally:
        conn.close()


def allocate_paycheck(paycheck_amount: int, pay_date: str) -> dict:
    """Smart paycheck allocation in priority order."""
    conn = get_connection()
    try:
        active_debts = conn.execute(
            "SELECT * FROM debts WHERE status = 'active' ORDER BY priority ASC, current_balance ASC"
        ).fetchall()
        active_debts = [dict(d) for d in active_debts]

        remaining = paycheck_amount
        allocations = []
        shortfall = 0

        def allocate(label: str, amount: int, category: str, debt_id: Optional[int] = None):
            nonlocal remaining
            actual = min(amount, max(remaining, 0))
            deficit = amount - actual
            allocations.append({
                "label": label,
                "amount_requested": amount,
                "amount_allocated": actual,
                "deficit": deficit,
                "category": category,
                "debt_id": debt_id,
                "running_remaining": max(remaining - actual, 0),
            })
            remaining -= actual
            return deficit

        # 1. Auto-deductions first (advances -- taken before you see the money)
        for d in active_debts:
            if d["is_auto_deduct"] and d["current_balance"] > 0:
                amount = min(d["minimum_payment"] if d["minimum_payment"] > 0 else d["current_balance"],
                             d["current_balance"])
                deficit = allocate(
                    f"Auto-deduct: {d['name']} ({d['creditor']})",
                    amount,
                    "auto_deduct",
                    d["id"],
                )
                shortfall += deficit

        # 2. Housing arrears (priority 1 -- bill_arrears type or priority 1)
        for d in active_debts:
            if d["is_auto_deduct"]:
                continue
            if d["priority"] == 1 and d["current_balance"] > 0:
                amount = d["minimum_payment"] if d["minimum_payment"] > 0 else d["current_balance"]
                amount = min(amount, d["current_balance"])
                deficit = allocate(
                    f"Housing/Critical: {d['name']} ({d['creditor']})",
                    amount,
                    "housing_critical",
                    d["id"],
                )
                shortfall += deficit

        # 3. Utility bills in arrears (priority 2)
        for d in active_debts:
            if d["is_auto_deduct"] or d["priority"] <= 1:
                continue
            if d["priority"] == 2 and d["current_balance"] > 0:
                amount = d["minimum_payment"] if d["minimum_payment"] > 0 else d["current_balance"]
                amount = min(amount, d["current_balance"])
                deficit = allocate(
                    f"Utility arrears: {d['name']} ({d['creditor']})",
                    amount,
                    "utility_arrears",
                    d["id"],
                )
                shortfall += deficit

        # 4. Minimum payments on all remaining active debts
        already_allocated_ids = {a["debt_id"] for a in allocations if a["debt_id"] is not None}
        for d in active_debts:
            if d["id"] in already_allocated_ids:
                continue
            if d["minimum_payment"] > 0 and d["current_balance"] > 0:
                amount = min(d["minimum_payment"], d["current_balance"])
                deficit = allocate(
                    f"Minimum payment: {d['name']} ({d['creditor']})",
                    amount,
                    "minimum_payment",
                    d["id"],
                )
                shortfall += deficit

        # 5. Estimated essentials (food + transport)
        # Try to detect from budget data, otherwise use default
        essentials_estimate = DEFAULT_ESSENTIALS_ESTIMATE
        try:
            budget_row = conn.execute(
                "SELECT COALESCE(SUM(b.limit_amount), 0) as total "
                "FROM budgets b JOIN categories c ON b.category_id = c.id "
                "WHERE c.name IN ('Groceries', 'Transportation') "
                "AND b.month = strftime('%Y-%m', ?)",
                (pay_date,),
            ).fetchone()
            if budget_row and budget_row["total"] > 0:
                # Use half of monthly budget since this is one paycheck (assume biweekly)
                essentials_estimate = budget_row["total"] // 2
        except Exception:
            pass

        deficit = allocate("Essentials (food + transport)", essentials_estimate, "essentials")
        shortfall += deficit

        # 6. Extra payment on target debt (avalanche strategy: highest interest first)
        if remaining > 0:
            # Find the highest-interest active debt that still has balance
            target_debts = sorted(active_debts, key=lambda d: (-d["interest_rate"], d["current_balance"]))
            for d in target_debts:
                if d["current_balance"] > 0 and remaining > 0:
                    # Subtract what we've already allocated to this debt
                    already_for_this = sum(
                        a["amount_allocated"] for a in allocations if a["debt_id"] == d["id"]
                    )
                    remaining_balance = d["current_balance"] - already_for_this
                    if remaining_balance > 0:
                        extra = min(remaining, remaining_balance)
                        allocate(
                            f"Extra payment: {d['name']} (highest interest {d['interest_rate']}%)",
                            extra,
                            "extra_payment",
                            d["id"],
                        )
                        break  # Only target one debt with extra

        # 7. Remaining buffer
        buffer_amount = max(remaining, 0)

        # Shortfall warning
        shortfall_warning = None
        if shortfall > 0:
            shortfall_warning = (
                f"Paycheck of {_format_dollars(paycheck_amount)} does not cover all obligations. "
                f"Shortfall: {_format_dollars(shortfall)}. Consider negotiating payment plans or "
                f"deferring lower-priority debts."
            )

        return {
            "paycheck_amount": paycheck_amount,
            "pay_date": pay_date,
            "allocations": allocations,
            "total_allocated": paycheck_amount - buffer_amount,
            "buffer_remaining": buffer_amount,
            "shortfall": shortfall,
            "shortfall_warning": shortfall_warning,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------

def get_debt_insights() -> dict:
    """Return smart debt-related tips and analysis."""
    conn = get_connection()
    try:
        active_debts = conn.execute(
            "SELECT * FROM debts WHERE status = 'active' ORDER BY priority ASC"
        ).fetchall()
        active_debts = [dict(d) for d in active_debts]

        if not active_debts:
            return {"insights": [], "summary": "No active debts. You're debt-free!"}

        insights = []

        total_owed = sum(d["current_balance"] for d in active_debts)
        total_minimum = sum(d["minimum_payment"] for d in active_debts)

        # Detect monthly income
        from app.services.dashboard_service import detect_monthly_income
        income_info = detect_monthly_income()
        monthly_income = income_info["detected_income"]

        # Debt-to-income ratio
        if monthly_income > 0 and total_minimum > 0:
            dti_ratio = round(total_minimum / monthly_income * 100, 1)
            severity = "info"
            if dti_ratio > 50:
                severity = "negative"
            elif dti_ratio > 30:
                severity = "warning"
            insights.append({
                "type": severity,
                "category": "debt_to_income",
                "message": f"Debt-to-income ratio: {dti_ratio}% (monthly payments {_format_dollars(total_minimum)} vs income {_format_dollars(monthly_income)})",
                "value": dti_ratio,
            })

        # Debt-free date estimate
        if total_minimum > 0:
            # Simple estimate: total_owed / total_minimum = months (ignoring interest)
            months_simple = ceil(total_owed / total_minimum) if total_minimum > 0 else 0
            # Factor in interest for a more accurate estimate
            monthly_interest = 0
            for d in active_debts:
                if d["interest_rate"] > 0:
                    monthly_interest += int(d["current_balance"] * d["interest_rate"] / 100 / 12)
            net_monthly = total_minimum - monthly_interest
            if net_monthly > 0:
                months_adjusted = ceil(total_owed / net_monthly)
            else:
                months_adjusted = 0  # Payments don't cover interest

            today = date.today()
            if months_adjusted > 0 and months_adjusted < 360:
                target_year = today.year + (today.month + months_adjusted - 1) // 12
                target_month = (today.month + months_adjusted - 1) % 12 + 1
                insights.append({
                    "type": "info",
                    "category": "payoff_date",
                    "message": f"At current minimum payments, debt-free by {target_year}-{target_month:02d} ({months_adjusted} months)",
                    "value": months_adjusted,
                })
            elif net_monthly <= 0 and monthly_interest > 0:
                insights.append({
                    "type": "negative",
                    "category": "payoff_date",
                    "message": "Minimum payments don't cover monthly interest. Debt is growing. Increase payments to make progress.",
                    "value": -1,
                })

        # Extra payment savings on highest-interest debt
        highest_interest = max(active_debts, key=lambda d: d["interest_rate"])
        if highest_interest["interest_rate"] > 0 and highest_interest["current_balance"] > 0:
            # Calculate savings from $50 extra/month
            extra_monthly = 5000  # $50 in cents
            balance = highest_interest["current_balance"]
            monthly_rate = highest_interest["interest_rate"] / 100 / 12
            min_pay = highest_interest["minimum_payment"]

            # With minimum only
            months_min = _months_to_payoff(balance, min_pay, monthly_rate)
            interest_min = _total_interest(balance, min_pay, monthly_rate, months_min)

            # With extra
            months_extra = _months_to_payoff(balance, min_pay + extra_monthly, monthly_rate)
            interest_extra = _total_interest(balance, min_pay + extra_monthly, monthly_rate, months_extra)

            if months_min > months_extra and months_min < 360:
                savings = interest_min - interest_extra
                months_saved = months_min - months_extra
                if savings > 0:
                    insights.append({
                        "type": "positive",
                        "category": "extra_payment",
                        "message": (
                            f"Paying $50 extra/month on {highest_interest['name']} "
                            f"({highest_interest['interest_rate']}% APR) saves {_format_dollars(savings)} "
                            f"in interest and finishes {months_saved} months sooner"
                        ),
                        "value": savings,
                    })

        # Advance cycle warning
        advances = [d for d in active_debts if d["type"] == "advance" and d["is_auto_deduct"]]
        if advances:
            annual_cost = 0
            for a in advances:
                # Cost of the advance cycle: fees/interest implied by original_amount - current_balance pattern
                # Simple estimate: assume the advance repeats monthly, cost = original_amount - amount_received
                # Since we don't have fee data, estimate from interest rate or flag it
                if a["interest_rate"] > 0:
                    annual_cost += int(a["original_amount"] * a["interest_rate"] / 100)
                else:
                    # Flat fee estimate: many advances charge ~10% effective
                    annual_cost += int(a["original_amount"] * 0.10) * 12

            if annual_cost > 0:
                insights.append({
                    "type": "warning",
                    "category": "advance_cycle",
                    "message": f"Breaking the advance cycle saves approximately {_format_dollars(annual_cost)}/year",
                    "value": annual_cost,
                })

        # Priority warnings: housing
        housing_debts = [d for d in active_debts if d["priority"] == 1]
        for d in housing_debts:
            if d["current_balance"] > 0:
                insights.append({
                    "type": "negative",
                    "category": "priority_warning",
                    "message": f"Unpaid rent/housing ({d['name']}): {_format_dollars(d['current_balance'])} overdue -- pay this first to protect housing stability",
                    "value": d["current_balance"],
                })

        return {
            "total_active_debts": len(active_debts),
            "total_owed": total_owed,
            "total_minimum_monthly": total_minimum,
            "monthly_income": monthly_income,
            "insights": insights,
        }
    finally:
        conn.close()


def _months_to_payoff(balance: int, monthly_payment: int, monthly_rate: float) -> int:
    """Simulate months to payoff given balance, payment, and monthly interest rate."""
    if monthly_payment <= 0:
        return 360
    months = 0
    b = balance
    while b > 0 and months < 360:
        months += 1
        interest = int(b * monthly_rate)
        b = b + interest - monthly_payment
        if b < 0:
            b = 0
    return months


def _total_interest(balance: int, monthly_payment: int, monthly_rate: float, max_months: int) -> int:
    """Calculate total interest paid over the payoff period."""
    if monthly_payment <= 0:
        return 0
    total = 0
    b = balance
    for _ in range(max_months):
        if b <= 0:
            break
        interest = int(b * monthly_rate)
        total += interest
        b = b + interest - monthly_payment
        if b < 0:
            b = 0
    return total
