"""Configure stable UV-anchored materials and path tracing for the native review."""
import bpy
from pathlib import Path

def set_input(shader, name, value):
    if name not in shader.inputs: return
    for link in list(shader.inputs[name].links): shader.id_data.links.remove(link)
    shader.inputs[name].default_value=value

def node(tree, kind, name):
    result=tree.nodes.new(kind); result.name='DefinitionV2_'+name
    return result

def range_node(tree, name, source, input_range, output_range):
    result=node(tree,'ShaderNodeMapRange',name)
    result.clamp=True
    for socket,value in zip(('From Min','From Max','To Min','To Max'),[*input_range,*output_range]):
        result.inputs[socket].default_value=value
    tree.links.new(source,result.inputs['Value'])
    return result.outputs['Result']

def configure_materials(config,height):
    report={"normalTextureCorrections":[]}
    for image in bpy.data.images:
        if 'normal' in (image.name+' '+image.filepath).lower() and image.colorspace_settings.name!='Non-Color':
            report['normalTextureCorrections'].append(image.name)
            image.colorspace_settings.name='Non-Color'
    for name,settings in config['materials'].items():
        mat=bpy.data.materials[name]; tree=mat.node_tree
        shader=next(n for n in tree.nodes if n.type=='BSDF_PRINCIPLED')
        textures=[n for n in tree.nodes if n.type=='TEX_IMAGE' and n.image]
        base=next(n for n in textures if 'basecolor' in (n.image.name+' '+n.image.filepath).lower())
        orm=next(n for n in textures if 'occlusionroughnessmetallic' in (n.image.name+' '+n.image.filepath).lower())
        base.image.colorspace_settings.name='sRGB'; orm.image.colorspace_settings.name='Non-Color'
        uv=node(tree,'ShaderNodeTexCoord','UV')
        for tex in textures:
            if not tex.inputs['Vector'].links:tree.links.new(uv.outputs['UV'],tex.inputs['Vector'])
            tex.interpolation='Linear'
        bw=node(tree,'ShaderNodeRGBToBW','AlbedoLuminance')
        tree.links.new(base.outputs['Color'],bw.inputs['Color'])
        detail=range_node(tree,'FabricValue',bw.outputs[0],settings['luminanceRange'],settings['detailRange'])
        tint=node(tree,'ShaderNodeMixRGB','FixedAlbedo')
        tint.blend_type='MULTIPLY'; tint.inputs[0].default_value=1
        tint.inputs[1].default_value=settings['albedo']; tree.links.new(detail,tint.inputs[2])
        separate=node(tree,'ShaderNodeSeparateColor','ORM'); separate.mode='RGB'
        tree.links.new(orm.outputs['Color'],separate.inputs['Color'])
        ao=node(tree,'ShaderNodeMixRGB','CreaseOcclusion'); ao.blend_type='MULTIPLY'
        ao.inputs[0].default_value=settings['ao']
        tree.links.new(tint.outputs[0],ao.inputs[1]);tree.links.new(separate.outputs['Red'],ao.inputs[2])
        tree.links.new(ao.outputs[0],shader.inputs['Base Color'])
        rough=range_node(tree,'TexturedRoughness',separate.outputs['Green'],[0,1],settings['roughnessRange'])
        tree.links.new(rough,shader.inputs['Roughness'])
        for socket,value in [('Metallic',0),('Coat Weight',0),('Sheen Weight',settings['sheen']),('Specular IOR Level',settings['specular'])]:
            set_input(shader,socket,value)
        normals=[n for n in tree.nodes if n.type=='NORMAL_MAP']
        for normal in normals: normal.inputs['Strength'].default_value=settings['normal']
        noise=node(tree,'ShaderNodeTexNoise','PinnedFabricGrain');noise.noise_dimensions='3D'
        tree.links.new(uv.outputs['UV'],noise.inputs['Vector'])
        noise.inputs['Scale'].default_value=settings['microScale'];noise.inputs['Detail'].default_value=2
        bump=node(tree,'ShaderNodeBump','MicroSurface')
        bump.inputs['Distance'].default_value=height*settings['microHeight'];bump.inputs['Strength'].default_value=0.22
        tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
        if shader.inputs['Normal'].links: tree.links.new(shader.inputs['Normal'].links[0].from_socket,bump.inputs['Normal'])
        tree.links.new(bump.outputs['Normal'],shader.inputs['Normal'])
        report[name]={'fixedLinearAlbedo':settings['albedo'],'coordinates':'UV','metallic':0,'baseTexture':base.image.filepath,'baseTextureSize':list(base.image.size),'roughnessRange':settings['roughnessRange'],'normalStrength':settings['normal']}
    skin=config['skin'];shader=next(n for n in bpy.data.materials['Head'].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    for socket,value in [('Metallic',0),('Roughness',skin['roughness']),('Subsurface Weight',skin['subsurface']),('Subsurface Scale',skin['subsurfaceScale']),('Specular IOR Level',skin['specular'])]:set_input(shader,socket,value)
    for n in shader.id_data.nodes:
        if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=skin['normal']
    hair=config['hair'];shader=next(n for n in bpy.data.materials['Hair3'].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    for socket,value in [('Metallic',0),('Roughness',hair['roughness']),('Specular IOR Level',hair['specular']),('Sheen Weight',hair['sheen']),('Anisotropic',hair['anisotropic'])]:set_input(shader,socket,value)
    for n in shader.id_data.nodes:
        if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=hair['normal']
    for name,settings in [('Head',skin),('Hair3',hair)]:
        tree=bpy.data.materials[name].node_tree;shader=next(n for n in tree.nodes if n.type=='BSDF_PRINCIPLED')
        source=shader.inputs['Base Color'].links[0].from_socket
        tint=node(tree,'ShaderNodeMixRGB','NaturalAlbedo');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1
        tree.links.new(source,tint.inputs[1]);tint.inputs[2].default_value=settings['albedoTint']
        tree.links.new(tint.outputs[0],shader.inputs['Base Color'])
    eye=bpy.data.materials['Body_Arkit:Eye']
    for tex in eye.node_tree.nodes:
        if tex.type=='TEX_IMAGE' and tex.image and not tex.image.size[0]:
            tex.image=bpy.data.images.load(str(Path(__file__).resolve().parents[1]/config['eyeTexture']),check_existing=True)
            tex.image.colorspace_settings.name='sRGB';report['missingEyeAlbedoRestored']=True
    report['skinMetallicCorrected']=True
    return report

def configure_render(scene,body,config):
    settings=config['pathTracing'];scene.render.engine=settings['engine']
    cycles=scene.cycles;cycles.samples=config['renderSamples'];cycles.use_adaptive_sampling=True
    cycles.adaptive_threshold=settings['adaptiveThreshold'];cycles.use_denoising=settings['denoise']
    cycles.seed=settings['seed'];cycles.use_animated_seed=False
    cycles.max_bounces=settings['maxBounces'];cycles.diffuse_bounces=settings['diffuseBounces']
    cycles.glossy_bounces=settings['glossyBounces'];cycles.transparent_max_bounces=settings['transparentBounces']
    cycles.sample_clamp_indirect=settings['clampIndirect']
    devices=[];prefs=bpy.context.preferences.addons['cycles'].preferences
    for backend in settings['devices']:
        try:
            prefs.compute_device_type=backend;prefs.refresh_devices()
            available=[d for d in prefs.devices if d.type==backend]
            if not available:continue
            for d in prefs.devices:d.use=d.type==backend
            devices=[d.name for d in available];cycles.device='GPU';break
        except (TypeError,RuntimeError):continue
    if not devices:cycles.device='CPU'
    scene.render.use_persistent_data=True
    resized=[]
    for image in bpy.data.images:
        width,height=image.size
        if image.source!='TILED' and max(width,height)>settings['textureMaxSize']:
            scale=settings['textureMaxSize']/max(width,height)
            image.scale(round(width*scale),round(height*scale));resized.append(image.name)
    if hasattr(cycles,'denoising_use_gpu'):cycles.denoising_use_gpu=True
    scene.world.use_nodes=True
    background=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    background.inputs['Color'].default_value=(1,1,1,1);background.inputs['Strength'].default_value=settings['worldStrength']
    for modifier in body.modifiers:
        if modifier.type=='ARMATURE':modifier.use_deform_preserve_volume=settings['preserveJointVolume']
    result={'resizedInMemoryOnly':resized,'engine':scene.render.engine,'device':cycles.device,'devices':devices,'samples':cycles.samples,'seed':cycles.seed,'animatedSeed':cycles.use_animated_seed,'preserveJointVolume':settings['preserveJointVolume']}
    print('V2_RENDER_SETUP '+str(result),flush=True)
    return result
