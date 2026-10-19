# Wooden Work - Wood Textures Library
# Defines wood material properties and colors

module WoodenWork
  module Materials
    class WoodTextures
      TEXTURES = {
        oak: {
          name: 'Oak Wood',
          color: [212, 165, 116],
          grain_color: [180, 140, 95],
          roughness: 0.7,
          grain_scale: 1.0
        },
        walnut: {
          name: 'Walnut Wood',
          color: [92, 64, 51],
          grain_color: [62, 39, 35],
          roughness: 0.6,
          grain_scale: 0.8
        },
        cherry: {
          name: 'Cherry Wood',
          color: [139, 69, 19],
          grain_color: [160, 82, 45],
          roughness: 0.5,
          grain_scale: 1.2
        },
        maple: {
          name: 'Maple Wood',
          color: [232, 212, 184],
          grain_color: [212, 196, 168],
          roughness: 0.4,
          grain_scale: 0.9
        },
        pine: {
          name: 'Pine Wood',
          color: [232, 199, 124],
          grain_color: [212, 179, 108],
          roughness: 0.8,
          grain_scale: 1.5
        },
        teak: {
          name: 'Teak Wood',
          color: [155, 123, 76],
          grain_color: [125, 99, 64],
          roughness: 0.6,
          grain_scale: 1.1
        },
        ebony: {
          name: 'Ebony Wood',
          color: [44, 27, 14],
          grain_color: [26, 16, 8],
          roughness: 0.3,
          grain_scale: 0.7
        },
        ash: {
          name: 'Ash Wood',
          color: [200, 184, 154],
          grain_color: [184, 168, 138],
          roughness: 0.65,
          grain_scale: 1.3
        }
      }.freeze

      LAMINATES = {
        white_lam: { name: 'White Laminate', color: [245, 245, 245], roughness: 0.2 },
        grey_lam: { name: 'Grey Laminate', color: [128, 128, 128], roughness: 0.25 },
        black_lam: { name: 'Black Laminate', color: [44, 44, 44], roughness: 0.3 },
        beige_lam: { name: 'Beige Laminate', color: [212, 196, 168], roughness: 0.2 }
      }.freeze

      FINISHES = {
        matte: { specular: 10, glossiness: 10 },
        satin: { specular: 30, glossiness: 30 },
        'semi-gloss': { specular: 60, glossiness: 50 },
        glossy: { specular: 90, glossiness: 80 }
      }.freeze

      def self.get_texture(name)
        TEXTURES[name.to_sym] || LAMINATES[name.to_sym]
      end

      def self.get_all_names
        (TEXTURES.keys + LAMINATES.keys).map(&:to_s)
      end
    end
  end
end
