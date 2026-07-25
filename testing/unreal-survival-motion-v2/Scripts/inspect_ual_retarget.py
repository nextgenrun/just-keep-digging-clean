"""Log the current UAL and Survival IK chain and retarget-pose state."""

import unreal


SOURCE_RIG = "/Game/SurvivalMotion/Retarget/IK_UAL_Active_Source.IK_UAL_Active_Source"
TARGET_RIG = "/Game/SurvivalMotion/Retarget/IK_SurvivalCharacter_Fab_v1.IK_SurvivalCharacter_Fab_v1"
RETARGETER = "/Game/SurvivalMotion/Retarget/RTG_UAL_To_SurvivalCharacter_v1.RTG_UAL_To_SurvivalCharacter_v1"


def main() -> None:
    for label, path in (("source", SOURCE_RIG), ("target", TARGET_RIG)):
        rig = unreal.load_asset(path)
        controller = unreal.IKRigController.get_controller(rig)
        unreal.log(f"UAL_RIG_STATE {label} root={controller.get_retarget_root()}")
        for chain in controller.get_retarget_chains():
            unreal.log(f"UAL_RIG_CHAIN {label} {chain}")

    retargeter = unreal.load_asset(RETARGETER)
    controller = unreal.IKRetargeterController.get_controller(retargeter)
    for chain_name in (
        "Spine", "Neck", "Head", "LeftLeg", "LeftFoot", "LeftClavicle",
        "LeftArm", "RightLeg", "RightFoot", "RightClavicle", "RightArm",
    ):
        unreal.log(f"UAL_RTG_MAP target={chain_name} source={controller.get_source_chain(chain_name)}")
    for row in controller.get_all_chain_settings():
        unreal.log(f"UAL_RTG_CHAIN {row}")
    for side in (unreal.RetargetSourceOrTarget.SOURCE, unreal.RetargetSourceOrTarget.TARGET):
        poses = controller.get_retarget_poses(side)
        current = controller.get_current_retarget_pose_name(side)
        unreal.log(f"UAL_RTG_POSES side={side} current={current} poses={poses}")


if __name__ == "__main__":
    main()
