# Twitch-NoPixel-Only

Install: https://chrome.google.com/webstore/detail/twitch-nopixel-only/jebgklbgelliplemahghgiegfmcobfmk

Once installed, go to https://www.twitch.tv/directory/game/Grand%20Theft%20Auto%20V to use.

Everything is automatic, you don't have to do anything.

![Twitch NoPixel Only Screenshot](https://i.imgur.com/oZIOuVH.jpg)

---

This extension is specifically aimed at NoPixel viewers on Twitch. It has two primary features:
1. Filtering GTAV streams to only show NoPixel activity.
2. Automatically tagging/customizing NoPixel streams based on:
    1. the active character being played.
    2. the faction (if any) that the character belongs to.

### --- FAQ ---

##### "Does this only apply to the GTAV category on Twitch?"
Yes. This extension will only affect the GTAV page linked above. Other Twitch pages will not be affected.

##### "How does the tagging work?"
Each channel's title will be compared against their character data to best identify the active character. This includes checking the title for nicknames, partial-names, and faction names. The stream is then tagged with the character name, and the tag is coloured based on the character's faction (if one exists). The large majority of NP streamers put character indications in their title. However, even if they don't, it will tag the stream with a best-guess (based on who they usually play) surrounded by question-marks, e.g. "? Lang Buddha ?".

##### "How do you know if it's a NoPixel stream?"
Firstly, this extension contains a big list of NP streamers (currently 362) who are included by default. This list is updated frequently and fetched during runtime (list changes do not require updating the extension). If they're not in the list (new to NoPixel) then the stream title will be checked for terms such as "NoPixel", "NP". "No Pixel" etc. I've never had an issue with it missing a stream. A few other RP servers including TFRP and TRP are also still included. However, there is no individual tagging/customizing done for these servers; all of them are coloured pale-blue.

##### "What happens if it's a new NoPixel streamer, without character data?"
The stream will always be included as long as they are playing on NoPixel (and indicate so in their title). If their title contains some indication of a faction, but no info is known about the character, they will be tagged generically based on that faction. E.g. "< Vagos >". If there is no faction indication, they will just be included without a specific tag.

\---

Tip: Keeping the "Force English only" setting enabled will improve performance when scrolling into the lower-viewcount streams.