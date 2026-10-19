# Wooden Work - Door Component
# Creates customizable cabinet and room doors

module WoodenWork
  module Components
    class Door
      def create(params = {})
        model = Sketchup.active_model
        model.start_operation('Create Door', true)

        width = (params[:width] || 400).to_f / 1000.0
        height = (params[:height] || 700).to_f / 1000.0
        thickness = (params[:thickness] || 18).to_f / 1000.0
        panel_style = params[:panel] || 'flat'
        handle = params[:handle] || 'bar'
        material_name = params[:material] || 'oak'

        group = model.active_entities.add_group
        group.name = "Door #{(width*1000).to_i}x#{(height*1000).to_i}"
        entities = group.entities

        add_panel(entities, 0, 0, 0, width, thickness, height, 'Door Panel')

        case panel_style
        when 'raised'
          create_raised_panel(entities, width, height, thickness)
        when 'shaker'
          create_shaker_panel(entities, width, height, thickness)
        when 'glass'
          create_glass_panel(entities, width, height, thickness)
        end

        create_handle(entities, width, height, handle)

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

      def create_raised_panel(entities, width, height, thickness)
        margin = 0.05
        frame_t = 0.06
        raise_height = 0.003

        add_panel(entities, margin, 0.002, height - margin - frame_t, width - margin * 2, thickness * 0.6, frame_t, 'Top Rail')
        add_panel(entities, margin, 0.002, margin, width - margin * 2, thickness * 0.6, frame_t, 'Bottom Rail')
        add_panel(entities, margin, 0.002, margin, frame_t, thickness * 0.6, height - margin * 2 - frame_t * 2, 'Left Stile')
        add_panel(entities, width - margin - frame_t, 0.002, margin, frame_t, thickness * 0.6, height - margin * 2 - frame_t * 2, 'Right Stile')

        panel_x = margin + frame_t + 0.01
        panel_w = width - (margin + frame_t) * 2 - 0.02
        panel_y = margin + frame_t + 0.01
        panel_h = height - (margin + frame_t) * 2 - 0.02
        add_panel(entities, panel_x, 0.002 + thickness * 0.3, panel_y, panel_w, thickness * 0.3 + raise_height, panel_h, 'Raised Panel')
      end

      def create_shaker_panel(entities, width, height, thickness)
        margin = 0.04
        frame_t = 0.06

        add_panel(entities, margin, 0.001, height - margin - frame_t, width - margin * 2, thickness * 0.5, frame_t, 'Top Rail')
        add_panel(entities, margin, 0.001, margin, width - margin * 2, thickness * 0.5, frame_t, 'Bottom Rail')
        add_panel(entities, margin, 0.001, margin, frame_t, thickness * 0.5, height - margin * 2 - frame_t * 2, 'Left Stile')
        add_panel(entities, width - margin - frame_t, 0.001, margin, frame_t, thickness * 0.5, height - margin * 2 - frame_t * 2, 'Right Stile')

        panel_x = margin + frame_t
        panel_w = width - (margin + frame_t) * 2
        panel_y = margin + frame_t
        panel_h = height - (margin + frame_t) * 2
        add_panel(entities, panel_x, 0.001 + thickness * 0.25, panel_y, panel_w, thickness * 0.25, panel_h, 'Flat Panel')
      end

      def create_glass_panel(entities, width, height, thickness)
        margin = 0.04
        frame_t = 0.05

        add_panel(entities, margin, 0, height - margin - frame_t, width - margin * 2, thickness, frame_t, 'Top Rail')
        add_panel(entities, margin, 0, margin, width - margin * 2, thickness, frame_t, 'Bottom Rail')
        add_panel(entities, margin, 0, margin, frame_t, thickness, height - margin * 2 - frame_t * 2, 'Left Stile')
        add_panel(entities, width - margin - frame_t, 0, margin, frame_t, thickness, height - margin * 2 - frame_t * 2, 'Right Stile')

        panel_x = margin + frame_t
        panel_w = width - (margin + frame_t) * 2
        panel_y = margin + frame_t
        panel_h = height - (margin + frame_t) * 2
        glass = entities.add_face([
          [panel_x, thickness * 0.4, panel_y],
          [panel_x + panel_w, thickness * 0.4, panel_y],
          [panel_x + panel_w, thickness * 0.4, panel_y + panel_h],
          [panel_x, thickness * 0.4, panel_y + panel_h]
        ])
        glass.pushpull(-thickness * 0.1) if glass

        model = Sketchup.active_model
        mat = model.materials['Glass'] || model.materials.add('Glass')
        mat.color = [200, 220, 240]
        mat.alpha = 0.3
        glass.material = mat if glass
      end

      def create_handle(entities, width, height, type)
        case type
        when 'bar'
          start_pt = Geom::Point3d.new(width * 0.85, -0.04, height * 0.4)
          end_pt = Geom::Point3d.new(width * 0.85, -0.04, height * 0.6)
          GeometryHelper.create_cylinder(entities, start_pt, end_pt, 4.0 / 1000.0, 12)
        when 'knob'
          center = Geom::Point3d.new(width * 0.85, -0.04, height * 0.5)
          GeometryHelper.create_sphere(entities, center, 8.0 / 1000.0, 12)
        when 'recessed'
          corner = Geom::Point3d.new(width * 0.8, -0.02, height * 0.35)
          GeometryHelper.create_box(entities, corner, width * 0.12, 0.015, height * 0.3)
        end
      end
    end
  end
end
