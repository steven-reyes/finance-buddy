from fastapi import APIRouter, HTTPException
from app.models.tag import TagCreate, TagUpdate
from app.services import tag_service

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("/")
def list_tags():
    return tag_service.get_all()


@router.post("/", status_code=201)
def create_tag(dto: TagCreate):
    try:
        return tag_service.create(dto)
    except ValueError as e:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "DUPLICATE", "message": str(e)}},
        )


@router.put("/{tag_id}")
def update_tag(tag_id: int, dto: TagUpdate):
    try:
        tag = tag_service.update(tag_id, dto)
        if not tag:
            raise HTTPException(
                status_code=404,
                detail={"error": {"code": "NOT_FOUND", "message": "Tag not found"}},
            )
        return tag
    except ValueError as e:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "DUPLICATE", "message": str(e)}},
        )


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int):
    deleted = tag_service.delete(tag_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Tag not found"}},
        )


