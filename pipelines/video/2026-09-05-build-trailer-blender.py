"""Create the editable Blender 5.1 Video Sequencer project for the trailer."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PACK=ROOT/'steam-marketing/2026-09-05-understar-three-minute-trailer'
WORK=PACK/'work'
CFG=json.loads((PACK/'edit.json').read_text(encoding='utf-8'))
FPS=CFG['fps']
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.name='UNDERSTAR - 3 minute gameplay trailer'
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=10800
scene.render.engine='BLENDER_EEVEE'
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.render.image_settings.media_type='VIDEO'
scene.render.image_settings.file_format='FFMPEG'
scene.render.ffmpeg.format='MPEG4'
scene.render.ffmpeg.codec='H264'
scene.render.ffmpeg.constant_rate_factor='HIGH'
scene.render.ffmpeg.audio_codec='AAC'
scene.render.ffmpeg.audio_bitrate=320
scene.render.ffmpeg.audio_mixrate=48000
scene.render.filepath='//understar-blender-export.mp4'
editor=scene.sequence_editor_create()
strips=editor.strips
for c in CFG['cuts']:
    start=round(c['timelineIn']*FPS)+1
    movie=strips.new_movie(c['id'],str(WORK/'clips'/(c['id']+'.mp4')),channel=1,frame_start=start)
    movie.frame_final_duration=round(c['duration']*FPS)
    movie.color_tag='COLOR_04'
    marker=scene.timeline_markers.new(c['id'].split('-',1)[1].upper(),frame=start)
sound=strips.new_sound('MASTER - score and game effects',str(WORK/'final-mix.wav'),channel=2,frame_start=1)
sound.volume=1
sound.color_tag='COLOR_03'
def fade(strip,start,end,din=.3,dout=.25):
    strip.blend_alpha=0;strip.keyframe_insert(data_path='blend_alpha',frame=start)
    strip.blend_alpha=1;strip.keyframe_insert(data_path='blend_alpha',frame=start+round(din*FPS))
    strip.keyframe_insert(data_path='blend_alpha',frame=end-round(dout*FPS))
    strip.blend_alpha=0;strip.keyframe_insert(data_path='blend_alpha',frame=end)
def shade(name,a,b,opacity):
    start=round(a*FPS)+1;length=round((b-a)*FPS)
    s=strips.new_effect(name,type='COLOR',channel=3,frame_start=start,length=length)
    s.color=(.002,.004,.009);s.blend_type='ALPHA_OVER';s.blend_alpha=opacity
    return s
shade('Brand introduction - darken',10,16,.32)
shade('Wishlist - darken',174,180,.66)
for name,a,b,width,y in [('UNDERSTAR opening',10,16,1120,205),('UNDERSTAR endcard',174,180,1350,320)]:
    start=round(a*FPS)+1;end=round(b*FPS)+1
    logo=strips.new_image(name,str(WORK/'understar-logo.png'),channel=4,frame_start=start)
    logo.frame_final_duration=end-start;logo.blend_type='ALPHA_OVER'
    # Scale the original logo canvas to the intended editorial width.
    logo.transform.scale_x=width/1555
    logo.transform.scale_y=width/1555
    height=width*462/1555
    logo.transform.offset_y=540-(y+height/2)
    fade(logo,start,end,.5,.5 if a==10 else .6)
fonts={name:bpy.data.fonts.load(str(WORK/f'BarlowSemiCondensed-{name}.ttf')) for name in ['SemiBold','Bold']}
styles={'Feature':(62,fonts['SemiBold']),'Power':(42,fonts['SemiBold']),'Eyebrow':(30,fonts['SemiBold']),'CTA':(64,fonts['Bold'])}
for i,t in enumerate(CFG['titles']):
    start=round(t['start']*FPS)+1;end=round(t['end']*FPS)+1
    txt=strips.new_effect('TITLE - '+t['text'],type='TEXT',channel=5,frame_start=start,length=end-start)
    txt.text=t['text'];txt.font_size=styles[t['style']][0];txt.font=styles[t['style']][1]
    txt.location=(.5,1-t['y']/1080);txt.anchor_x='CENTER';txt.anchor_y='CENTER';txt.alignment_x='CENTER'
    txt.color=(.94,.97,.95,1);txt.use_outline=True;txt.outline_width=.025;txt.outline_color=(.02,.025,.03,1)
    txt.use_shadow=True;txt.shadow_color=(.005,.007,.01,.8);txt.blend_type='ALPHA_OVER'
    fade(txt,start,end)
    if t['style'] in ['Feature','CTA']:
        line=strips.new_effect('Rule - '+str(i),type='COLOR',channel=6,frame_start=start,length=end-start)
        line.color=(.61,.45,.25);line.blend_type='ALPHA_OVER'
        line.transform.scale_x=170/1920;line.transform.scale_y=2/1080
        line.transform.offset_y=540-(t['y']+49)
        fade(line,start,end,.35,.25)
endfade=strips.new_effect('Final fade to black',type='COLOR',channel=7,frame_start=10765,length=36)
endfade.color=(0,0,0);endfade.blend_type='ALPHA_OVER'
endfade.blend_alpha=0;endfade.keyframe_insert(data_path='blend_alpha',frame=10765)
endfade.blend_alpha=1;endfade.keyframe_insert(data_path='blend_alpha',frame=10800)
scene.frame_set(1)
scene['Delivery']='Final MP4 was mastered in FFmpeg. This VSE project retains every normalized cut, native text, logos and final audio.'
scene['Audio']='48 kHz stereo; -15 LUFS target; true-peak limit -1.5 dBTP.'
scene['Original speed']='No gameplay speed changes. Optional crops are already applied to the normalized source clips.'
scene['Title note']='Blender text tracking differs slightly from libass. titles.ass is authoritative for the delivered MP4.'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.type='SEQUENCE_EDITOR'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(PACK/'understar-gameplay-trailer.blend'))
bpy.ops.wm.open_mainfile(filepath=str(PACK/'understar-gameplay-trailer.blend'))
scene=bpy.context.scene;editor=scene.sequence_editor;strips=editor.strips
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='SEQUENCE_EDITOR':area.spaces.active.view_type='SEQUENCER_PREVIEW'
bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_as_mainfile(filepath=str(PACK/'understar-gameplay-trailer.blend'))
report={'version':bpy.app.version_string,'frameStart':scene.frame_start,'frameEnd':scene.frame_end,'fps':FPS,
        'cuts':len(CFG['cuts']),'strips':len(strips),'allMediaPresent':all(Path(bpy.path.abspath(s.sound.filepath if s.type=='SOUND' else s.filepath)).exists() for s in strips if s.type in ['MOVIE','SOUND']),
        'titleRendering':'Editable native text; the delivered MP4 uses titles.ass for exact letter spacing.'}
(PACK/'blender-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report),flush=True)
scene.frame_set(10680)
scene.render.image_settings.media_type='IMAGE'
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(WORK/'blender-endcard-proof.png')
bpy.ops.render.render(write_still=True)
