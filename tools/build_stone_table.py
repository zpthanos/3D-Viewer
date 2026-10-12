"""Create an original procedural limestone finish on the existing café geometry.
No stock image, external texture or server dependency. Run offline with NumPy/Pillow.
"""
import io, json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from glb_geometry import GLB, read_glb

root = Path(__file__).resolve().parents[1]
source = root / 'public/models/cafe-table.2cbd4485102b.glb'
g, binary = read_glb(source)
size = 1024
rng = np.random.default_rng(167026)
y, x = np.mgrid[0:1:complex(size), 0:1:complex(size)]
cloud = np.asarray(Image.fromarray(rng.integers(0, 256, (64, 64), dtype=np.uint8))
                   .resize((size, size), Image.Resampling.BICUBIC)
                   .filter(ImageFilter.GaussianBlur(8)), dtype=float) / 255 - .5
vein = np.sin((y + .012*np.sin(x*17) + cloud*.012)*185)
fine = rng.normal(0, 1.15, (size, size))
tone = cloud*14 + vein*1.8 + fine
pores = rng.random((size, size)) > .9984
tone[pores] -= 26
rgb = np.clip(np.array([208, 193, 169]) + tone[:, :, None], 0, 255).astype('uint8')
blob = io.BytesIO()
Image.fromarray(rgb).save(blob, format='JPEG', quality=88, optimize=True)
result = GLB()
result.g, result.binary = g, bytearray(binary)
texture = result.texture(blob.getvalue(), 'image/jpeg')
surface = next(m for m in g['materials'] if m['name'] == 'Natural oiled walnut')
surface['name'] = 'Honed Mediterranean limestone — original procedural material'
surface['pbrMetallicRoughness'] = {'baseColorTexture': {'index': texture},
                                'roughnessFactor': .82, 'metallicFactor': 0}
g['asset']['generator'] = 'MENNOO original limestone surface 2026-10-12'
out = root / 'public/models/cafe-stone.glb'
digest = result.save(out)
out = out.rename(out.with_name('cafe-stone.' + digest + '.glb'))
print(json.dumps({'path': '/models/' + out.name, 'bytes': out.stat().st_size}))
