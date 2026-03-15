from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.services import recurring_service
from app.routes import (
    categories,
    transactions,
    budgets,
    investments,
    savings_goals,
    tags,
    recurring,
    dashboard,
    csv_import,
    export,
    ocr,
    debts,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing database...")
    init_db()
    print("Generating recurring transactions...")
    count = recurring_service.generate_due_transactions()
    if count > 0:
        print(f"Generated {count} recurring transactions")
    print("Finance Buddy backend ready!")
    yield
    # Shutdown
    print("Shutting down Finance Buddy backend...")


app = FastAPI(
    title="Finance Buddy API",
    description="Personal finance management API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(investments.router)
app.include_router(savings_goals.router)
app.include_router(tags.router)
app.include_router(recurring.router)
app.include_router(dashboard.router)
app.include_router(csv_import.router)
app.include_router(export.router)
app.include_router(ocr.router)
app.include_router(debts.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "finance-buddy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3001)
