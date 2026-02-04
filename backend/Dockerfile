# 1. The Base: Start with a lightweight Linux machine that has Python 3.11 installed
FROM python:3.11-slim

# 2. The Setup: Create a folder inside the container called /app
WORKDIR /app

# 3. The Prerequisites: Copy just the requirements file first
# (We do this separately so Docker can cache the installed libraries)
COPY requirements.txt .

# 4. The Installation: Install all the libraries
RUN pip install --no-cache-dir -r requirements.txt

# 5. The Code: Copy the rest of your backend code into the container
COPY . .

# 6. The Port: Open port 8000 so the world can talk to it
EXPOSE 8000

# 7. The Start Button: Command to run when the container starts
# --host 0.0.0.0 is CRITICAL. It lets the container accept connections from outside.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

