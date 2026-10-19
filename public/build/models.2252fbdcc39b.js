export const MODELS=Object.freeze({
  "boho": {
    "name": "BOHO",
    "description": "Stand ύψους 65 mm με ανάγλυφη, καμπύλη επιφάνεια και θέση για το QR στην επάνω πλευρά.",
    "height": 0.065,
    "src": "/models/boho.1a0729fb17f2.glb",
    "poster": "/media/poster-boho.6fd7d401f6e5.webp",
    "posterMobile": "/media/poster-boho-mobile.fac93931e3db.webp",
    "thumbnail": "/media/object-boho.1da4eeef2e3e.webp"
  },
  "mini-polygon": {
    "name": "MINI POLYGON",
    "description": "Χαμηλό stand ύψους 25 mm με επίπεδες, πολυγωνικές πλευρές και θέση για το QR επάνω.",
    "height": 0.025,
    "src": "/models/mini-polygon.7998287b48ef.glb",
    "poster": "/media/poster-mini-polygon.74d262493edd.webp",
    "posterMobile": "/media/poster-mini-polygon-mobile.9e45e2e7d4db.webp",
    "thumbnail": "/media/object-mini-polygon.4778be5f069a.webp"
  },
  "mini-votsalo": {
    "name": "MINI ΒΟΤΣΑΛΟ",
    "description": "Χαμηλό stand ύψους 25 mm με στρογγυλεμένο περίγραμμα, εμπνευσμένο από βότσαλο.",
    "height": 0.025,
    "src": "/models/mini-votsalo.2864e1350793.glb",
    "poster": "/media/poster-mini-votsalo.ec64c4b769a4.webp",
    "posterMobile": "/media/poster-mini-votsalo-mobile.42553ca51ccb.webp",
    "thumbnail": "/media/object-mini-votsalo.25e216bc6f08.webp"
  },
  "chonaki": {
    "name": "ΧΩΝΑΚΙ",
    "description": "Stand ύψους 65 mm σε σχήμα κώνου, με ανάγλυφες πλευρές και θέση για το QR επάνω.",
    "height": 0.065,
    "src": "/models/chonaki.8cacad8153dd.glb",
    "poster": "/media/poster-chonaki.9b6f93a48524.webp",
    "posterMobile": "/media/poster-chonaki-mobile.c7bf56a51b32.webp",
    "thumbnail": "/media/object-chonaki.060c6d24baaf.webp"
  }
});
export const TABLE_SRC="/models/cafe-table.2cbd4485102b.glb";
export const PARENT_ORIGINS=['https://mennoo.cfd','https://www.mennoo.cfd','https://mennoo.sbs','https://www.mennoo.sbs'];

export const TABLES=Object.freeze({
  "walnut": {
    "name": "Καρυδιά",
    "src": "/models/cafe-table.2cbd4485102b.glb"
  },
  "stone": {
    "name": "Ανοιχτή πέτρα",
    "src": "/models/cafe-stone.c7cca1c1341a.glb",
    "posters": {
      "boho": {
        "poster": "/media/poster-boho-stone-wide.834538090471.webp",
        "posterMobile": "/media/poster-boho-stone-mobile.9ec9ae261584.webp"
      },
      "mini-polygon": {
        "poster": "/media/poster-mini-polygon-stone-wide.3d31cdca80d4.webp",
        "posterMobile": "/media/poster-mini-polygon-stone-mobile.49d7f5308767.webp"
      },
      "mini-votsalo": {
        "poster": "/media/poster-mini-votsalo-stone-wide.361ca1244bd0.webp",
        "posterMobile": "/media/poster-mini-votsalo-stone-mobile.45655bac9b62.webp"
      },
      "chonaki": {
        "poster": "/media/poster-chonaki-stone-wide.03917b5e6fd5.webp",
        "posterMobile": "/media/poster-chonaki-stone-mobile.709bda00dd87.webp"
      }
    }
  }
});
export function previewFor(id,table='walnut'){return TABLES[table]?.posters?.[id]||MODELS[id];}
