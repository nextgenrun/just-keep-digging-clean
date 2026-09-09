// Authored survivors and verbatim subtitles for the Signal encounter.
export const SIGNAL_SURVIVORS = Object.freeze([
  {
    id: "ivo", name: "Ivo", role: "THE LAMPKEEPER", voice: "rex", tint: 0xc0d8dc,
    portraits: [[181,4,338,628],[752,7,337,624],[100,639,399,607],[721,639,354,607]],
    sheet: "signal-ivo-v1", source: "sprites/npc/signal-survivors-v1/ivo.png",
    description: "An exhausted lampkeeper. Counts the seconds between the echoes.",
    lines: {
      farA: "Hello! Is anybody there?", farB: "Somebody! Down here!",
      middle: "I can hear you. Keep coming!", near: "Here. By the light. Please.",
      intro: "You're real. I thought the dark was answering me again.",
      request: "My pack is empty. A little ore. Anything you can spare.",
      gift: "Thank you. I'll keep a light on for you.",
      ignore: "All right. Don't follow the next voice too far.",
      attack: "Put that down. Please.", loss: "I told you to stay back!",
    },
  },
  {
    id: "bram", name: "Bram", role: "THE PROSPECTOR", voice: "sal", tint: 0xe1c6aa,
    portraits: [[118,3,440,624],[689,5,461,615],[127,627,486,604],[739,652,444,563]],
    sheet: "signal-bram-v1", source: "sprites/npc/signal-survivors-v1/bram.png",
    description: "A stranded prospector. Keeps one hand around his broken pick.",
    lines: {
      farA: "Hey! Can anyone hear me?", farB: "Help! I'm still down here!",
      middle: "That you digging? This way!", near: "Easy. Let me see your face.",
      intro: "Thought I was done for. You came a long way for a stranger.",
      request: "I've got nothing left to trade. Could you spare some supplies?",
      gift: "I won't forget this. You have my word.",
      ignore: "Fair enough. Mind your footing out there.",
      attack: "Don't. I'm warning you.", loss: "You picked the wrong man!",
    },
  },
  {
    id: "oren", name: "Oren", role: "THE SURVEYOR", voice: "leo", tint: 0xbfc6df,
    portraits: [[239,0,268,624],[770,5,314,611],[253,627,285,610],[782,627,336,610]],
    sheet: "signal-oren-v1", source: "sprites/npc/signal-survivors-v1/oren.png",
    description: "A lost surveyor. His map ends where the voices begin.",
    lines: {
      farA: "Hello! Please answer me!", farB: "Is someone out there?",
      middle: "I heard your footsteps. Over here!", near: "Stop there. Just for a second.",
      intro: "I marked this tunnel yesterday. The marks aren't mine anymore.",
      request: "I need supplies to reach the surface. Whatever you can manage.",
      gift: "You stopped when you could have walked away. Thank you.",
      ignore: "Go on, then. I hope the way back is still there.",
      attack: "No. Don't come any closer.", loss: "Stay away from me!",
    },
  },
  {
    id: "mia", name: "Mia", role: "THE LOST DOG", kind: "dog", tint: 0xe0bf8f,
    portraits: [[88,0,643,512],[806,0,590,512],[98,512,670,484],[768,512,660,474]],
    sheet: "signal-mia-v1", source: "sprites/npc/signal-survivors-v1/mia.png",
    description: "A lost shepherd. The brass plate on her leash reads MIA.",
    calls: { far: ["farA", "farB", "farC", "farD"], middle: ["middle", "middleB", "farB"], near: ["near", "nearB", "middleB"] },
    lines: {
      farA: "[A dog howls.]", farB: "[A dog barks.]", farC: "[A dog whines and barks.]", farD: "[A dog whimpers.]",
      middle: "[A dog whines and barks.]", middleB: "[A dog barks nearby.]",
      near: "[A dog whimpers nearby.]", nearB: "[A dog gives a short whine.]",
      intro: "[Mia gives a short whine.]", request: "[Mia whimpers softly.]",
      gift: "[Mia whines and barks.]", ignore: "[Mia whimpers.]",
      attack: "[Mia growls.]", loss: "[Mia growls fiercely.]",
    },
  },
]);

export const getSignalSurvivor = id => SIGNAL_SURVIVORS.find(survivor => survivor.id === id) || SIGNAL_SURVIVORS[0];
