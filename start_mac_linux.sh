#!/usr/bin/env bash
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
    echo "Setting up Jarvis for the first time..."
    python3 -m venv .venv || { echo "Python 3 is not installed. Get it from python.org"; exit 1; }
    . .venv/bin/activate
    pip install -r requirements.txt
else
    . .venv/bin/activate
fi

if [ ! -f api_key.txt ]; then
    read -r -p "Paste your Anthropic API key and press Enter: " KEY
    printf '%s' "$KEY" > api_key.txt
    chmod 600 api_key.txt
fi
export ANTHROPIC_API_KEY="$(tr -d '[:space:]' < api_key.txt)"

python assistant.py "$@"
