"""Refine the public GLB surfaces without changing the supplied stand shape.

Offline only: Python 3 + NumPy. Input/output are public display assets, not 3MFs.
Flat crowns need planar UVs and separate normals from the patterned sidewall.
"""
import argparse, copy
from pathlib import Path
import numpy as np
from glb_geometry import GLB, read_glb, accessor


def refine(source, destination):
    old, binary = read_glb(source)
    out = GLB()
    out.g['asset']['generator'] = 'MENNOO planar crown refinement 2026-10-12'
    for image in old.get('images', []):
        view = old['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        out.texture(binary[start:start + view['byteLength']], image['mimeType'])
    out.g['samplers'] = copy.deepcopy(old.get('samplers', []))
    out.g['textures'] = copy.deepcopy(old.get('textures', []))
    out.g['materials'] = copy.deepcopy(old['materials'])
    for mesh in old['meshes']:
        for primitive in mesh['primitives']:
            attributes = primitive['attributes']
            v = accessor(old, binary, attributes['POSITION'])
            n = accessor(old, binary, attributes['NORMAL'])
            uv = accessor(old, binary, attributes['TEXCOORD_0']) if 'TEXCOORD_0' in attributes else None
            f = accessor(old, binary, primitive['indices']).reshape(-1, 3)
            material = primitive['material']
            if 'black_pla_body' not in mesh['name']:
                out.mesh(mesh['name'], v, n, f, material, uv)
                continue
            top = v[:, 1].max()
            floor = top - .003
            # Flat cap, pocket floor and four pocket walls are independent surfaces.
            groups = []
            for level in (top, floor):
                groups.append((np.all(np.abs(v[f][:, :, 1] - level) < 1e-7, axis=1), [0, 1, 0], (0, 2)))
            for axis in (0, 2):
                for side in (-1, 1):
                    normal = [0, 0, 0]
                    normal[axis] = -side
                    on_wall = np.all(np.abs(v[f][:, :, axis] - side * .0205) < 1e-7, axis=1)
                    within = np.all((v[f][:, :, 1] >= floor - 1e-7) & (v[f][:, :, 1] <= top + 1e-7), axis=1)
                    groups.append((on_wall & within, normal, (2 if axis == 0 else 0, 1)))
            planar = np.zeros(len(f), dtype=bool)
            for mask, _, _ in groups:
                planar |= mask
            used, inverse = np.unique(f[~planar], return_inverse=True)
            out.mesh(mesh['name'], v[used], n[used], inverse.reshape(-1, 3), material, uv[used] if uv is not None else None)
            cap_material = copy.deepcopy(out.g['materials'][material])
            cap_material['name'] = 'Matte PLA planar crown and QR recess'
            cap_material.pop('normalTexture', None)
            cap_material['pbrMetallicRoughness']['roughnessFactor'] = .78
            cap_id = out.material(cap_material)
            for index, (mask, normal, axes) in enumerate(groups):
                if not mask.any():
                    continue
                vertices, inverse = np.unique(v[f[mask]].reshape(-1, 3), axis=0, return_inverse=True)
                faces = inverse.reshape(-1, 3)
                normals = np.tile(normal, (len(vertices), 1))
                # Correct occasional reversed source faces as well as the shading.
                cross = np.cross(vertices[faces[:, 1]] - vertices[faces[:, 0]], vertices[faces[:, 2]] - vertices[faces[:, 0]])
                reverse = cross @ np.asarray(normal) < 0
                faces[reverse] = faces[reverse][:, [0, 2, 1]]
                out.mesh('pla_recess_surface_' + str(index), vertices, normals, faces, cap_id, vertices[:, axes] * 20)
    temporary = destination / (source.name.split('.')[0] + '.glb')
    digest = out.save(temporary)
    result = destination / (temporary.stem + '.' + digest + '.glb')
    temporary.rename(result)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    args.destination.mkdir(parents=True, exist_ok=True)
    for source in sorted(args.source.glob('*.glb')):
        if source.name.startswith('cafe-table.'):
            continue
        result = refine(source, args.destination)
        print(result.name, result.stat().st_size)
