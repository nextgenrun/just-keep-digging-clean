# Unreal Walk Channel Frames

Headless Unreal SceneCapture currently replicates a selected texture channel to grayscale in this project. These generated R, G, and B pass folders preserve the real Unreal pose, camera, skinning, and UV lookup; `port_walk_to_2d.py` recombines the three passes losslessly before transparency and sprite-sheet packing.
