from fastapi import APIRouter, HTTPException
from app.models.savings_goal import SavingsGoalCreate, SavingsGoalUpdate, ContributionCreate
from app.services import savings_goal_service

router = APIRouter(prefix="/api/savings-goals", tags=["savings-goals"])


@router.get("/")
def list_goals():
    return savings_goal_service.get_all()


@router.post("/", status_code=201)
def create_goal(dto: SavingsGoalCreate):
    return savings_goal_service.create(dto)


@router.put("/{goal_id}")
def update_goal(goal_id: int, dto: SavingsGoalUpdate):
    goal = savings_goal_service.update(goal_id, dto)
    if not goal:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Savings goal not found"}},
        )
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int):
    deleted = savings_goal_service.delete(goal_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Savings goal not found"}},
        )


@router.get("/{goal_id}/contributions")
def get_contributions(goal_id: int):
    goal = savings_goal_service.get_by_id(goal_id)
    if not goal:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Savings goal not found"}},
        )
    return savings_goal_service.get_contributions(goal_id)


@router.post("/{goal_id}/contributions", status_code=201)
def add_contribution(goal_id: int, dto: ContributionCreate):
    try:
        return savings_goal_service.add_contribution(goal_id, dto)
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": str(e)}},
        )


@router.delete("/{goal_id}/contributions/{contribution_id}", status_code=204)
def delete_contribution(goal_id: int, contribution_id: int):
    deleted = savings_goal_service.delete_contribution(goal_id, contribution_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Contribution not found"}},
        )
