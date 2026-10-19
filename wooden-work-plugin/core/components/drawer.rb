# Wooden Work - Drawer Component
# Creates customizable 3D drawer units

module WoodenWork
  module Components
    class Drawer
      def create(params = {})
        model = Sketchup.active_model
        model.start_operation('Create Drawer Unit', true)

        width = (params[:width] || 600).to_f / 1000.0
        height = (params[:height] || 800).to_f / 1000.0
        depth = (params[:depth] || 500).to_f / 1000.0
        count = params[:count] || 3
        each_height = (params[:eachHeight] || 200).to_f / 1000.0
        handle = params[:handle] || 'bar'
        slide_type = params[:slide] || 'full'
        material_name = params[:material] || 'oak'

        thickness = 18.0 / 1000.0
        drawer_thickness = 12.0 / 1000.0

        group = model.active_entities.add_group
        group.name = "Drawer Unit #{(width*1000).to_i}x#{(height*1000).to_i}"
        entities = group.entities

        add_panel(entities, 0, 0, 0, thickness, depth, height, 'Left Side')
        add_panel(entities, width - thickness, 0, 0, thickness, depth, height, 'Right Side')
        add_panel(entities, 0, 0, height - thickness, width, depth, thickness, 'Top')
        add_panel(entities, 0, 0, 0, width, depth, thickness, 'Bottom')
        add_panel(entities, thickness, thickness * 0.5, thickness, width - thickness * 2, depth - thickness, 4.0 / 1000.0, 'Back')

        gap = 3.0 / 1000.0
        drawer_space = (height - thickness * 2) / count

        count.times do |i|
          dy = thickness + (drawer_space * i) + gap
          drawer_h = drawer_space - gap * 2

          drawer_group = entities.add_group
          drawer_group.name = "Drawer #{i + 1}"
          de = drawer_group.entities

          add_panel(de, thickness, 0, 0, width - thickness * 2, drawer_thickness, drawer_h, 'Bottom')
          add_panel(de, thickness, 0, 0, drawer_thickness, depth - thickness, drawer_h, 'Left Side')
          add_panel(de, width - thickness * 2, 0, 0, drawer_thickness, depth - thickness, drawer_h, 'Right Side')
          add_panel(de, thickness, depth - thickness - drawer_thickness, 0, width - thickness * 2, drawer_thickness, drawer_h, 'Back')
          add_panel(de, 0, -0.02, 0, width, thickness, drawer_h, 'Front')

          create_handle(de, width, drawer_h, handle)
          create_slides(de, width, depth, drawer_h, slide_type)

          drawer_group.transform!(Geom::Transformation.new([0, 0, dy]))
        end

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

      def create_handle(entities, width, height, type)
        case type
        when 'bar'
          start_pt = Geom::Point3d.new(width * 0.35, -0.05, height * 0.5)
          end_pt = Geom::Point3d.new(width * 0.65, -0.05, height * 0.5)
          GeometryHelper.create_cylinder(entities, start_pt, end_pt, 4.0 / 1000.0, 12)
        when 'knob'
          center = Geom::Point3d.new(width * 0.5, -0.05, height * 0.5)
          GeometryHelper.create_sphere(entities, center, 8.0 / 1000.0, 12)
        when 'recessed'
          corner = Geom::Point3d.new(width * 0.4, -0.04, height * 0.3)
          GeometryHelper.create_box(entities, corner, width * 0.2, 0.02, height * 0.4)
        end
      end

      def create_slides(entities, width, depth, height, type)
        case type
        when 'full'
          add_panel(entities, 0.01, 0, height * 0.15, 0.003, depth * 0.85, 0.008, 'Left Slide')
          add_panel(entities, width - 0.013, 0, height * 0.15, 0.003, depth * 0.85, 0.008, 'Right Slide')
        when 'partial'
          add_panel(entities, 0.01, 0, height * 0.15, 0.003, depth * 0.65, 0.008, 'Left Slide')
          add_panel(entities, width - 0.013, 0, height * 0.15, 0.003, depth * 0.65, 0.008, 'Right Slide')
        when 'undermount'
          add_panel(entities, 0.02, 0, 0.002, 0.015, depth * 0.8, 0.005, 'Left Undermount')
          add_panel(entities, width - 0.035, 0, 0.002, 0.015, depth * 0.8, 0.005, 'Right Undermount')
        end
      end
    end
  end
end
