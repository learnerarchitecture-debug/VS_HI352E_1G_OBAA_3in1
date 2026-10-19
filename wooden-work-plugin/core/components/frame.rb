# Wooden Work - Frame Component
# Creates door frames and cabinet face frames

module WoodenWork
  module Components
    class Frame
      def self.create(params = {})
        model = Sketchup.active_model
        model.start_operation('Create Frame', true)

        width = (params[:width] || 600).to_f / 1000.0
        height = (params[:height] || 2000).to_f / 1000.0
        thickness = (params[:thickness] || 35).to_f / 1000.0
        depth = (params[:depth] || 100).to_f / 1000.0
        material_name = params[:material] || 'oak'

        group = model.active_entities.add_group
        group.name = "Frame #{(width*1000).to_i}x#{(height*1000).to_i}"
        entities = group.entities

        add_panel(entities, 0, 0, 0, thickness, depth, height, 'Left Jamb')
        add_panel(entities, width - thickness, 0, 0, thickness, depth, height, 'Right Jamb')
        add_panel(entities, 0, 0, height - thickness, width, depth, thickness, 'Top Header')
        add_panel(entities, 0, 0, 0, width, depth, thickness * 0.5, 'Threshold')

        Materials::MaterialManager.apply_to_group(group, material_name)

        model.commit_operation
        group
      end

      def self.add_hardware_to_selection
        model = Sketchup.active_model
        selection = model.selection

        if selection.empty?
          UI.messagebox('Please select a door or drawer first.')
          return
        end

        model.start_operation('Add Hardware', true)

        selection.each do |entity|
          if entity.is_a?(Sketchup::Group)
            add_hinges(entity)
            add_handle(entity)
          end
        end

        model.commit_operation
      end

      private

      def self.add_panel(entities, x, y, z, w, d, h, name = '')
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

      def self.add_hinges(group)
        entities = group.entities
        bounds = group.bounds
        height = bounds.height

        hinge_positions = [height * 0.15, height * 0.85]

        hinge_positions.each do |pos|
          center = Geom::Point3d.new(0, -0.02, pos)
          GeometryHelper.create_sphere(entities, center, 5.0 / 1000.0, 8)
        end
      end

      def self.add_handle(group)
        entities = group.entities
        bounds = group.bounds
        width = bounds.width
        height = bounds.height

        start_pt = Geom::Point3d.new(width * 0.85, -0.04, height * 0.5)
        end_pt = Geom::Point3d.new(width * 0.85, -0.04, height * 0.6)
        GeometryHelper.create_cylinder(entities, start_pt, end_pt, 4.0 / 1000.0, 12)
      end
    end
  end
end
