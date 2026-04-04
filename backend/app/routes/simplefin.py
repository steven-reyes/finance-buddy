from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.simplefin import SetupTokenRequest, ImportTransactionRequest, ImportAllRequest
from app.services import simplefin_service

router = APIRouter(prefix="/api/simplefin", tags=["simplefin"])


# --- Static paths first ---

@router.get("/status")
def get_status():
    result = simplefin_service.get_connection_status()
    if not result:
        return {"connection": None, "account_count": 0}
    account_count = result.pop("account_count", 0)
    result.pop("access_url", None)
    result.pop("setup_token", None)
    return {"connection": result, "account_count": account_count}


@router.post("/setup", status_code=201)
def setup_connection(dto: SetupTokenRequest):
    try:
        connection = simplefin_service.exchange_setup_token(dto.setup_token)
        return connection
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/sync")
def sync_data():
    status = simplefin_service.get_connection_status()
    if not status:
        raise HTTPException(status_code=404, detail="No active SimpleFIN connection")
    try:
        result = simplefin_service.sync_accounts_and_transactions(status["id"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/accounts")
def list_accounts():
    status = simplefin_service.get_connection_status()
    if not status:
        raise HTTPException(status_code=404, detail="No active SimpleFIN connection")
    return simplefin_service.get_linked_accounts(status["id"])


@router.get("/transactions")
def list_transactions(
    account_id: Optional[int] = Query(None),
    imported: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    return simplefin_service.get_synced_transactions(
        account_id=account_id,
        imported=imported,
        start_date=start_date,
        end_date=end_date,
        page=page,
        per_page=per_page,
    )


@router.post("/import")
def import_transaction(dto: ImportTransactionRequest):
    try:
        result = simplefin_service.import_transaction(
            txn_id=dto.transaction_id,
            category_id=dto.category_id,
            description_override=dto.description,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import-all")
def import_all(dto: ImportAllRequest):
    result = simplefin_service.import_all_unimported(
        account_id=dto.account_id,
        default_category_id=dto.default_category_id,
    )
    return result


# --- Dynamic paths ---

@router.delete("/connections/{connection_id}")
def disconnect(connection_id: int):
    success = simplefin_service.disconnect(connection_id)
    if not success:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"status": "disconnected"}
