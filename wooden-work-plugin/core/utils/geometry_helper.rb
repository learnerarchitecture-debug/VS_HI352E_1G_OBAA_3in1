# Wooden Work - Geometry Helpers
# Creates basic geometry using SketchUp API

module WoodenWork
  module GeometryHelper
    def self.create_cylinder(entities, start_pt, end_pt, radius, segments = 12)
      group = entities.add_group
      ge = group.entities

      len = start_pt.distance(end_pt)

      center = Geom::Point3d.new(0, 0, 0)
      normal = Geom::Vector3d.new(0, 0, 1)

      pts = []
      segments.times do |i|
        angle = (2.0 * Math::PI * i) / segments
        x = Math.cos(angle) * radius
        y = Math.sin(angle) * radius
        pts << Geom::Point3d.new(x, y, 0)
      end

      face = ge.add_face(pts)
      face.pushpull(len) if face

      vec = Geom::Vector3d.new(end_pt.x - start_pt.x, end_pt.y - start_pt.y, end_pt.z - start_pt.z)
      unless vec.length == 0
        angle = vec.angle_between(Geom::Vector3d.new(0, 0, 1))
        if angle > 0.001 && (angle - Math::PI).abs > 0.001
          axis = Geom::Vector3d.new(0, 0, 1).cross(vec)
          if axis.length > 0.001
            rot = Geom::Transformation.rotation(Geom::Point3d.new(0,0,0), axis.normalize, angle)
            group.entities.transform_entities(rot, ge.to_a)
          end
        elsif (angle - Math::PI).abs <= 0.001
          rot = Geom::Transformation.rotation(Geom::Point3d.new(0,0,0), Geom::Vector3d.new(1,0,0), Math::PI)
          group.entities.transform_entities(rot, ge.to_a)
        end
      end

      group.transform!(Geom::Transformation.new(start_pt))
      group
    end

    def self.create_sphere(entities, center, radius, segments = 8)
      group = entities.add_group
      ge = group.entities

      equator_pts = []
      segments.times do |i|
        angle = (2.0 * Math::PI * i) / segments
        x = Math.cos(angle) * radius
        y = Math.sin(angle) * radius
        equator_pts << Geom::Point3d.new(x, y, 0)
      end
      equator_face = ge.add_face(equator_pts)
      equator_face.pushpull(radius * 0.3) if equator_face

      equator_face2 = ge.add_face(equator_pts)
      equator_face2.pushpull(-radius * 0.3) if equator_face2

      top_pts = []
      (segments / 2 + 1).times do |i|
        angle = (2.0 * Math::PI * i) / segments
        r = radius * 0.7
        x = Math.cos(angle) * r
        y = Math.sin(angle) * r
        top_pts << Geom::Point3d.new(x, y, radius * 0.5)
      end
      top_face = ge.add_face(top_pts) if top_pts.length >= 3

      group.transform!(Geom::Transformation.new(center))
      group
    end

    def self.create_box(entities, corner, width, depth, height)
      group = entities.add_group
      ge = group.entities

      pts = [
        Geom::Point3d.new(0, 0, 0),
        Geom::Point3d.new(width, 0, 0),
        Geom::Point3d.new(width, depth, 0),
        Geom::Point3d.new(0, depth, 0)
      ]

      face = ge.add_face(pts)
      face.pushpull(height) if face

      group.transform!(Geom::Transformation.new(corner))
      group
    end
  end
end
