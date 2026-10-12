"""Offline asset checks; no rendering or browser claims."""
from pathlib import Path
import hashlib, io, json, re
import numpy as np
from PIL import Image
from glb_geometry import read_glb, accessor

root = Path(__file__).resolve().parents[1] / 'public'
source = (root / 'assets/models.js').read_text()
models = json.loads(re.search(r'Object.freeze\((\{.*?\})\);', source, re.S).group(1))
qr_bytes = (root / 'media/qr-mennoo.png').read_bytes()
for path in sorted((root / 'models').glob('*.glb')):
    assert hashlib.sha256(path.read_bytes()).hexdigest()[:12] in path.name
    g, binary = read_glb(path)
    for image in g.get('images', []):
        view = g['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        Image.open(io.BytesIO(binary[start:start + view['byteLength']])).verify()
    crown_checked = False
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            v = accessor(g, binary, p['attributes']['POSITION'])
            n = accessor(g, binary, p['attributes']['NORMAL'])
            f = accessor(g, binary, p['indices']).reshape(-1, 3)
            assert np.isfinite(v).all() and np.isfinite(n).all()
            assert len(v) == len(n) and f.min() >= 0 and f.max() < len(v)
            assert np.allclose(np.linalg.norm(n, axis=1), 1, atol=1e-4)
            if mesh['name'] == 'pla_recess_surface_0':
                assert np.allclose(n, [0, 1, 0])
                assert 'normalTexture' not in g['materials'][p['material']]
                crown_checked = True
            if mesh['name'] == 'mennoo_qr_sticker':
                ident = path.name.split('.')[0]
                height = models[ident]['height']
                assert np.allclose(np.ptp(v, axis=0), [.0406, 0, .0406], atol=1e-7)
                assert np.allclose(v[:, 1], height - .003 + .000025, atol=1e-7)
                pbr = g['materials'][p['material']]['pbrMetallicRoughness']
                image = g['images'][g['textures'][pbr['baseColorTexture']['index']]['source']]
                view = g['bufferViews'][image['bufferView']]
                start = view.get('byteOffset', 0)
                assert binary[start:start + view['byteLength']] == qr_bytes
            if mesh['name'].startswith('black_pla_body'):
                height = models[path.name.split('.')[0]]['height']
                c = v[f].mean(axis=1)
                inside = (abs(c[:, 0]) < .020499) & (abs(c[:, 2]) < .020499) & (c[:, 1] > height - .002999)
                assert not inside.any(), 'Geometry covers the QR recess'
    if not path.name.startswith(('cafe-table.', 'cafe-stone.')):
        assert crown_checked
    print('PASS', path.name)
for m in models.values():
    for key in ['poster', 'posterMobile', 'thumbnail']:
        path = root / m[key].lstrip('/')
        assert hashlib.sha256(path.read_bytes()).hexdigest()[:12] in path.name
        with Image.open(path) as image:
            image.load()
            if key == 'posterMobile':
                assert image.height > image.width
print('PASS exact QR image, flat crown normals, recess clearance and responsive previews')
