# Rag engine setup

import os
from dotenv import load_dotenv

# Disable ChromaDB telemetry to avoid warnings
os.environ["ANONYMIZED_TELEMETRY"] = "False"

# Loaders and Splitters for loading the docs
# and splitting into chunks or figuratively "index cards"
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# AI Models 
# GROQ for BRAIN (Fast & Free LLM API)
# Google Generative AI for EMBEDDINGS
from langchain_groq import ChatGroq
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Vector Database Store 
# ChromaDB acts as our "filling cabinet"
from langchain_chroma import Chroma

# Prompts and parsers
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

load_dotenv()

class RagEngine:
    def __init__(self, db_path = "./chroma_db"):
        self.db_path = db_path
        # Google Generative AI embeddings for better quality
        # Requires GOOGLE_API_KEY in .env

        print("Initialising Embeddings ...")
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001"
        )

        # now setup the brain => GROQ
        # set temp = 0, so it gives us factual 
        # answers, exactly according to our text
        # Using llama-3.3-70b-versatile as primary (with 8b fallback)
        print("Initialising LLM ...")
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY")
        )

        # setting up the vector DB - the filling cabinet
        self.vector_store = Chroma(
            persist_directory = db_path, # store db on disk
            embedding_function = self.embeddings 
        )


    # wipes db to prevent mixing old and new data
    def clear_database(self):
        print("--- Clearing Database ---")
        try:
            # 1. Force the vector store to reset
            self.vector_store.delete_collection() 
        except Exception as e:
            print(f"Note: {e} (this is normal for first upload)")
        
        # 2. Re-initialize it
        self.vector_store = Chroma(
            persist_directory=self.db_path, 
            embedding_function=self.embeddings
        )
        print("--- Database Cleared ---")

    def ingest_pdf(self, file_path):
        # 1. CLEAR OLD DATA FIRST
        self.clear_database()

        print(f"Loading PDF: {file_path}")

        # read the PDF
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        # split into chunks (our index cards)
        # chunk_size = 1000, chunk 1000 char long
        # chunk_overlap = 200, last 200 char of previous chunk
        # and first 200 char of next chunk overlap
        splitter = RecursiveCharacterTextSplitter(
            chunk_size = 1000,
            chunk_overlap = 200
        )
        splits = splitter.split_documents(docs)
        print(f"Created {len(splits)} chunks")

        # save to db
        # text -> to no -> db
        self.vector_store.add_documents(splits)
        print("Saved to Store")

    def chat(self, question, chat_history=[]):
        # 1. Setup Retrieval
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})

        # 2. Convert tuple-based history to LangChain message objects
        formatted_history = []
        for role, content in chat_history:
            if role == "human":
                formatted_history.append(HumanMessage(content=content))
            elif role == "ai":
                formatted_history.append(AIMessage(content=content))

        # --- HELPER FUNCTION: Builds the chain with a specific LLM ---
        def build_rag_chain(llm_instance):
            # Contextualize Question Prompt
            contextualize_q_system_prompt = """Given a chat history and the latest user question 
            which might reference context in the chat history, formulate a standalone question 
            which can be understood without the chat history. Do NOT answer the question, 
            just reformulate it if needed and otherwise return it as is."""
            
            contextualize_q_prompt = ChatPromptTemplate.from_messages([
                ("system", contextualize_q_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ])
            
            history_aware_retriever = create_history_aware_retriever(
                llm_instance, self.retriever, contextualize_q_prompt
            )

            # Answer Prompt
            qa_system_prompt = """You are a PDF document assistant. Your ONLY job is to answer questions based strictly on the provided context from the PDF.
            
            **CRITICAL RULES:**
            - ONLY answer questions if the information is present in the context below
            - If the question cannot be answered using the context, respond EXACTLY with: "I cannot find information about that in the uploaded PDF document."
            - DO NOT use your general knowledge or training data to answer questions
            - DO NOT make assumptions or inferences beyond what is explicitly stated in the context
            - You are NOT a general knowledge assistant - you are a PDF-specific assistant
            
            **Formatting Rules (only when answering from context):**
            - Use **bold** for key terms and important concepts
            - Use bullet points or numbered lists when listing items
            - Use headings (##, ###) to organize longer responses
            - Use code blocks with ``` for code snippets
            - Use LaTeX for mathematical formulas: inline math with $formula$ and display math with $$formula$$
            - Always provide properly formatted mathematical formulas when relevant, using LaTeX syntax. For example, write $E=mc^2$ for the mass-energy equivalence formula. Do NOT write it as plain text. Proper formatting is essential for clarity.
            - **IMPORTANT:** Do NOT escape the dollar signs with backslashes. Write $x^2$, NOT \$x^2\$.
            - Keep answers clear, well-structured, and easy to read
            
            Context: {context}"""
            
            qa_prompt = ChatPromptTemplate.from_messages([
                ("system", qa_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ])
            
            question_answer_chain = create_stuff_documents_chain(llm_instance, qa_prompt)
            return create_retrieval_chain(history_aware_retriever, question_answer_chain)

        # --- EXECUTION LOGIC (TRY 70B -> FALLBACK 8B) ---
        try:
            print("🧠 Attempting with Primary Model (llama-3.3-70b-versatile)...")
            rag_chain = build_rag_chain(self.llm)  # Uses the 70b loaded in __init__
            response = rag_chain.invoke({"input": question, "chat_history": formatted_history})
            print("✅ Primary Model succeeded")
        
        except Exception as e:
            error_msg = str(e).lower()
            # Check for Rate Limit (429) or other API errors
            if "429" in error_msg or "rate limit" in error_msg or "quota" in error_msg:
                print(f"⚠️  Primary Model Rate Limited! Switching to Backup (llama-3.1-8b-instant)...")
                
                # Initialize Backup Model on the fly
                backup_llm = ChatGroq(
                    model="llama-3.1-8b-instant",
                    temperature=0,
                    api_key=os.getenv("GROQ_API_KEY")
                )
                
                # Rebuild chain with backup model and Retry
                rag_chain = build_rag_chain(backup_llm)
                response = rag_chain.invoke({"input": question, "chat_history": formatted_history})
                print("✅ Backup Model succeeded")
            else:
                # If it's a different error (e.g. API key invalid), crash normally
                print(f"❌ Error: {e}")
                raise e

        return response["answer"]
    
if __name__ == "__main__":
    engine = RagEngine()

        



