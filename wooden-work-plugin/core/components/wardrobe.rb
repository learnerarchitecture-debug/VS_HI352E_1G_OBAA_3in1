# Wooden Work - Wardrobe Component
# Creates customizable 3D wardrobe geometry

module WoodenWork
  module Components
    class Wardrobe
      def create(params = {})
        model = Sketchup.active_model
        model.start_operation('Create Wardrobe', true)

        width = (params[:width] || 1200).to_f / 1000.0
        height = (params[:height] || 2400).to_f / 1000.0
        depth = (params[:depth] || 600).to_f / 1000.0
        shelves = params[:shelves] || 3
        rods = params[:rods] || 1
        drawers = params[:drawers] || 0
        door_style = params[:doors] || 'hinged'
        material_name = params[:material] || 'oak'

        thickness = 18.0 / 1000.0

        group = model.active_entities.add_group
        group.name = "Wardrobe #{(width*1000).to_i}x#{(height*1000).to_i}x#{(depth*1000).to_i}"
        entities = group.entities

        add_panel(entities, 0, 0, 0, thickness, depth, height, 'Left Side')
        add_panel(entities, width - thickness, 0, 0, thickness, depth, height, 'Right Side')
        add_panel(entities, 0, 0, height - thickness, width, depth, thickness, 'Top')
        add_panel(entities, 0, 0, 0, width, depth, thickness, 'Bottom')
        add_panel(entities, thickness, thickness * 0.5, thickness, width - thickness * 2, depth - thickness, 4.0 / 1000.0, 'Back Panel')

        if shelves > 0
          shelf_spacing = (height - thickness * 2) / (shelves + 1)
          shelves.times do |i|
            y_pos = thickness + shelf_spacing * (i + 1)
            add_panel(entities, thickness, thickness, y_pos, width - thickness * 2, depth - thickness, thickness, "Shelf #{i + 1}")
          end
        end

        if rods > 0
          rod_spacing = (height - thickness * 2) / (rods + 1)
          rods.times do |i|
            rod_y = thickness + rod_spacing * (i + 1)
            start_pt = Geom::Point3d.new(thickness * 2, depth * 0.3, rod_y)
            end_pt = Geom::Point3d.new(thickness * 2, depth * 0.7, rod_y)
            GeometryHelper.create_cylinder(entities, start_pt, end_pt, 3.0 / 1000.0, 12)
          end
        end

        if drawers > 0
          drawer_height_each = (height * 0.3) / drawers
          drawers.times do |i|
            drawer_y = thickness + (drawer_height_each * i)
            create_drawer_box(entities, thickness, thickness, drawer_y, width - thickness * 2, depth - thickness * 2, drawer_height_each - thickness * 0.5, "Drawer #{i + 1}")
          end
        end

        create_doors(entities, params, width, height, depth, thickness, door_style)

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

      def create_drawer_box(entities, x, y, z, w, d, h, name = '')
        thickness = 6.0 / 1000.0
        add_panel(entities, x, y, z, w, thickness, d, "#{name} Bottom")
        add_panel(entities, x, y, z + thickness, thickness, d, h - thickness, "#{name} Left")
        add_panel(entities, x + w - thickness, y, z + thickness, thickness, d, h - thickness, "#{name} Right")
        add_panel(entities, x, y, z + thickness, w, thickness, h - thickness, "#{name} Front")
        add_panel(entities, x, y + d - thickness, z + thickness, w, thickness, h - thickness, "#{name} Back")
      end

      def create_doors(entities, params, width, height, depth, thickness, style)
        case style
        when 'hinged'
          door_width = (width - thickness * 2) / 2
          create_single_door(entities, thickness, -0.02, thickness, door_width, height - thickness * 2, 'Left Door')
          create_single_door(entities, width / 2, -0.02, thickness, door_width, height - thickness * 2, 'Right Door')
        when 'sliding'
          door_width = width * 0.52
          create_sliding_door(entities, -door_width * 0.02, -0.04, 0, door_width, height, 'Sliding Door 1')
          create_sliding_door(entities, width * 0.5, -0.04, 0, door_width, height, 'Sliding Door 2')
        when 'bifold'
          panel_width = (width - thickness * 2) / 4
          4.times do |i|
            x = thickness + (panel_width * i)
            create_bifold_panel(entities, x, -0.02, thickness, panel_width, height - thickness * 2, "Bi-Fold Panel #{i + 1}")
          end
        end
      end

      def create_single_door(entities, x, y, z, w, h, name)
        door_group = entities.add_group
        door_group.name = name
        de = door_group.entities

        add_panel(de, 0, 0, 0, w, 2.0 / 1000.0, h, 'Door Face')

        frame_t = 10.0 / 1000.0
        add_panel(de, 0, 0, 0, w, frame_t, frame_t, 'Bottom Frame')
        add_panel(de, 0, 0, h - frame_t, w, frame_t, frame_t, 'Top Frame')
        add_panel(de, 0, 0, 0, frame_t, frame_t, h, 'Left Frame')
        add_panel(de, w - frame_t, 0, 0, frame_t, frame_t, h, 'Right Frame')

        start_pt = Geom::Point3d.new(w * 0.85, -0.03, h * 0.45)
        end_pt = Geom::Point3d.new(w * 0.85, -0.03, h * 0.55)
        GeometryHelper.create_cylinder(de, start_pt, end_pt, 4.0 / 1000.0, 12)

        door_group
      end

      def create_sliding_door(entities, x, y, z, w, h, d, name)
        door_group = entities.add_group
        door_group.name = name
        de = door_group.entities

        add_panel(de, 0, 0, 0, w, 12.0 / 1000.0, h, 'Door Panel')

        start_pt = Geom::Point3d.new(0, h * 0.02, h * 0.01)
        end_pt = Geom::Point3d.new(w, h * 0.02, h * 0.01)
        GeometryHelper.create_cylinder(de, start_pt, end_pt, 3.0 / 1000.0, 12)

        door_group
      end

      def create_bifold_panel(entities, x, y, z, w, h, d, name)
        panel_group = entities.add_group
        panel_group.name = name
        pe = panel_group.entities

        add_panel(pe, 0, 0, 0, w, 10.0 / 1000.0, h, 'Panel')
        panel_group
      end
    end
  end
end
