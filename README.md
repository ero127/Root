# Mike: your hands-free voice assistant

Talk to Mike out loud. He listens through your microphone, understands you,
does what you ask on your computer (he can even see your screen and click for you),
and answers out loud. No typing.

## What you can say

Say **"Mike"** first, then your request. After he answers you have about 10
seconds to keep talking without saying "Mike" again.

| Say something like… | What happens |
|---|---|
| "Mike, open YouTube" | Opens the website |
| "Mike, play Bohemian Rhapsody" | Opens it on YouTube |
| "Mike, search for cheap flights to Miami" | Opens Google results |
| "Mike, open Spotify" / "open calculator" | Opens the app |
| "Mike, what's the weather in Chicago?" | Looks it up online and tells you |
| "Mike, set a timer for 10 minutes for the pizza" | Speaks up when time's up |
| "Mike, remember to call mom tomorrow" | Saves it to `notes.txt` |
| "Mike, read my notes" | Reads your notes out loud |
| "Mike, set the volume to 30" | Changes the speaker volume |
| "Mike, how much disk space do I have?" | Runs a computer command, but **asks you out loud first** (answer "yes" or "no") |
| "Mike, what time is it?" / any question | Answers it |
| "Mike, what's on my screen?" | Looks at your screen and tells you |
| "Mike, in Spotify click Liked Songs and play the first one" | Sees the screen, moves the mouse, clicks |
| "Mike, write an email to Sam saying I'm running late" | Opens your email, clicks, types it, and **asks before sending** |
| "Goodbye" | Turns Mike off |

### Full control of your screen

Mike can see your screen, move the mouse, click buttons, scroll and type,
inside any app or website, like a person sitting at your computer.

- He says **"On it"** when he starts using the screen. Hands off the mouse while he works.
- **To stop him right away, push your mouse hard into any corner of the screen.**
- He **asks out loud first** before buying or paying, sending emails or messages,
  deleting things, typing passwords, or changing settings.
- He only takes orders from your voice, never from text he reads on a web page or in an email.
- Screen tasks take more steps, so they cost more API credit than quick questions.

## One-time setup

1. **Python** — on Windows the start file downloads and installs it for you.
   On Mac/Linux, install Python 3.10+ from <https://www.python.org/downloads/>.
2. **Get an Anthropic API key** at <https://console.anthropic.com/> (the
   "API Keys" page). This is Mike's brain.
3. **Download this folder** to your computer.
4. **Start Mike**:
   - **Windows:** double-click `start_windows.bat`. The first time, it downloads
     and installs everything (Python included) and asks for your API key.
   - **Mac / Linux:** open Terminal in this folder and run `./start_mac_linux.sh`.

After that, double-clicking (or running) the start file is all you ever need to do.
Mike runs hidden in the background with **nothing on the screen**: he only talks,
and you only talk. Typing in your API key that first time is the only typing you'll ever do.

### If the microphone part fails to install

- **Mac:** install Homebrew (<https://brew.sh>), then run `brew install portaudio`
  and start again.
- **Linux:** `sudo apt install portaudio19-dev python3-pyaudio espeak` and start again.
- **Windows:** usually works as is. If not, run `pip install pipwin` and then `pipwin install pyaudio`.

Also make sure your computer lets apps use the microphone (Windows: Settings →
Privacy → Microphone; Mac: System Settings → Privacy & Security → Microphone).

## If Mike doesn't talk

Double-click **`start_mike_debug`** in the Mike folder. It runs Mike in a window that
shows everything he hears and says, and any error. Send what it shows to Claude.
Mike also writes what he did to `mike_log.txt` in his folder.

## Options

```bash
python assistant.py --show-text          # also show the words on screen (for fixing problems)
python assistant.py --always-listen      # no wake word: everything you say is a command
python assistant.py --wake-word computer # call him "computer" instead of "Mike"
```

## Good to know

- Mike needs an internet connection. Behind the scenes (you never see it),
  Google's free speech service turns your voice into words for Claude.
- Each request uses your Anthropic API credit (a few cents at most per command).
- Mike never runs a computer command without you saying "yes" first.
- Want him to do something new? Add a function with `@beta_tool` in
  `assistant.py` and put it in the `TOOLS` list. Claude figures out when to use it.
