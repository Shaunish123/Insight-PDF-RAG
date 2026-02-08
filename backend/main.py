import os
import shutil
import tempfile
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from rag import RagEngine

from fastapi.middleware.cors import CORSMiddleware 

# Initialize FastAPI app
app = FastAPI(title = "InsightPDF API")

# CORS settings to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://*.vercel.app",   # Vercel preview deployments
        # Add your production Vercel domain here when deployed
        "https://insight-pdf-rag.vercel.app"
    ],
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

@app.get("/health")
def health_check():
    """Health check endpoint for frontend heartbeat monitoring"""
    return {
        "status": "healthy",
        "service": "InsightPDF API",
        "ready": True
    }


@app.post("/upload")
async def upload_doc(file: UploadFile = File(...)):
    """
    1. Receives file 
    2. validates and saves to disk temporarily
    3. feeds to RAG engine for ingestion
    4. cleans up temp file
    """

    # Validate filename exists
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided. Please select a valid PDF file.")

    # Validate if PDF
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type '{file.filename.split('.')[-1]}'. Only PDF files are supported."
        )

    # Sanitize filename (remove special characters, keep alphanumeric and basic chars)
    safe_filename = re.sub(r'[^\w\s.-]', '', file.filename)
    safe_filename = safe_filename.replace(' ', '_')

    # Check file size (50 MB limit)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB in bytes
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()  # Get size
    file.file.seek(0)  # Reset to start
    
    if file_size == 0:
        raise HTTPException(
            status_code=400, 
            detail="The uploaded file is empty (0 bytes). Please check the file and try again."
        )
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum limit of 50 MB. Please compress or split your PDF."
        )

    # Create temp file with proper cleanup
    temp_file = None
    try:
        # Create a temporary file that will be auto-deleted
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        temp_path = temp_file.name
        
        # Write uploaded content to temp file
        shutil.copyfileobj(file.file, temp_file)
        temp_file.close()

        # Tell engine to read file
        rag_engine.ingest_pdf(temp_path)

        # Clean up temp file
        os.unlink(temp_path)

        return {
            "filename": file.filename, 
            "status": "Ingested Successfully",
            "size_mb": round(file_size / (1024*1024), 2)
        }

    except Exception as e:
        # If anything fails, clean up and tell the user
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except:
                pass
        
        import traceback
        error_details = str(e)
        print(f"Upload error: {error_details}")
        print(traceback.format_exc())
        
        # Provide more helpful error messages
        if "PyPDF" in error_details or "PDF" in error_details:
            detail = f"Failed to read PDF file. The file may be corrupted or password-protected. Error: {error_details}"
        elif "memory" in error_details.lower():
            detail = "Insufficient memory to process this PDF. Try a smaller file or restart the server."
        else:
            detail = f"Failed to process PDF: {error_details}"
        
        raise HTTPException(status_code=500, detail=detail)


@app.post("/chat")
async def chat(request: QueryRequest):
    """
    1. Receives { "question": "..." }
    2. Asks the RagEngine.
    3. Returns { "answer": "..." }
    """

    try:
        # Check if vector store has any documents
        collection = rag_engine.vector_store._collection
        count = collection.count()
        
        if count == 0:
            raise HTTPException(
                status_code=400, 
                detail="No document found in database. Please upload a PDF file before asking questions."
            )
        
        response = rag_engine.chat(request.question, request.history)
        return {"answer": response}
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Chat error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
