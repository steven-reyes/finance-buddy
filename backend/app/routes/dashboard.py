from fastapi import APIRouter, Query
from app.services import dashboard_service, recurring_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(month: str = Query(..., pattern=r'^\d{4}-\d{2}$')):
    recurring_service.generate_due_transactions()
    return dashboard_service.get_summary(month)


@router.get("/spending-by-category")
def get_spending_by_category(month: str = Query(..., pattern=r'^\d{4}-\d{2}$')):
    return dashboard_service.get_spending_by_category(month)


@router.get("/monthly-trends")
def get_monthly_trends(months: int = Query(default=6, ge=1, le=24)):
    return dashboard_service.get_monthly_trends(months)


@router.get("/budget-health")
def get_budget_health(month: str = Query(..., pattern=r'^\d{4}-\d{2}$')):
    return dashboard_service.get_budget_health(month)
