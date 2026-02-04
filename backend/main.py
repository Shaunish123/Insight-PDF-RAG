import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from rag import RagEngine

from fastapi.middleware.cors import CORSMiddleware 

# Initialize FastAPI app
app = FastAPI(title = "InsightPDF API")

# CORS settings to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allow Next.js
    allow_credentials=True,
    allow_methods=["*"], # Allow all verbs (GET, POST, etc.)
    allow_headers=["*"],
)

# Initialize RAG Engine
rag_engine = RagEngine()

# Definign the blueprint using Pydantic
# The question that the frontend sends 
# should be a string only so

class QueryRequest(BaseModel):
    question: str
    # History is a list of ["human", "message"] or ["ai", "message"] pairs
    history: list[tuple[str, str]] = []


# ROUTES 

@app.get("/")
def home():
    """Check to see if server running"""
    return {"status": "Alive", "message": "Welcome to InsightPDF"}


@app.post("/upload")
async def upload_doc(file: UploadFile = File(...)):
    """
    1. Receives file 
    2. saves to disk temporarily
    3. feeds to RAG engine for ingestion
    
    """

    # validate if pdf
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code = 400, detail = "Only PDF files are allowed")

    # save to disk
    temp_filename = f"temp_{file.filename}"

    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # tell engine to read file
        rag_engine.ingest_pdf(temp_filename)

        os.remove(temp_filename) # remove temp file

        return {"filename": file.filename, "status": "Ingested Successfully"}

    except Exception as e:
        # If anything fails, clean up and tell the user
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(request: QueryRequest):
    """
    1. Receives { "question": "..." }
    2. Asks the RagEngine.
    3. Returns { "answer": "..." }
    """

    try:
        response = rag_engine.chat(request.question, request.history)
        return {"answer": response}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
