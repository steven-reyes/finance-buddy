from fastapi import APIRouter, HTTPException
from app.models.recurring import RecurringCreate, RecurringUpdate, BulkRecurringCreate
from app.services import recurring_service

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.get("")
def list_recurring():
    return recurring_service.get_all()


@router.post("", status_code=201)
def create_recurring(dto: RecurringCreate):
    return recurring_service.create(dto)


@router.post("/bulk", status_code=201)
def bulk_create_recurring(dto: BulkRecurringCreate):
    results = recurring_service.bulk_create(dto.templates)
    return results


@router.put("/{template_id}")
def update_recurring(template_id: int, dto: RecurringUpdate):
    template = recurring_service.update(template_id, dto)
    if not template:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Recurring template not found"}},
        )
    return template


@router.delete("/{template_id}", status_code=204)
def delete_recurring(template_id: int):
    deleted = recurring_service.delete(template_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Recurring template not found"}},
        )


@router.post("/generate")
def generate_recurring():
    count = recurring_service.generate_due_transactions()
    return {"generated": count}
