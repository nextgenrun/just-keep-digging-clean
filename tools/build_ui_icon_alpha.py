from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "sprites" / "UI" / "icons"
SOURCE_PATH = ICON_DIR / "shop-ui-icon-atlas-v1-source.png"
OUTPUT_PATH = ICON_DIR / "shop-ui-icon-atlas-v1.png"
GRID_SIZE = 6
OUTER_CLEAR_PX = 18
BACKGROUND_COMPONENT_MIN = 64
MIN_ICON_PIXELS = 450
LEAKAGE_MIN_CHANNEL = 135
LEAKAGE_MAX_SPREAD = 24
EDGE_COMPONENT_MARGIN = 24
EDGE_COMPONENT_MAX_PIXELS = 700


def is_checker_background(pixel):
    red, green, blue, _alpha = pixel
    return (
        min(red, green, blue) >= 216
        and max(red, green, blue) - min(red, green, blue) <= 20
    )


def clear_checker_components(image, left, top, width, height):
    pixels = image.load()
    candidate = bytearray(width * height)
    visited = bytearray(width * height)

    for local_y in range(height):
        for local_x in range(width):
            index = local_y * width + local_x
            candidate[index] = int(
                is_checker_background(pixels[left + local_x, top + local_y])
            )

    for start in range(width * height):
        if not candidate[start] or visited[start]:
            continue

        stack = [start]
        visited[start] = 1
        component = []
        while stack:
            index = stack.pop()
            component.append(index)
            x = index % width
            y = index // width
            for nx, ny in (
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            ):
                if nx < 0 or nx >= width or ny < 0 or ny >= height:
                    continue
                neighbor = ny * width + nx
                if candidate[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    stack.append(neighbor)

        if len(component) < BACKGROUND_COMPONENT_MIN:
            continue

        for index in component:
            x = index % width
            y = index // width
            red, green, blue, _alpha = pixels[left + x, top + y]
            pixels[left + x, top + y] = (red, green, blue, 0)


def clear_fixed_frame_band(image, left, top, width, height):
    pixels = image.load()
    for local_y in range(height):
        for local_x in range(width):
            if (
                local_x >= OUTER_CLEAR_PX
                and local_x < width - OUTER_CLEAR_PX
                and local_y >= OUTER_CLEAR_PX
                and local_y < height - OUTER_CLEAR_PX
            ):
                continue
            red, green, blue, _alpha = pixels[left + local_x, top + local_y]
            pixels[left + local_x, top + local_y] = (red, green, blue, 0)


def clear_neutral_edge_leakage(image, left, top, width, height):
    pixels = image.load()
    visited = bytearray(width * height)
    stack = []

    for local_y in range(height):
        for local_x in range(width):
            if pixels[left + local_x, top + local_y][3] == 0:
                index = local_y * width + local_x
                visited[index] = 1
                stack.append(index)

    while stack:
        index = stack.pop()
        x = index % width
        y = index // width
        for nx, ny in (
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
        ):
            if nx < 0 or nx >= width or ny < 0 or ny >= height:
                continue
            neighbor = ny * width + nx
            if visited[neighbor]:
                continue

            red, green, blue, alpha = pixels[left + nx, top + ny]
            is_transparent = alpha == 0
            is_neutral_leakage = (
                min(red, green, blue) >= LEAKAGE_MIN_CHANNEL
                and max(red, green, blue) - min(red, green, blue)
                <= LEAKAGE_MAX_SPREAD
            )
            if not is_transparent and not is_neutral_leakage:
                continue

            visited[neighbor] = 1
            if not is_transparent:
                pixels[left + nx, top + ny] = (red, green, blue, 0)
            stack.append(neighbor)


def clear_small_edge_components(image, left, top, width, height):
    pixels = image.load()
    visited = bytearray(width * height)

    for start in range(width * height):
        if visited[start]:
            continue
        start_x = start % width
        start_y = start // width
        if pixels[left + start_x, top + start_y][3] == 0:
            visited[start] = 1
            continue

        stack = [start]
        visited[start] = 1
        component = []
        min_x = max_x = start_x
        min_y = max_y = start_y
        while stack:
            index = stack.pop()
            component.append(index)
            x = index % width
            y = index // width
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
            for nx, ny in (
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            ):
                if nx < 0 or nx >= width or ny < 0 or ny >= height:
                    continue
                neighbor = ny * width + nx
                if visited[neighbor]:
                    continue
                if pixels[left + nx, top + ny][3] == 0:
                    visited[neighbor] = 1
                    continue
                visited[neighbor] = 1
                stack.append(neighbor)

        near_edge = (
            min_x < EDGE_COMPONENT_MARGIN
            or min_y < EDGE_COMPONENT_MARGIN
            or max_x >= width - EDGE_COMPONENT_MARGIN
            or max_y >= height - EDGE_COMPONENT_MARGIN
        )
        if near_edge and len(component) <= EDGE_COMPONENT_MAX_PIXELS:
            for index in component:
                x = index % width
                y = index // width
                red, green, blue, _alpha = pixels[left + x, top + y]
                pixels[left + x, top + y] = (red, green, blue, 0)


def frame_opaque_count(image, left, top, width, height):
    pixels = image.load()
    count = 0
    for local_y in range(height):
        for local_x in range(width):
            if pixels[left + local_x, top + local_y][3] > 8:
                count += 1
    return count


def main():
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(
            "Missing approved source atlas: " + str(SOURCE_PATH)
        )

    image = Image.open(SOURCE_PATH).convert("RGBA")
    frame_width = image.width // GRID_SIZE
    frame_height = image.height // GRID_SIZE
    if frame_width * GRID_SIZE != image.width or frame_height * GRID_SIZE != image.height:
        raise ValueError("Icon atlas dimensions must divide into an exact 6x6 grid.")

    frame_counts = []
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            left = column * frame_width
            top = row * frame_height
            clear_checker_components(
                image,
                left,
                top,
                frame_width,
                frame_height,
            )
            clear_fixed_frame_band(
                image,
                left,
                top,
                frame_width,
                frame_height,
            )
            clear_neutral_edge_leakage(
                image,
                left,
                top,
                frame_width,
                frame_height,
            )
            clear_small_edge_components(
                image,
                left,
                top,
                frame_width,
                frame_height,
            )
            frame_counts.append(
                frame_opaque_count(
                    image,
                    left,
                    top,
                    frame_width,
                    frame_height,
                )
            )

    weakest_frame = min(frame_counts)
    if weakest_frame < MIN_ICON_PIXELS:
        raise RuntimeError(
            "Mask validation failed: weakest icon retained only "
            + str(weakest_frame)
            + " opaque pixels."
        )

    image.save(OUTPUT_PATH, "PNG", optimize=True)
    print(
        "Wrote transparent runtime atlas: "
        + str(OUTPUT_PATH)
        + " | weakest frame pixels="
        + str(weakest_frame)
        + " | strongest frame pixels="
        + str(max(frame_counts))
    )


if __name__ == "__main__":
    main()
