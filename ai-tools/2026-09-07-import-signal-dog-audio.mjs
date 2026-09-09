// Downloads six public CC0 dog recordings; no credentials or runtime network requests.
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const sources = [
 {id:118964,creator:"esperri",name:"bark",title:"Dog Bark 4"},
 {id:530604,creator:"_natiKatz",name:"whine-bark",title:"Dog Whine and Bark"},
 {id:462660,creator:"Breviceps",name:"whining",title:"Whining Dog"},
 {id:735365,creator:"haulaway",name:"cry",title:"Small Dog Cry"},
 {id:361429,creator:"black_trillium",name:"growl",title:"Dog Growl"},
 {id:518566,creator:"Latranz",name:"howl",title:"Dog Howl"},
];
const folder = new URL("../sound/voice-lines/signal-dog-v1/", import.meta.url);
await fs.mkdir(folder, {recursive:true});
for (const source of sources) {
 source.sourceUrl = "https://freesound.org/people/" + source.creator + "/sounds/" + source.id + "/";
 const page = await fetch(source.sourceUrl);
 if (!page.ok) throw new Error("Source page unavailable: " + source.id);
 const html = await page.text();
 if (!html.includes("creativecommons.org/publicdomain/zero")) throw new Error("CC0 not verified: " + source.id);
 source.license = "CC0-1.0";
 source.licenseUrl = "https://creativecommons.org/publicdomain/zero/1.0/";
 source.previewUrl = html.match(/https:\/\/cdn\.freesound\.org\/previews\/[^"'<>\s]+-hq\.mp3/)?.[0];
 if (!source.previewUrl) throw new Error("No HQ audio: " + source.id);
 const response = await fetch(source.previewUrl);
 if (!response.ok) throw new Error("Audio unavailable: " + source.id);
 const audio = Buffer.from(await response.arrayBuffer());
 if (audio.length < 1000) throw new Error("Empty audio");
 source.path = "sound/voice-lines/signal-dog-v1/" + source.name + ".mp3";
 source.bytes = audio.length; source.sha256 = createHash("sha256").update(audio).digest("hex");
 await fs.writeFile(new URL(source.name + ".mp3", folder), audio);
 console.log(source.name + ": " + audio.length + " bytes");
}
await fs.writeFile(new URL("sources.json",folder), JSON.stringify(sources,null,2)+"\n");
await fs.writeFile(new URL("readme.md",folder), "# Mia's dog recordings\n\nSix recorded dog sounds, used under CC0-1.0. sources.json records the verified source page, creator, public HQ preview, license, bytes and SHA-256 for each. Runtime clips use short segments from these masters; no TTS impersonates an animal.\n\n" + sources.map(s=>"- ["+s.title+"]("+s.sourceUrl+") by "+s.creator+" — [CC0]("+s.licenseUrl+")").join("\n")+"\n");
