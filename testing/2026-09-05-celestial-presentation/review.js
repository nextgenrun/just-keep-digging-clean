import "../2026-08-31-celestial-abilities-visual-harness.js";

const params = new URLSearchParams(location.search);
for (const link of document.querySelectorAll("nav a[href]")) {
  if (new URL(link.href).search === location.search) link.setAttribute("aria-current", "page");
}
const record = document.querySelector("#record");
const status = document.querySelector("#record-status");
const download = document.querySelector("#download");
record.addEventListener("click", () => {
  const canvas = document.querySelector("canvas");
  if (!canvas || record.disabled) return;
  record.disabled = true;
  download.hidden = true;
  status.textContent = "Recording animation…";
  const stream = canvas.captureStream(30);
  const chunks = [];
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9" : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = () => {
    stream.getTracks().forEach(track => track.stop());
    const reader = new FileReader();
    reader.onload = () => {
      download.href = reader.result;
      download.download = "celestial-" + (params.has("passives") ? "passives" : params.get("ability") || "star") + ".webm";
      download.hidden = false;
      record.disabled = false;
      status.textContent = "Preview recorded";
    };
    reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
  };
  recorder.start();
  setTimeout(() => recorder.stop(), 5000);
});
