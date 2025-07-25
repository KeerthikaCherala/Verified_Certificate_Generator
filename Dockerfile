# my-fastapi-project/Dockerfile

# Use an official Python runtime as a base image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy only the requirements.txt from your backend folder
COPY backend/requirements.txt ./requirements.txt

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory (which contains server.py) into the container
COPY backend/ ./backend/

# Set the PYTHONPATH to include your backend directory so Python can find server.py
ENV PYTHONPATH=/app/backend:$PYTHONPATH

# CORRECTED CMD: Use a shell to expand the $PORT variable
CMD ["/bin/bash", "-c", "uvicorn backend.server:app --host 0.0.0.0 --port $PORT"]