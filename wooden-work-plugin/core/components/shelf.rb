# Wooden Work - Shelf Component
# Creates customizable shelf units

module WoodenWork
  module Components
    class Shelf
      def create(params = {})
        model = Sketchup.active_model
        model.start_operation('Create Shelf Unit', true)

        width = (params[:width] || 800).to_f / 1000.0
        depth = (params[:depth] || 300).to_f / 1000.0
        thickness = (params[:thickness] || 18).to_f / 1000.0
        count = params[:count] || 4
        spacing = (params[:spacing] || 300).to_f / 1000.0
        style = params[:style] || 'floating'
        material_name = params[:material] || 'oak'

        total_height = thickness + (spacing * (count - 1)) + thickness

        group = model.active_entities.add_group
        group.name = "Shelf Unit #{(width*1000).to_i}x#{(depth*1000).to_i}"
        entities = group.entities

        add_panel(entities, 0, 0, total_height - thickness, width, depth, thickness, 'Top Shelf')
        add_panel(entities, 0, 0, 0, width, depth, thickness, 'Bottom Shelf')

        (count - 2).times do |i|
          y_pos = thickness + (spacing * (i + 1))
          add_panel(entities, 0, 0, y_pos, width, depth, thickness, "Shelf #{i + 1}")
        end

        case style
        when 'bracket'
          (count - 1).times do |i|
            y_pos = thickness + (spacing * (i + 1))
            create_bracket(entities, 0.05, depth * 0.3, y_pos - 0.005, 'Left Bracket')
            create_bracket(entities, width - 0.05, depth * 0.3, y_pos - 0.005, 'Right Bracket')
          end
        when 'ledger'
          (count - 1).times do |i|
            y_pos = thickness + (spacing * (i + 1))
            add_panel(entities, 0.01, depth * 0.85, y_pos - 0.005, width - 0.02, 0.015, 0.003, "Ledger #{i + 1}")
          end
        end

        add_panel(entities, 0, 0, 0, 0.003, depth, total_height, 'Left Side')
        add_panel(entities, width - 0.003, 0, 0, 0.003, depth, total_height, 'Right Side')

        Materials::MaterialManager.apply_to_group(group, material_name)

        model.commit_operation
        group
      end

      private

      def add_panel(entities, x, y, z, w, d, h, name = '')
        pts = [
          [x, y, z],
          [x + w, y, z],
          [x + w, y, z + h],
          [x, y, z + h]
        ]
        face = entities.add_face(pts)
        face.pushpull(-d) if face
        face
      end

      def create_bracket(entities, x, y, z, name)
        bracket = entities.add_group
        bracket.name = name
        be = bracket.entities

        pts1 = [[0, 0, 0], [0.04, 0, 0], [0.04, 0, -0.003], [0, 0, -0.003]]
        face1 = be.add_face(pts1)
        face1.pushpull(-0.08) if face1

        pts2 = [[0, 0, 0], [0.003, 0, 0], [0.003, -0.06, 0], [0, -0.06, 0]]
        face2 = be.add_face(pts2)
        face2.pushpull(-0.08) if face2

        bracket.transform!(Geom::Transformation.new([x, y, z]))
      end
    end
  end
end
