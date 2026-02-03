# Engineering Log: InsightPDF

## Project Setup
Created the folder and file elementary structure

---

## [Date: 02-02-2026] - Session 1: The AI Core

**Goal:** Implement the basic RAG pipeline (Ingestion + Retrieval) in Python.

![alt text](/images/image.png)

### Things I Learned

#### RAG (Retrieval Augmented Generation)
RAG is simply giving AI an open book, so that it can update its knowledge and generate better answers.
- **Retrieval** - Find info
- **Augment** - Use this info to update knowledge
- **Generate** - Generate new answer

#### LangChain
It is a way to chain together different AI tools together

---

### How I Built It

#### Step 1: Library Setup
I defined the libraries to setup the RAG Engine

- **Loaders and Splitters** - They'll load text from document and split them into chunks
- **The AI Models** - Used Gemini for the main BRAIN and HuggingFace for embeddings
- **DB and Parsers** - Used for storing and prompting the engine

#### Step 2: RagEngine Class
Defined a class RagEngine

**Step 2.1 - Constructor Initialization:**
- HuggingFace embeddings model MINILM
- Gemini, with temp = 0 to give actual answers
- VectorDB - Chroma
- Turned the DB into a retriever to look for the 3 most relevant chunks as per our contexts

**Step 2.2 - Ingestion Function:**
- Split the PDF into chunks of 1000 char with 200 overlapping char to store into our database

**Step 2.3 - Chat Function with LLM:**
- Defined the prompt in which I added the context, the question and a prompt template which will directly go to GEMINI
- Made a chain where: Retrieval → Prompt → LLM → Answer

### Understanding the Chain Pipeline

**What happens when you ask a question:**

1. **Retrieval Step** - `self.retriever`
   - Converts your question into an embedding (numbers)
   - Searches ChromaDB for similar embeddings
   - Returns the top 3 most relevant text chunks

2. **Prompt Step** - `prompt`
   - Takes the retrieved chunks and your original question
   - Fills them into the template: "Context: {chunks}, Question: {your question}"

3. **LLM Step** - `self.llm`
   - Sends the formatted prompt to Gemini
   - Gemini reads the context and generates an answer

4. **Parser Step** - `StrOutputParser()`
   - Converts Gemini's response into plain text string

**Simple Flow:**
Question → Find Relevant Chunks → Build Prompt → Ask Gemini → Get Answer


_**Note:** `RunnablePassthrough()` just passes your original question through unchanged so it can be inserted into the prompt template alongside the retrieved chunks._

---

## [Date: 03-02-2026] - Session 2: The Systems Bridge (FastAPI)

**Goal:** Turn the Python script into a Web API that can accept files and questions from the outside world.

### Things I Learned

#### 1. Why FastAPI?
I chose FastAPI over other options (like Flask or Django) because:

- **Speed** - It is incredibly fast
- **Async/Await** - It can handle a file upload in the background while simultaneously answering a chat question. It doesn't freeze up
- **Auto-Documentation** - It automatically writes the instruction manual (Swagger UI) for my API, saving me hours of work

#### 3. Pydantic
This is the "Bouncer" at the club. Python is usually loose with data types, but Pydantic enforces strict rules. If I say `question: str`, and someone sends a number, Pydantic stops them at the door. It prevents my code from crashing due to bad input.

---

### How I Built It (main.py)
I wrapped my RAG engine in a web server. Here is the human-readable logic:

#### The Setup
I initialized the FastAPI app and started my RagEngine once at the top. This keeps the "Brain" alive so it doesn't have to wake up from scratch for every single user.

#### The "Upload" Route (POST /upload)

- **Input:** A file (specifically a PDF)
- **The Problem:** Files sent over the internet arrive as "streams" (packets of data in RAM). My PDF reader needs a real file on the hard drive
- **The Fix:** I used shutil to copy the stream from RAM to a temporary file on the disk (temp.pdf)
- **The Action:** I told the engine to read that temp file, then immediately deleted it to keep the server clean

#### The "Chat" Route (POST /chat)

- **Input:** A strict JSON object: `{ "question": "..." }`
- **The Action:** It takes the text string, passes it to `rag_engine.chat()`, and returns the answer as JSON

---

### How I Tested It (Swagger UI)
I didn't need to build a frontend website to test my code. FastAPI has a built-in feature called Swagger UI.

- **What it is:** A visual dashboard that reads my code and automatically generates buttons for every function I wrote
- **URL:** http://localhost:8000/docs

#### My Test:

1. I went to the `/upload` section and uploaded a [sample PDF](backend/sample.pdf) it is a PDF about cells of plants and animals
2. I received a 200 OK success message
3. I went to the `/chat` section and sent a JSON question: `{ "question": "What are the major differences in Plant vs Animal cells?" }`
4. Gemini answered correctly based only on the PDF I uploaded!

![Response code if upload is successful](/images/image-1.png)

below are the question and answers 

![Question Body](/images/image-2.png)
![Answer Response](/images/image-3.png)










