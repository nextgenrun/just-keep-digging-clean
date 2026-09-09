export async function run(page,output,fs){
  const gallery=await page.context().newPage();
  await gallery.setViewportSize({width:1100,height:1200});
  await gallery.goto('http://127.0.0.1:8194/visual-approval-previews/2026-09-05-most-seen-visuals/2026-09-05-visual-review.html',{waitUntil:'networkidle'});
  await gallery.screenshot({path:output+'/inspection-gallery-small.jpg',type:'jpeg',quality:48});
  await gallery.close();
}
