"""Map the approved 24-bone Meshy rig onto the Survival deform rig."""

MESHY_TO_SURVIVAL_BONES = {
    "Hips": "pelvis",
    "LeftUpLeg": "thigh_l", "LeftLeg": "calf_l", "LeftFoot": "foot_l", "LeftToeBase": "ball_l",
    "RightUpLeg": "thigh_r", "RightLeg": "calf_r", "RightFoot": "foot_r", "RightToeBase": "ball_r",
    "Spine": "spine_01", "Spine01": "spine_03", "Spine02": "spine_05",
    "LeftShoulder": "clavicle_l", "LeftArm": "upperarm_l",
    "LeftForeArm": "lowerarm_l", "LeftHand": "hand_l",
    "RightShoulder": "clavicle_r", "RightArm": "upperarm_r",
    "RightForeArm": "lowerarm_r", "RightHand": "hand_r",
    "neck": "neck_01", "Neck": "neck_01", "Head": "head",
}
