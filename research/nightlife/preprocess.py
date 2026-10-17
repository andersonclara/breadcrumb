"""Local image preprocessing only; uses existing OpenCV, makes no network calls."""
import argparse
import json
from pathlib import Path
import cv2

parser = argparse.ArgumentParser()
parser.add_argument('image')
parser.add_argument('output_directory')
parser.add_argument('--pride-regions', action='store_true', help='Manually chosen benchmark regions; not a generic layout detector')
args = parser.parse_args()
source = cv2.imread(args.image)
if source is None:
    raise SystemExit('IMAGE_DECODE_FAILED')
output = Path(args.output_directory)
output.mkdir(parents=True, exist_ok=True)
gray = cv2.cvtColor(source, cv2.COLOR_BGR2GRAY)
scale = min(2.0, 4000 / max(gray.shape))
gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
_, otsu = cv2.threshold(clahe, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
paths = {}
for name, image in [('contrast', clahe), ('threshold', otsu)]:
    target = output / f'{name}.png'
    if not cv2.imwrite(str(target), image):
        raise SystemExit('IMAGE_WRITE_FAILED')
    paths[name] = str(target.resolve())
if args.pride_regions:
    height, width = source.shape[:2]
    for name, box in [('manual_schedule_crop', (0.19, 0.32, 0.84, 0.40)), ('manual_offer_crop', (0.70, 0.65, 0.99, 0.85))]:
        left, top, right, bottom = box
        crop = source[int(top * height):int(bottom * height), int(left * width):int(right * width)]
        crop = cv2.resize(crop, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        target = output / f'{name}.png'
        if not cv2.imwrite(str(target), crop):
            raise SystemExit('CROP_WRITE_FAILED')
        paths[name] = str(target.resolve())
print(json.dumps({'opencv': cv2.__version__, 'outputs': paths, 'scale': scale}))
