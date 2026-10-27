"""Jarvis - a hands-free voice assistant powered by Claude.

Talk to it out loud, it answers out loud, and it can carry out commands on
your computer (open websites and apps, search, set timers, take notes,
run commands after you say "yes", and more). No typing needed.

Run:  python assistant.py
"""

import argparse
import datetime
import os
import platform
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path

import anthropic
import pyttsx3
import speech_recognition as sr
from anthropic import beta_tool

MODEL = "claude-opus-5-5"
NOTES_FILE = Path(__file__).with_name("notes.txt")
SYSTEM = platform.system()  # "Windows", "Darwin" (macOS) or "Linux"

# Words that end the program when said on their own.
EXIT_PHRASES = {"goodbye", "good bye", "bye", "exit", "quit", "shut down", "stop listening"}

client = anthropic.Anthropic()
recognizer = sr.Recognizer()
recognizer.pause_threshold = 0.8  # seconds of silence that mark the end of a sentence


# ---------------------------------------------------------------------------
# Speaking and listening
# ---------------------------------------------------------------------------

def speak(text: str) -> None:
    """Say text out loud (and print it so you can see what was said)."""
    print(f"\nJarvis: {text}")
    # A fresh engine per call avoids pyttsx3 going silent after the first reply.
    engine = pyttsx3.init()
    engine.setProperty("rate", 185)
    engine.say(text)
    engine.runAndWait()
    engine.stop()


def listen(mic: sr.Microphone, timeout: float | None = None) -> str:
    """Record one sentence from the microphone and turn it into text.

    Returns "" if nothing understandable was heard.
    """
    with mic as source:
        try:
            audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=20)
        except sr.WaitTimeoutError:
            return ""
    try:
        text = recognizer.recognize_google(audio)
    except sr.UnknownValueError:
        return ""
    except sr.RequestError as e:
        print(f"[speech service unavailable: {e}]")
        return ""
    print(f"\nYou: {text}")
    return text.strip()


# The microphone is shared with the confirm() helper used by risky tools.
_mic: sr.Microphone | None = None


def confirm(question: str) -> bool:
    """Ask a yes/no question out loud and wait for a spoken answer."""
    speak(question)
    answer = listen(_mic, timeout=8).lower() if _mic else ""
    return any(word in answer.split() for word in ("yes", "yeah", "yep", "sure", "okay", "ok"))


# ---------------------------------------------------------------------------
# Commands Jarvis can carry out (tools Claude can call)
# ---------------------------------------------------------------------------

@beta_tool
def open_website(url: str) -> str:
    """Open a website in the default web browser.

    Args:
        url: Full address of the site, e.g. https://www.youtube.com
    """
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"Opened {url}"


@beta_tool
def search_google(query: str) -> str:
    """Open a Google search for the query in the browser, so the user can see the results.

    Args:
        query: What to search for.
    """
    webbrowser.open("https://www.google.com/search?q=" + urllib.parse.quote_plus(query))
    return f"Opened Google results for '{query}'"


@beta_tool
def play_on_youtube(query: str) -> str:
    """Open YouTube search results for a song, video or channel.

    Args:
        query: The song, video or channel to look for.
    """
    webbrowser.open("https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query))
    return f"Opened YouTube results for '{query}'"


@beta_tool
def open_app(name: str) -> str:
    """Open an application installed on this computer.

    Args:
        name: The app's name, e.g. "notepad", "calculator", "spotify", "Microsoft Word".
    """
    try:
        if SYSTEM == "Windows":
            # "start" finds apps registered with Windows (notepad, calc, spotify, winword...).
            subprocess.Popen(f'start "" "{name}"', shell=True)
        elif SYSTEM == "Darwin":
            result = subprocess.run(["open", "-a", name], capture_output=True, text=True)
            if result.returncode != 0:
                return f"Could not find an app called {name}"
        else:
            exe = shutil.which(name.lower()) or shutil.which(name.lower().replace(" ", "-"))
            if not exe:
                return f"Could not find an app called {name}"
            subprocess.Popen([exe], start_new_session=True)
    except OSError as e:
        return f"Could not open {name}: {e}"
    return f"Opened {name}"


@beta_tool
def get_date_and_time() -> str:
    """Get the current local date and time."""
    return datetime.datetime.now().strftime("%A, %B %d, %Y, %I:%M %p")


@beta_tool
def set_timer(seconds: int, label: str = "Timer") -> str:
    """Start a countdown; Jarvis says the label out loud when it finishes.

    Args:
        seconds: How long the timer runs, in seconds.
        label: What to say when the time is up, e.g. "Your pizza is ready".
    """
    def ring():
        time.sleep(seconds)
        speak(f"Time's up! {label}")

    threading.Thread(target=ring, daemon=True).start()
    return f"Timer set for {seconds} seconds"


@beta_tool
def save_note(text: str) -> str:
    """Save a note or reminder to the user's notes file.

    Args:
        text: The note to save.
    """
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    with NOTES_FILE.open("a", encoding="utf-8") as f:
        f.write(f"[{stamp}] {text}\n")
    return "Note saved"


@beta_tool
def read_notes() -> str:
    """Read back all of the user's saved notes."""
    if not NOTES_FILE.exists() or not NOTES_FILE.read_text(encoding="utf-8").strip():
        return "There are no notes yet."
    return NOTES_FILE.read_text(encoding="utf-8")


@beta_tool
def set_volume(level: int) -> str:
    """Set the computer's speaker volume.

    Args:
        level: Volume from 0 (mute) to 100 (loudest).
    """
    level = max(0, min(100, level))
    try:
        if SYSTEM == "Darwin":
            subprocess.run(["osascript", "-e", f"set volume output volume {level}"], check=True)
        elif SYSTEM == "Linux":
            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", f"{level}%"],
                           check=True, capture_output=True)
        else:
            # Windows: reset to 0 then press "volume up" (each press is 2%).
            script = (
                "$w = New-Object -ComObject WScript.Shell;"
                "1..50 | % { $w.SendKeys([char]174) };"
                f"1..{level // 2} | % {{ $w.SendKeys([char]175) }}"
            )
            subprocess.run(["powershell", "-NoProfile", "-Command", script], check=True)
    except (OSError, subprocess.CalledProcessError) as e:
        return f"Could not change the volume: {e}"
    return f"Volume set to {level}%"


@beta_tool
def run_computer_command(command: str, reason: str) -> str:
    """Run a terminal command on the user's computer. The user is asked out loud
    to say yes before it runs. Use for things no other tool covers
    (e.g. listing files, creating folders, checking battery or disk space).

    Args:
        command: The exact shell command to run.
        reason: A short, plain-English explanation of what the command does.
    """
    if not confirm(f"I want to {reason}. Should I go ahead?"):
        return "The user said no, so the command was not run."
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        return "The command took too long and was stopped."
    output = (result.stdout + result.stderr).strip()
    return f"Exit code {result.returncode}. Output:\n{output[-3000:] or '(no output)'}"


TOOLS = [
    open_website, search_google, play_on_youtube, open_app, get_date_and_time,
    set_timer, save_note, read_notes, set_volume, run_computer_command,
    # Lets Jarvis look things up on the internet (news, weather, sports, facts).
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 3},
]

SYSTEM_PROMPT = f"""You are Jarvis, a friendly voice assistant running on the user's {SYSTEM} computer.
The user talks to you out loud and hears your replies through a text-to-speech voice, so:
- Answer in one to three short, natural spoken sentences.
- Never use markdown, bullet points, lists, emojis, code blocks or URLs in your replies.
- When the user asks you to do something, use your tools to actually do it, then briefly say what you did.
- Use web search for anything current, like news, weather, scores or prices.
- The user's words come from speech recognition and may contain mistakes; go with the most likely meaning.
- If a request is unclear, ask one short question."""


# ---------------------------------------------------------------------------
# Talking to Claude
# ---------------------------------------------------------------------------

def ask_claude(history: list[dict]) -> str:
    """Send the conversation to Claude, let it run any commands, and return its spoken reply."""
    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=history,
        output_config={"effort": "low"},  # quick replies for a snappy conversation
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",  # if a request is declined, retry on a fallback model
    )
    final = runner.until_done()
    if final.stop_reason == "refusal":
        return "Sorry, I can't help with that one."
    reply = " ".join(b.text for b in final.content if b.type == "text").strip()
    return reply or "Done."


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    global _mic
    parser = argparse.ArgumentParser(description="Hands-free voice assistant")
    parser.add_argument("--wake-word", default="jarvis",
                        help='Word that gets the assistant\'s attention (default: "jarvis")')
    parser.add_argument("--always-listen", action="store_true",
                        help="Treat everything you say as a command, no wake word needed")
    args = parser.parse_args()
    wake = args.wake_word.lower()

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print("No Anthropic API key found. Set ANTHROPIC_API_KEY first (see README.md).")
        sys.exit(1)

    try:
        _mic = sr.Microphone()
    except (OSError, AttributeError) as e:
        print(f"Could not open the microphone: {e}\nInstall PyAudio (see README.md).")
        sys.exit(1)

    print("Adjusting to background noise, stay quiet for a second...")
    with _mic as source:
        recognizer.adjust_for_ambient_noise(source, duration=1.5)

    history: list[dict] = []
    awake_until = 0.0  # after a reply you can keep talking without the wake word

    if args.always_listen:
        speak("Hi, I'm Jarvis. I'm listening, just talk to me.")
    else:
        speak(f"Hi, I'm Jarvis. Say {args.wake_word} whenever you need me.")

    while True:
        heard = listen(_mic)
        if not heard:
            continue
        lowered = heard.lower()

        in_conversation = args.always_listen or time.time() < awake_until
        if not in_conversation:
            if wake not in lowered:
                continue  # not talking to us
            # Keep whatever came after the wake word, e.g. "Jarvis, open YouTube".
            heard = heard[lowered.index(wake) + len(wake):].strip(" ,.!?")
            if not heard:
                speak("Yes?")
                heard = listen(_mic, timeout=8)
                if not heard:
                    continue

        if heard.lower().strip(" .!?") in EXIT_PHRASES:
            speak("Goodbye!")
            break

        history.append({"role": "user", "content": heard})
        try:
            reply = ask_claude(history)
        except anthropic.AuthenticationError:
            speak("My API key isn't working. Please check it and restart me.")
            break
        except anthropic.RateLimitError:
            reply = "I'm getting too many requests right now. Try again in a moment."
        except anthropic.APIConnectionError:
            reply = "I can't reach the internet right now."
        except anthropic.APIStatusError as e:
            print(f"[API error: {e}]")
            reply = "Something went wrong on my end. Please try again."

        history.append({"role": "assistant", "content": reply})
        history = history[-40:]  # keep the last 20 exchanges
        speak(reply)
        awake_until = time.time() + 10


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nBye!")
