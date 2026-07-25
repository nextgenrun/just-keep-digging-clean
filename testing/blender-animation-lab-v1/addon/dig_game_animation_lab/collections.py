"""Create and isolate the add-on's Blender collections."""

from __future__ import annotations

import bpy


COLLECTION_NAMES = (
    "DGAL_SESSION",
    "DGAL_BASELINE",
    "DGAL_EDITED",
    "DGAL_PROPS",
    "DGAL_MESH_CANDIDATE",
    "DGAL_GUIDES",
)


def ensure_collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    collection = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    owner = parent or bpy.context.scene.collection
    if collection.name not in {child.name for child in owner.children}:
        owner.children.link(collection)
    return collection


def ensure_lab_collections() -> dict[str, bpy.types.Collection]:
    root = ensure_collection(COLLECTION_NAMES[0])
    return {name: root if name == root.name else ensure_collection(name, root) for name in COLLECTION_NAMES}


def move_object(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def tag_object(obj: bpy.types.Object, role: str, session_name: str) -> None:
    obj["dgal_role"] = role
    obj["dgal_session"] = session_name
    obj["productionChanged"] = False

