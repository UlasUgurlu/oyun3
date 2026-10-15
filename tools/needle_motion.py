"""Measure the native needle itself in Android screenshots, without a JS timer."""
import io
import math
from collections import deque

from PIL import Image


def frame(data):
    image = Image.open(io.BytesIO(data)).convert("RGB")
    image.thumbnail((540, 960))
    return image


def dial_geometry(image, bounds):
    """Fit the largest connected blue ring, excluding HUD text and target glow."""
    scale = image.width / bounds[4]
    left, top, right, bottom = [round(v * scale) for v in bounds[:4]]
    pixels = image.load()
    candidates = set()
    for y in range(max(0, top), min(image.height, bottom)):
        for x in range(max(0, left), min(image.width, right)):
            r, g, b = pixels[x, y]
            if 30 <= r <= 90 and 8 <= g - r <= 35 and 15 <= b - g <= 50:
                candidates.add((x, y))
    largest = []
    while candidates:
        start = candidates.pop()
        queue, component = deque([start]), [start]
        while queue:
            x, y = queue.popleft()
            for point in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if point in candidates:
                    candidates.remove(point)
                    queue.append(point)
                    component.append(point)
        if len(component) > len(largest):
            largest = component
    assert len(largest) > 500, "Rendered dial ring could not be measured"
    # Translate before least squares to keep the three-equation system stable.
    ox = sum(x for x, _ in largest) / len(largest)
    oy = sum(y for _, y in largest) / len(largest)
    matrix = [[0.0] * 4 for _ in range(3)]
    for x, y in largest:
        x, y = x - ox, y - oy
        row, value = (2 * x, 2 * y, 1), x * x + y * y
        for i in range(3):
            for j in range(3):
                matrix[i][j] += row[i] * row[j]
            matrix[i][3] += row[i] * value
    for i in range(3):
        pivot = max(range(i, 3), key=lambda j: abs(matrix[j][i]))
        matrix[i], matrix[pivot] = matrix[pivot], matrix[i]
        factor = matrix[i][i]
        assert abs(factor) > 1e-8, "Degenerate dial geometry"
        matrix[i] = [v / factor for v in matrix[i]]
        for j in range(3):
            if j != i:
                factor = matrix[j][i]
                matrix[j] = [a - factor * b for a, b in zip(matrix[j], matrix[i])]
    dx, dy, constant = [row[3] for row in matrix]
    return ox + dx, oy + dy, math.sqrt(constant + dx * dx + dy * dy)


def needle_angle(image, geometry):
    cx, cy, radius = geometry
    pixels, points = image.load(), []
    extent = radius * 1.27
    inner2, outer2 = (radius * 1.08) ** 2, extent ** 2
    for y in range(max(0, int(cy - extent)), min(image.height, math.ceil(cy + extent))):
        for x in range(max(0, int(cx - extent)), min(image.width, math.ceil(cx + extent))):
            distance2 = (x - cx) ** 2 + (y - cy) ** 2
            if inner2 < distance2 < outer2 and min(pixels[x, y]) > 225:
                points.append((x, y))
    assert len(points) >= 3, "Native needle did not render outside the ring"
    x = sum(x for x, _ in points) / len(points)
    y = sum(y for _, y in points) / len(points)
    return math.atan2(y - cy, x - cx)


def measure_motion(frames, bounds):
    images = [frame(data) for data in frames]
    geometry = dial_geometry(images[0], bounds)
    angles = [needle_angle(image, geometry) for image in images]
    distinct = len({round(angle / 0.08) for angle in angles})
    travel = sum(abs(math.atan2(math.sin(b - a), math.cos(b - a))) for a, b in zip(angles, angles[1:]))
    assert distinct >= 4 and travel > 0.5, "Native needle appears frozen"
    return {"distinct_positions": distinct, "travel_radians": round(travel, 3), "angles": [round(a, 3) for a in angles]}
